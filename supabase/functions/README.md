# FixBid Supabase Edge Functions

Payment source of truth is **`stripe-webhook`**. The browser success page only confirms display state.

## Functions

| Function | Purpose |
|----------|---------|
| `public-quote` | GET quote for public page; POST `{ action: "decline" }` + Expo push |
| `create-checkout-session` | Stripe Checkout; **server computes 50% deposit** |
| `stripe-webhook` | Verify signature → mark quote `accepted` → insert `payments` → create `jobs` → Expo push |
| `update-quote-on-success` | Success page helper (retrieve session; best-effort status) |
| `estimate-job-cost` | **AI cost estimate** via **Google Gemini** and/or **xAI Grok**; requires user JWT |

Shared helpers live in `_shared/` (`cors`, `supabase`, `expo-push`).

## Security checklist (high priority)

1. **RLS** — apply migrations (`rls_core`, `payments`, `storage_quote_photos`). Authenticated users only see/edit their own rows. Edge functions use the **service role** and bypass RLS.
2. **Public functions** — deploy quote/checkout/webhook with `--no-verify-jwt`. Do **not** expose the service role key to the client.
3. **Deposit amount** — `create-checkout-session` always recomputes 50% from `quotes.total_amount`; ignore client `deposit_amount`.
4. **Webhook** — verify `stripe-signature` with `STRIPE_WEBHOOK_SECRET`; idempotent on `stripe_payment_intent_id`.
5. **Storage** — uploads only under `{auth.uid()}/...` in `quote-photos`; public read for client-facing photos.
6. **Secrets** — only in Supabase secrets / CI; never in `EXPO_PUBLIC_*`.
7. **AI estimates** — `estimate-job-cost` requires a valid user JWT; keep `XAI_API_KEY` / `GEMINI_API_KEY` server-side only.

## Environment secrets

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PUBLIC_QUOTE_URL=https://fixbid-ten.vercel.app \
  STRIPE_CONNECT=false \
  PLATFORM_FEE_PERCENT=0 \
  GEMINI_API_KEY=AIza... \
  XAI_API_KEY=xai-...
```

Optional:

| Secret | Default | Notes |
|--------|---------|--------|
| `ESTIMATE_PROVIDER` | `auto` | `gemini` · `xai` · `auto` (try Gemini then xAI) |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Vision-capable Flash is a good cost default |
| `XAI_MODEL` | `grok-4.1-fast` | Vision-capable preferred for photos |
| `STRIPE_CONNECT` | `false` | Destination charges to `profiles.stripe_account_id` |
| `PLATFORM_FEE_PERCENT` | `0` | Application fee when Connect is on |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in hosted functions.

## Deploy

```bash
supabase db push

supabase functions deploy public-quote --no-verify-jwt
supabase functions deploy create-checkout-session --no-verify-jwt
supabase functions deploy update-quote-on-success --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt

# JWT verified (handyman session required)
supabase functions deploy estimate-job-cost
```

## Stripe Dashboard

1. Developers → Webhooks → Add endpoint  
   URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
2. Events:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (in-app PaymentSheet)
3. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

## AI estimate flow

```
App (photo + description)
  → upload photos to storage (public URLs)
  → POST estimate-job-cost (user JWT, optional provider)
  → Gemini and/or xAI (JSON line items)
  → Apply to draft quote builder
```

**Provider selection**

- Server: `ESTIMATE_PROVIDER=auto|gemini|xai`
- Request body: `{ "provider": "gemini" }` overrides for that call
- `auto`: try Gemini first (if key set), then xAI

Get keys:

- Gemini → [Google AI Studio](https://aistudio.google.com/apikey)
- xAI → [console.x.ai](https://console.x.ai)

## Notes

- Never trust client `deposit_amount` for the charge amount (checkout recomputes).
- Webhook must return 2xx only after durable DB updates (or Stripe will retry).
- Align quote statuses: `draft` → `sent` → `accepted` | `declined`.
- Public quote links are capability URLs (UUID); treat them like secrets when sharing.
