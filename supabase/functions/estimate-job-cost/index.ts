/**
 * POST /functions/v1/estimate-job-cost
 * Auth: user JWT required (handyman session).
 *
 * Body: {
 *   description?: string,
 *   photo_urls?: string[],
 *   hourly_rate?: number,
 *   region?: string,
 *   provider?: "xai" | "gemini" | "auto"  // optional override
 * }
 *
 * Env (at least one of):
 *   XAI_API_KEY
 *   GEMINI_API_KEY
 *
 * Optional:
 *   ESTIMATE_PROVIDER = xai | gemini | auto  (default: auto)
 *   XAI_MODEL (default grok-4.1-fast)
 *   GEMINI_MODEL (default gemini-2.0-flash)
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SYSTEM = `You are FixBid's estimating assistant for US residential handymen and small contractors.
Given a job description and optional job-site photos, produce a realistic line-item estimate.

Rules:
- Prefer practical residential handyman work (drywall, plumbing, electrical basic, painting, carpentry, doors, flooring, hurricane prep).
- Prices in USD for a typical US market (assume Southeast / Florida-ish unless region says otherwise).
- Separate labor vs materials. Labor unit_price is the labor line total for that item OR rate×hours as one line.
- Include a single primary labor line with hours implied in description when possible.
- Round money to 2 decimals. Be conservative (slightly high) rather than underbidding.
- If photos are unclear, still estimate from description and set confidence lower.
- Respond with ONLY valid JSON matching the schema. No markdown fences.

JSON schema:
{
  "job_name": string,
  "category": string,
  "summary": string,
  "confidence": number,
  "labor_hours": number,
  "labor_rate": number,
  "line_items": [
    { "description": string, "quantity": number, "unit_price": number, "is_labor": boolean }
  ],
  "notes": string,
  "upsells": string[]
}`;

type Provider = "xai" | "gemini";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const xaiKey = Deno.env.get("XAI_API_KEY") || "";
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    if (!xaiKey && !geminiKey) {
      return jsonResponse(
        { error: "AI estimates not configured (set XAI_API_KEY and/or GEMINI_API_KEY)" },
        503,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const description = String(body.description || "").trim();
    const photoUrls = Array.isArray(body.photo_urls)
      ? (body.photo_urls as string[])
        .filter((u) => typeof u === "string" && u.startsWith("http"))
        .slice(0, 4)
      : [];
    const hourlyRate = Number(body.hourly_rate) > 0 ? Number(body.hourly_rate) : null;
    const region = String(body.region || "").trim();

    if (!description && photoUrls.length === 0) {
      return jsonResponse({ error: "description or photo_urls required" }, 400);
    }

    const userText = [
      description ? `Job description: ${description}` : "No text description provided — rely on photos.",
      hourlyRate ? `Handyman preferred labor rate: $${hourlyRate}/hr` : null,
      region ? `Region: ${region}` : null,
      "Return JSON only.",
    ]
      .filter(Boolean)
      .join("\n");

    const order = resolveProviderOrder(
      String(body.provider || Deno.env.get("ESTIMATE_PROVIDER") || "auto"),
      Boolean(xaiKey),
      Boolean(geminiKey),
    );

    if (order.length === 0) {
      return jsonResponse({ error: "No AI provider available for requested mode" }, 503);
    }

    let lastError = "";
    for (const provider of order) {
      try {
        const rawText =
          provider === "xai"
            ? await callXai(xaiKey, userText, photoUrls)
            : await callGemini(geminiKey, userText, photoUrls);

        const parsed = extractJson(rawText);
        const lineItems = normalizeLineItems(parsed.line_items);
        if (lineItems.length === 0) {
          lastError = `${provider}: no line items`;
          continue;
        }

        const total = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
        const suggested = Math.ceil(total / 5) * 5;

        return jsonResponse({
          success: true,
          provider,
          estimate: {
            job_name: String(parsed.job_name || description || "Service job").slice(0, 120),
            category: String(parsed.category || "General").slice(0, 60),
            summary: String(parsed.summary || "").slice(0, 500),
            confidence: clamp01(Number(parsed.confidence)),
            labor_hours: Number(parsed.labor_hours) || 0,
            labor_rate: Number(parsed.labor_rate) || hourlyRate || 0,
            line_items: lineItems,
            total: Math.round(total * 100) / 100,
            suggested,
            notes: String(parsed.notes || "").slice(0, 1000),
            upsells: Array.isArray(parsed.upsells)
              ? (parsed.upsells as string[]).map(String).slice(0, 8)
              : [],
          },
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        console.error(`estimate provider ${provider} failed`, lastError);
      }
    }

    return jsonResponse(
      { error: "All AI providers failed", detail: lastError.slice(0, 400) },
      502,
    );
  } catch (err) {
    console.error("estimate-job-cost", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Estimate failed" },
      500,
    );
  }
});

function resolveProviderOrder(
  mode: string,
  hasXai: boolean,
  hasGemini: boolean,
): Provider[] {
  const m = mode.toLowerCase();
  if (m === "xai") return hasXai ? ["xai"] : [];
  if (m === "gemini") return hasGemini ? ["gemini"] : [];
  // auto: prefer Gemini for vision cost, then xAI; or whatever is configured
  const order: Provider[] = [];
  if (hasGemini) order.push("gemini");
  if (hasXai) order.push("xai");
  return order;
}

async function callXai(
  apiKey: string,
  userText: string,
  photoUrls: string[],
): Promise<string> {
  const model = Deno.env.get("XAI_MODEL") || "grok-4.1-fast";
  // deno-lint-ignore no-explicit-any
  const content: any[] = [{ type: "text", text: userText }];
  for (const url of photoUrls) {
    content.push({
      type: "image_url",
      image_url: { url, detail: "high" },
    });
  }

  const aiRes = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content },
      ],
    }),
  });

  const aiText = await aiRes.text();
  if (!aiRes.ok) {
    throw new Error(`xAI ${aiRes.status}: ${aiText.slice(0, 300)}`);
  }

  const envelope = JSON.parse(aiText);
  const raw =
    envelope.choices?.[0]?.message?.content ??
    envelope.choices?.[0]?.message?.reasoning_content ??
    "";
  return String(raw);
}

async function callGemini(
  apiKey: string,
  userText: string,
  photoUrls: string[],
): Promise<string> {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";

  // deno-lint-ignore no-explicit-any
  const parts: any[] = [{ text: `${SYSTEM}\n\n---\n\n${userText}` }];

  for (const url of photoUrls) {
    try {
      const img = await fetchImageAsInline(url);
      if (img) parts.push({ inline_data: img });
    } catch (e) {
      console.warn("gemini image fetch failed", url, e);
    }
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const aiRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    }),
  });

  const aiText = await aiRes.text();
  if (!aiRes.ok) {
    throw new Error(`Gemini ${aiRes.status}: ${aiText.slice(0, 300)}`);
  }

  const envelope = JSON.parse(aiText);
  const raw =
    envelope.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("") ?? "";
  return String(raw);
}

async function fetchImageAsInline(
  imageUrl: string,
): Promise<{ mime_type: string; data: string } | null> {
  const res = await fetch(imageUrl);
  if (!res.ok) return null;
  const ctype = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  if (!ctype.startsWith("image/")) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  // Cap ~4MB base64 payload
  if (buf.byteLength > 4_000_000) return null;
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return { mime_type: ctype, data: btoa(binary) };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function extractJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("no json object");
  }
}

function normalizeLineItems(
  // deno-lint-ignore no-explicit-any
  raw: any,
): Array<{ description: string; quantity: number; unit_price: number; is_labor: boolean }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      description: String(row.description || row.name || "Item").slice(0, 200),
      quantity: Math.max(0.01, Number(row.quantity) || 1),
      unit_price: Math.max(
        0,
        Math.round((Number(row.unit_price ?? row.unitPrice) || 0) * 100) / 100,
      ),
      is_labor: Boolean(row.is_labor ?? row.isLabor),
    }))
    .filter((li) => li.description);
}
