# FixBid Supabase Edge Functions

Payment source of truth is **`stripe-webhook`**. The browser success page only confirms display state.

## Functions

| Function | Purpose |
|----------|---------|
| `public-quote` | GET quote for public page; POST `{ action: "decline" }` |
| `create-checkout-session` | Stripe Checkout; **server computes 50% deposit** |
| `stripe-webhook` | Verify signature → mark quote `accepted` → insert `payments` → create `jobs` |
| `update-quote-on-success` | Success page helper (retrieve session; best-effort status) |

Shared helpers live in `_shared/`.

## Environment secrets

Set in Supabase Dashboard → Edge Functions → Secrets (or `supabase secrets set`):

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PUBLIC_QUOTE_URL=https://fixbid-ten.vercel.app \
  STRIPE_CONNECT=false \
  PLATFORM_FEE_PERCENT=0
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in hosted functions.

Optional:

- `STRIPE_CONNECT=true` — destination charges to `profiles.stripe_account_id`
- `PLATFORM_FEE_PERCENT` — application fee percent when Connect is on

## Deploy

```bash
# From repo root (requires Supabase CLI linked to the project)
supabase db push   # applies migrations/ including payments table

supabase functions deploy public-quote --no-verify-jwt
supabase functions deploy create-checkout-session --no-verify-jwt
supabase functions deploy update-quote-on-success --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
```

`--no-verify-jwt` is required for public quote/checkout and for Stripe webhooks (no user JWT).

## Stripe Dashboard

1. Developers → Webhooks → Add endpoint  
   URL: `https://nzuqlglokhgdukcxhvit.supabase.co/functions/v1/stripe-webhook`
2. Events:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (in-app PaymentSheet)
3. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

## Flow

```
Client Pay Deposit
  → create-checkout-session (deposit = 50% of quotes.total_amount)
  → Stripe Checkout
  → checkout.session.completed
  → stripe-webhook:
       - idempotent payments insert
       - quotes.status = accepted
       - jobs row if missing
  → success.html?session_id=...
  → update-quote-on-success (display + backup status)
```

## Local test

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
supabase functions serve stripe-webhook --env-file ./supabase/.env.local
```

## Notes

- Never trust client `deposit_amount` for the charge amount (checkout recomputes).
- Webhook must return 2xx only after durable DB updates (or Stripe will retry).
- Ensure `profiles.stripe_account_id` exists if using Connect.
- Align quote statuses: `draft` → `sent` → `accepted` | `declined`.
