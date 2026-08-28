/**
 * POST /functions/v1/estimate-job-cost
 * Auth: user JWT required (handyman session).
 *
 * Body: {
 *   description?: string,
 *   photo_urls?: string[],
 *   hourly_rate?: number,
 *   region?: string
 * }
 *
 * Env: XAI_API_KEY (required)
 * Optional: XAI_MODEL (default grok-4.1-fast)
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
  "confidence": number,  // 0-1
  "labor_hours": number,
  "labor_rate": number,
  "line_items": [
    { "description": string, "quantity": number, "unit_price": number, "is_labor": boolean }
  ],
  "notes": string,
  "upsells": string[]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const xaiKey = Deno.env.get("XAI_API_KEY");
    if (!xaiKey) {
      return jsonResponse({ error: "AI estimates not configured (missing XAI_API_KEY)" }, 503);
    }

    // Require authenticated user
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
      ? (body.photo_urls as string[]).filter((u) => typeof u === "string" && u.startsWith("http")).slice(0, 4)
      : [];
    const hourlyRate = Number(body.hourly_rate) > 0 ? Number(body.hourly_rate) : null;
    const region = String(body.region || "").trim();

    if (!description && photoUrls.length === 0) {
      return jsonResponse({ error: "description or photo_urls required" }, 400);
    }

    const model = Deno.env.get("XAI_MODEL") || "grok-4.1-fast";

    const userText = [
      description ? `Job description: ${description}` : "No text description provided — rely on photos.",
      hourlyRate ? `Handyman preferred labor rate: $${hourlyRate}/hr` : null,
      region ? `Region: ${region}` : null,
      "Return JSON only.",
    ]
      .filter(Boolean)
      .join("\n");

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
        Authorization: `Bearer ${xaiKey}`,
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
      console.error("xAI error", aiRes.status, aiText.slice(0, 500));
      return jsonResponse(
        { error: "AI request failed", detail: aiText.slice(0, 300) },
        502,
      );
    }

    let parsed: Record<string, unknown>;
    try {
      const envelope = JSON.parse(aiText);
      const raw =
        envelope.choices?.[0]?.message?.content ??
        envelope.choices?.[0]?.message?.reasoning_content ??
        "";
      parsed = extractJson(String(raw));
    } catch (e) {
      console.error("parse AI json", e, aiText.slice(0, 400));
      return jsonResponse({ error: "Could not parse AI estimate" }, 502);
    }

    const lineItems = normalizeLineItems(parsed.line_items);
    if (lineItems.length === 0) {
      return jsonResponse({ error: "AI returned no line items" }, 502);
    }

    const total = lineItems.reduce(
      (s, li) => s + li.quantity * li.unit_price,
      0,
    );
    const suggested = Math.ceil(total / 5) * 5;

    return jsonResponse({
      success: true,
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
  } catch (err) {
    console.error("estimate-job-cost", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Estimate failed" },
      500,
    );
  }
});

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
      unit_price: Math.max(0, Math.round((Number(row.unit_price ?? row.unitPrice) || 0) * 100) / 100),
      is_labor: Boolean(row.is_labor ?? row.isLabor),
    }))
    .filter((li) => li.description);
}
