/**
 * POST /functions/v1/create-checkout-session
 * Body: {
 *   quote_id: string,
 *   payment_type?: "deposit" | "balance"   // default "deposit"
 * }
 *
 * Deposit: recomputed from quote total × deposit_percent (default 50%).
 * Balance: total − sum of succeeded payments; only when deposit already paid.
 *
 * Env: STRIPE_SECRET_KEY, PUBLIC_QUOTE_URL
 * Optional: STRIPE_CONNECT=true, PLATFORM_FEE_PERCENT
 */
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  balanceDue,
  depositFromTotal,
  serviceClient,
  sumPaidForQuote,
  toCents,
} from "../_shared/supabase.ts";

const DEPOSIT_BLOCKED = new Set([
  "accepted",
  "approved",
  "deposit_paid",
  "paid",
  "declined",
]);

const BALANCE_ALLOWED = new Set([
  "accepted",
  "approved",
  "deposit_paid",
]);

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
    const quoteId = typeof body.quote_id === "string" ? body.quote_id.trim() : "";
    if (!quoteId) {
      return jsonResponse({ error: "quote_id is required" }, 400);
    }

    const paymentTypeRaw =
      typeof body.payment_type === "string" ? body.payment_type.toLowerCase() : "deposit";
    const paymentType = paymentTypeRaw === "balance" || paymentTypeRaw === "final"
      ? "balance"
      : "deposit";

    const supabase = serviceClient();
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select(
        "id, total_amount, status, client_name, handyman_id, job_name, deposit_percent",
      )
      .eq("id", quoteId)
      .maybeSingle();

    if (quoteErr) {
      console.error("create-checkout-session select", quoteErr.message);
      return jsonResponse({ error: "Quote not found", detail: quoteErr.message }, 404);
    }
    if (!quote) {
      return jsonResponse({ error: "Quote not found" }, 404);
    }

    const status = (quote.status || "").toLowerCase();
    const total = Number(quote.total_amount) || 0;
    const paidSoFar = await sumPaidForQuote(supabase, quoteId);

    let chargeDollars: number;
    let productName: string;
    let productDesc: string;

    if (paymentType === "deposit") {
      if (DEPOSIT_BLOCKED.has(status)) {
        return jsonResponse(
          {
            error: status === "declined"
              ? "Quote was declined"
              : "Deposit already paid for this quote",
          },
          409,
        );
      }
      chargeDollars = depositFromTotal(total, quote.deposit_percent as number | null);
      const pct =
        quote.deposit_percent != null && Number(quote.deposit_percent) > 0
          ? Number(quote.deposit_percent)
          : 50;
      productName = `Deposit — ${quote.job_name || "Service quote"}`;
      productDesc =
        `${pct}% deposit for quote ${quoteId.slice(0, 8)} (${quote.client_name || "client"})`;
    } else {
      // Balance payment
      if (status === "declined") {
        return jsonResponse({ error: "Quote was declined" }, 409);
      }
      if (status === "paid") {
        return jsonResponse({ error: "Quote is already fully paid" }, 409);
      }
      // Allow balance when deposit is paid (accepted statuses) OR when partial payments exist
      const hasDeposit = paidSoFar > 0 || BALANCE_ALLOWED.has(status);
      if (!hasDeposit && !BALANCE_ALLOWED.has(status)) {
        return jsonResponse(
          { error: "Pay the deposit first before the balance" },
          409,
        );
      }
      chargeDollars = balanceDue(total, paidSoFar);
      if (chargeDollars < 0.5) {
        return jsonResponse({ error: "No balance remaining on this quote" }, 409);
      }
      productName = `Balance — ${quote.job_name || "Service quote"}`;
      productDesc =
        `Remaining balance for quote ${quoteId.slice(0, 8)} (${quote.client_name || "client"})`;
    }

    const amountCents = toCents(chargeDollars);
    if (amountCents < 50) {
      return jsonResponse({ error: "Amount too small" }, 400);
    }

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

    const base = publicQuoteUrl.replace(/\/$/, "");
    const successUrl =
      `${base}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      `${base}/cancel?id=${encodeURIComponent(quoteId)}`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: quoteId,
      metadata: {
        quote_id: quoteId,
        handyman_id: quote.handyman_id || "",
        payment_type: paymentType,
        charge_dollars: String(chargeDollars),
        total_amount: String(quote.total_amount),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: productName,
              description: productDesc,
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: {
          quote_id: quoteId,
          handyman_id: quote.handyman_id || "",
          payment_type: paymentType,
        },
      },
    };

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

    // Soft-mark as sent if still draft (client opened deposit pay flow)
    if (paymentType === "deposit" && status === "draft") {
      await supabase.from("quotes").update({ status: "sent" }).eq("id", quoteId);
    }

    return jsonResponse({
      url: session.url,
      session_id: session.id,
      payment_type: paymentType,
      amount: chargeDollars,
      deposit_amount: paymentType === "deposit" ? chargeDollars : undefined,
      balance_amount: paymentType === "balance" ? chargeDollars : undefined,
    });
  } catch (err) {
    console.error("create-checkout-session", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      500,
    );
  }
});
