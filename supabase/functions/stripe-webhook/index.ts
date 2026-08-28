/**
 * POST /functions/v1/stripe-webhook
 *
 * Source of truth after payment. Configure in Stripe Dashboard:
 *   Endpoint URL: https://<project>.supabase.co/functions/v1/stripe-webhook
 *   Events: checkout.session.completed, payment_intent.succeeded
 *
 * Env:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   (whsec_...)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Deploy with --no-verify-jwt so Stripe can POST without a user JWT.
 */
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import {
  balanceDue,
  serviceClient,
  sumPaidForQuote,
} from "../_shared/supabase.ts";
import { notifyHandymanPush } from "../_shared/expo-push.ts";

const DEPOSIT_PAID = new Set(["accepted", "approved", "deposit_paid", "paid"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2024-12-18.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : "invalid signature"}`,
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(pi);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error", err);
    return new Response(
      err instanceof Error ? err.message : "Handler error",
      { status: 500 },
    );
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid" && session.status !== "complete") {
    console.log("Session not paid yet", session.id, session.payment_status);
    return;
  }

  const quoteId =
    session.metadata?.quote_id ||
    session.client_reference_id ||
    null;

  if (!quoteId) {
    console.error("No quote_id on session", session.id);
    return;
  }

  const amountCents =
    session.amount_total ??
    (typeof session.amount_subtotal === "number" ? session.amount_subtotal : 0);
  const amountDollars = amountCents / 100;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const paymentTypeRaw = (session.metadata?.payment_type || "deposit").toLowerCase();
  const paymentType = paymentTypeRaw === "balance" || paymentTypeRaw === "final"
    ? "balance"
    : "deposit";

  await settleQuotePayment({
    quoteId,
    amountDollars,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    customerEmail: session.customer_details?.email ?? session.customer_email ??
      null,
    source: "checkout.session.completed",
    paymentType,
  });
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const quoteId = pi.metadata?.quote_id;
  if (!quoteId) {
    console.log("payment_intent.succeeded without quote_id", pi.id);
    return;
  }

  const paymentTypeRaw = (pi.metadata?.payment_type || "deposit").toLowerCase();
  const paymentType = paymentTypeRaw === "balance" || paymentTypeRaw === "final"
    ? "balance"
    : "deposit";

  await settleQuotePayment({
    quoteId,
    amountDollars: (pi.amount_received || pi.amount) / 100,
    stripeSessionId: null,
    stripePaymentIntentId: pi.id,
    customerEmail: null,
    source: "payment_intent.succeeded",
    paymentType,
  });
}

interface SettleArgs {
  quoteId: string;
  amountDollars: number;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  customerEmail: string | null;
  source: string;
  paymentType: "deposit" | "balance";
}

async function settleQuotePayment(args: SettleArgs) {
  const supabase = serviceClient();
  const {
    quoteId,
    amountDollars,
    stripeSessionId,
    stripePaymentIntentId,
    customerEmail,
    source,
    paymentType,
  } = args;

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, status, total_amount, client_id, client_name, job_name, handyman_id, notes",
    )
    .eq("id", quoteId)
    .single();

  if (error || !quote) {
    throw new Error(`Quote not found: ${quoteId}`);
  }

  const statusLower = (quote.status || "").toLowerCase();
  const alreadyDepositSettled = DEPOSIT_PAID.has(statusLower);

  if (stripePaymentIntentId) {
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("stripe_payment_intent_id", stripePaymentIntentId)
      .maybeSingle();
    if (existing) {
      console.log("Payment already recorded", stripePaymentIntentId);
      return;
    }
  }

  const paymentRow = {
    quote_id: quoteId,
    handyman_id: quote.handyman_id,
    client_id: quote.client_id,
    amount: amountDollars,
    currency: "usd",
    type: paymentType,
    status: "succeeded",
    stripe_session_id: stripeSessionId,
    stripe_payment_intent_id: stripePaymentIntentId,
    customer_email: customerEmail,
    source,
  };

  const { error: payErr } = await supabase.from("payments").insert(paymentRow);
  if (payErr) {
    console.warn("payments insert skipped/failed:", payErr.message);
  }

  const paidAfter = await sumPaidForQuote(supabase, quoteId);
  const remaining = balanceDue(Number(quote.total_amount), paidAfter);
  const fullyPaid = remaining < 0.5;

  // Quote status: deposit → accepted; full pay → paid
  if (fullyPaid) {
    await supabase.from("quotes").update({ status: "paid" }).eq("id", quoteId);
  } else if (paymentType === "deposit" && !alreadyDepositSettled) {
    await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", quoteId);
  }

  const { data: existingJob } = await supabase
    .from("jobs")
    .select("id, payments, status")
    .eq("quote_id", quoteId)
    .maybeSingle();

  const paymentEntry = {
    amount: amountDollars,
    type: paymentType,
    stripe_payment_intent_id: stripePaymentIntentId,
    at: new Date().toISOString(),
  };

  if (!existingJob && quote.handyman_id && paymentType === "deposit") {
    const { error: jobErr } = await supabase.from("jobs").insert({
      job_name: quote.job_name || "Job from quote",
      client_id: quote.client_id,
      client_name: quote.client_name,
      handyman_id: quote.handyman_id,
      quote_id: quoteId,
      total_amount: quote.total_amount,
      labor_cost: 0,
      material_cost: 0,
      before_photos: [],
      after_photos: [],
      payments: [paymentEntry],
      status: "schedule",
      scheduled_date: null,
      completed_date: null,
      notes: quote.notes ?? null,
    });
    if (jobErr) {
      console.error("job create failed", jobErr);
    }
  } else if (existingJob) {
    const prev = Array.isArray(existingJob.payments) ? existingJob.payments : [];
    const nextPayments = [...prev, paymentEntry];
    const jobPatch: Record<string, unknown> = { payments: nextPayments };
    if (fullyPaid) {
      jobPatch.status = "paid";
    }
    await supabase.from("jobs").update(jobPatch).eq("id", existingJob.id);
  }

  const client = quote.client_name || "A client";
  const job = quote.job_name || "quote";
  const amt = Number(amountDollars).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

  if (paymentType === "balance" || fullyPaid) {
    await notifyHandymanPush(
      supabase,
      quote.handyman_id,
      fullyPaid ? "Balance paid — job fully paid" : "Balance payment received",
      `${client} paid ${amt} balance on “${job}”.`,
      { quoteId, type: "balance_paid", status: fullyPaid ? "paid" : statusLower },
    );
  } else if (!alreadyDepositSettled) {
    await notifyHandymanPush(
      supabase,
      quote.handyman_id,
      "Deposit received",
      `${client} paid ${amt} on “${job}”.`,
      { quoteId, type: "deposit_paid", status: "accepted" },
    );
  }

  console.log(
    `Settled quote ${quoteId} type=${paymentType} via ${source} amount=${amountDollars} remaining=${remaining}`,
  );
}
