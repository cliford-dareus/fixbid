/**
 * GET /functions/v1/update-quote-on-success?session_id=cs_...
 *
 * Used by public-quote-page/success.html for display only.
 * Prefer stripe-webhook as the real write path; this function:
 *  1) Retrieves the Checkout Session from Stripe
 *  2) If paid and quote not yet accepted, runs the same settle logic lightly
 *  3) Returns quote_id + amount for the UI
 */
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

const PAID = new Set(["accepted", "approved", "deposit_paid", "paid"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) {
      return jsonResponse({ success: false, message: "session_id required" }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ success: false, message: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-12-18.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const quoteId =
      session.metadata?.quote_id || session.client_reference_id || null;
    const amountCents = session.amount_total ?? 0;
    const amountDollars = amountCents / 100;

    if (!quoteId) {
      return jsonResponse({
        success: true,
        quote_id: null,
        amount: amountDollars,
        payment_status: session.payment_status,
      });
    }

    // Best-effort settle if webhook was delayed (idempotent)
    if (session.payment_status === "paid") {
      const supabase = serviceClient();
      const { data: quote } = await supabase
        .from("quotes")
        .select("id, status")
        .eq("id", quoteId)
        .maybeSingle();

      if (quote && !PAID.has((quote.status || "").toLowerCase())) {
        await supabase
          .from("quotes")
          .update({ status: "accepted" })
          .eq("id", quoteId);
      }
    }

    return jsonResponse({
      success: true,
      quote_id: quoteId,
      amount: amountDollars,
      payment_status: session.payment_status,
    });
  } catch (err) {
    console.error("update-quote-on-success", err);
    return jsonResponse(
      {
        success: false,
        message: err instanceof Error ? err.message : "Failed",
      },
      500,
    );
  }
});
