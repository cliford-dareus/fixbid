/**
 * GET  /functions/v1/public-quote?id=<quote_uuid>
 * POST /functions/v1/public-quote  { quote_id, action: "decline" }
 *
 * Public read of a quote for the Vercel client page.
 * Uses service role; does not depend on optional columns that may be missing.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { notifyHandymanPush } from "../_shared/expo-push.ts";

/** Columns that match the app's create/list path (lib/data/quotes.ts). */
const QUOTE_CORE =
  "id, client_id, client_name, client_phone, job_name, notes, total_amount, status, created_at, photos, handyman_id";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = serviceClient();

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const quoteId = body.quote_id as string | undefined;
      const action = (body.action as string | undefined)?.toLowerCase();

      if (!quoteId || action !== "decline") {
        return jsonResponse({ error: "quote_id and action=decline required" }, 400);
      }

      const { data: quote, error } = await supabase
        .from("quotes")
        .select("id, status, client_name, job_name, handyman_id, total_amount")
        .eq("id", quoteId)
        .maybeSingle();

      if (error) {
        console.error("public-quote decline select", error);
        return jsonResponse({ error: "Quote not found", detail: error.message }, 404);
      }
      if (!quote) {
        return jsonResponse({ error: "Quote not found" }, 404);
      }

      const status = (quote.status || "").toLowerCase();
      if (["accepted", "approved", "deposit_paid", "paid"].includes(status)) {
        return jsonResponse({ error: "Cannot decline a paid quote" }, 409);
      }

      const { error: upErr } = await supabase
        .from("quotes")
        .update({ status: "declined" })
        .eq("id", quoteId);

      if (upErr) throw upErr;

      const client = quote.client_name || "A client";
      const job = quote.job_name || "quote";
      await notifyHandymanPush(
        supabase,
        quote.handyman_id,
        "Quote declined",
        `${client} declined “${job}”.`,
        { quoteId, type: "declined", status: "declined" },
      );

      return jsonResponse({ success: true, status: "declined" });
    }

    if (req.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || "").trim();
    if (!id) {
      return jsonResponse({ success: false, error: "id required" }, 400);
    }

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select(QUOTE_CORE)
      .eq("id", id)
      .maybeSingle();

    if (quoteError) {
      console.error("public-quote select", quoteError);
      return jsonResponse(
        {
          success: false,
          error: "Quote not found",
          detail: quoteError.message,
        },
        404,
      );
    }

    if (!quote) {
      return jsonResponse({ success: false, error: "Quote not found" }, 404);
    }

    let line_items: Array<Record<string, unknown>> = [];
    const { data: items, error: itemsError } = await supabase
      .from("quote_line_items")
      .select("id, description, quantity, unit_price, is_labor, photo_url")
      .eq("quote_id", id)
      .order("id", { ascending: true });

    if (itemsError) {
      console.warn("public-quote line_items", itemsError.message);
    } else {
      line_items = items ?? [];
    }

    let handyman: Record<string, unknown> = {};
    if (quote.handyman_id) {
      handyman = await loadHandyman(supabase, quote.handyman_id as string);
    }

    return jsonResponse({
      success: true,
      quote: {
        id: quote.id,
        client_name: quote.client_name,
        client_phone: quote.client_phone,
        client_email: null,
        job_name: quote.job_name,
        notes: quote.notes,
        total_amount: quote.total_amount,
        status: quote.status,
        created_at: quote.created_at,
        handyman_id: quote.handyman_id,
        photos: quote.photos ?? [],
        project_address: null,
        line_items,
      },
      handyman,
    });
  } catch (err) {
    console.error("public-quote", err);
    return jsonResponse(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error",
      },
      500,
    );
  }
});

// deno-lint-ignore no-explicit-any
async function loadHandyman(supabase: any, handymanId: string) {
  const full =
    "full_name, business_name, phone, email, address, city, state, zip, logo_url, tagline, license_number, website";
  const core = "full_name, business_name, phone, email, address, logo_url";

  let profile: Record<string, unknown> | null = null;

  const attempt = await supabase
    .from("profiles")
    .select(full)
    .eq("id", handymanId)
    .maybeSingle();

  if (!attempt.error && attempt.data) {
    profile = attempt.data;
  } else {
    if (attempt.error) {
      console.warn("public-quote profile full select", attempt.error.message);
    }
    const fallback = await supabase
      .from("profiles")
      .select(core)
      .eq("id", handymanId)
      .maybeSingle();
    if (!fallback.error && fallback.data) {
      profile = fallback.data;
    } else if (fallback.error) {
      console.warn("public-quote profile core select", fallback.error.message);
    }
  }

  if (!profile) return {};

  const locationParts = [
    profile.address,
    [profile.city, profile.state].filter(Boolean).join(", "),
    profile.zip,
  ].filter((p) => p && String(p).trim());

  return {
    full_name: profile.full_name ?? "",
    business_name: profile.business_name ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    address: profile.address ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    zip: profile.zip ?? "",
    location: locationParts.join(" · "),
    logo_url: profile.logo_url ?? null,
    tagline: profile.tagline ?? "",
    license_number: profile.license_number ?? "",
    website: profile.website ?? "",
  };
}
