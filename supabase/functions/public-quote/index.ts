/**
 * GET  /functions/v1/public-quote?id=<quote_uuid>
 * POST /functions/v1/public-quote  { quote_id, action: "decline" }
 *
 * Public read of a quote for the Vercel client page.
 * Decline sets status = declined (no auth — anyone with the link can decline).
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

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
        .select("id, status")
        .eq("id", quoteId)
        .single();

      if (error || !quote) {
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

      return jsonResponse({ success: true, status: "declined" });
    }

    if (req.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return jsonResponse({ success: false, error: "id required" }, 400);
    }

    const { data: quote, error } = await supabase
      .from("quotes")
      .select(`
        id,
        client_name,
        client_phone,
        client_email,
        job_name,
        notes,
        total_amount,
        status,
        created_at,
        handyman_id,
        project_address,
        address,
        quote_line_items (
          id,
          description,
          quantity,
          unit_price,
          is_labor,
          photo_url
        )
      `)
      .eq("id", id)
      .single();

    if (error || !quote) {
      return jsonResponse({ success: false, error: "Quote not found" }, 404);
    }

    let handyman: Record<string, unknown> = {};
    if (quote.handyman_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, business_name, phone, email")
        .eq("id", quote.handyman_id)
        .maybeSingle();
      handyman = profile ?? {};
    }

    const line_items = quote.quote_line_items ?? [];

    return jsonResponse({
      success: true,
      quote: {
        id: quote.id,
        client_name: quote.client_name,
        client_phone: quote.client_phone,
        client_email: quote.client_email,
        job_name: quote.job_name,
        notes: quote.notes,
        total_amount: quote.total_amount,
        status: quote.status,
        created_at: quote.created_at,
        handyman_id: quote.handyman_id,
        project_address: (quote as { project_address?: string }).project_address ??
          (quote as { address?: string }).address ??
          null,
        line_items,
      },
      handyman,
    });
  } catch (err) {
    console.error("public-quote", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      500,
    );
  }
});
