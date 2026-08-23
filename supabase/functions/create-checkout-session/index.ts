/**
 * POST /functions/v1/create-checkout-session
 * Body: { quote_id: string, client_name?: string, deposit_amount?: number }
 *
 * Always recomputes deposit from the quote row (50%). Client deposit_amount is ignored for charging.
 * Requires env: STRIPE_SECRET_KEY, PUBLIC_QUOTE_URL (e.g. https://fixbid-ten.vercel.app)
 * Optional: STRIPE_CONNECT — if "true", charges on connected account via transfer_data / application_fee.
 */
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { depositFromTotal, serviceClient, toCents } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const publicQuoteUrl = Deno.env.get("PUBLIC_QUOTE_URL") ??
      "https://fixbid-ten.vercel.app";

    if (!stripeKey) {
      return jsonResponse({ error: "Stripe not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const quoteId = body.quote_id as string | undefined;
    if (!quoteId) {
      return jsonResponse({ error: "quote_id is required" }, 400);
    }

    const supabase = serviceClient();
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select(
        "id, total_amount, status, client_name, client_email, handyman_id, job_name",
      )
      .eq("id", quoteId)
      .single();

    if (quoteErr || !quote) {
      return jsonResponse({ error: "Quote not found" }, 404);
    }

    const paidStatuses = ["accepted", "approved", "deposit_paid", "paid"];
    if (paidStatuses.includes((quote.status || "").toLowerCase())) {
      return jsonResponse({ error: "Deposit already paid for this quote" }, 409);
    }

    if ((quote.status || "").toLowerCase() === "declined") {
      return jsonResponse({ error: "Quote was declined" }, 409);
    }

    const depositDollars = depositFromTotal(quote.total_amount);
    const amountCents = toCents(depositDollars);
    if (amountCents < 50) {
      // Stripe minimum is typically $0.50 USD
      return jsonResponse({ error: "Deposit amount too small" }, 400);
    }

    // Optional: load handyman Connect account
    let stripeAccountId: string | null = null;
    if (quote.handyman_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_account_id, business_name, full_name")
        .eq("id", quote.handyman_id)
        .maybeSingle();
      stripeAccountId = profile?.stripe_account_id ?? null;
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-12-18.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const successUrl =
      `${publicQuoteUrl.replace(/\/$/, "")}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      `${publicQuoteUrl.replace(/\/$/, "")}/cancel?id=${encodeURIComponent(quoteId)}`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: quoteId,
      customer_email: quote.client_email || undefined,
      metadata: {
        quote_id: quoteId,
        handyman_id: quote.handyman_id || "",
        deposit_dollars: String(depositDollars),
        total_amount: String(quote.total_amount),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `Deposit — ${quote.job_name || "Service quote"}`,
              description: `50% deposit for quote ${quoteId.slice(0, 8)} (${quote.client_name || "client"})`,
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: {
          quote_id: quoteId,
          handyman_id: quote.handyman_id || "",
        },
      },
    };

    // Destination charge to connected account (platform fee optional)
    const useConnect = Deno.env.get("STRIPE_CONNECT") === "true";
    if (useConnect && stripeAccountId) {
      const feePercent = Number(Deno.env.get("PLATFORM_FEE_PERCENT") ?? "0");
      const applicationFee = Math.round(amountCents * (feePercent / 100));
      sessionParams.payment_intent_data = {
        ...sessionParams.payment_intent_data,
        transfer_data: { destination: stripeAccountId },
        ...(applicationFee > 0 ? { application_fee_amount: applicationFee } : {}),
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Soft-mark as sent if still draft (client opened pay flow)
    if ((quote.status || "").toLowerCase() === "draft") {
      await supabase.from("quotes").update({ status: "sent" }).eq("id", quoteId);
    }

    return jsonResponse({
      url: session.url,
      session_id: session.id,
      deposit_amount: depositDollars,
    });
  } catch (err) {
    console.error("create-checkout-session", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      500,
    );
  }
});
