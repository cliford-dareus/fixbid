# FixBid architecture

This document describes how the app is structured today and the recommended direction.

---

## Current shape

```
┌─────────────────────────────────────────────────────────────┐
│  UI (Expo Router screens)                                   │
│  app/(tabs), app/quote/*, app/settings/*, public-quote-page │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Contexts (UI + cached domain state)                        │
│  Auth · Profile · Quote (quotes/clients/jobs + draft) · Theme│
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Thin data layer  lib/data/*                                │
│  clientsApi · quotesApi · jobsApi · profilesApi             │
│  Result<T> · mappers · domain types                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Supabase client (anon) + Storage                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Edge functions (service role) — public + payments          │
│  public-quote · create-checkout-session · stripe-webhook    │
│  Expo push · Realtime on quotes                             │
└─────────────────────────────────────────────────────────────┘
```

### Principles already in place

| Principle | Where |
|-----------|--------|
| Typed domain models | `lib/data/types.ts` |
| Supabase I/O behind APIs | `lib/data/{clients,quotes,jobs,profiles}.ts` |
| `Result<T>` instead of throw-everywhere | `lib/data/result.ts` |
| Optimistic UI + rollback in context | `context/quote-context.tsx` |
| Branding from profile | `lib/branding.ts`, settings → `profiles` |
| Payments: server is source of truth | `stripe-webhook` recomputes deposit; client amount ignored |
| Public page is capability URL | UUID link + edge function, not anon RLS on quotes |
| Config is env-driven | `lib/config.ts`, edge secrets |

---

## Recommended architecture (target)

### 1. Keep the thin data layer; stop growing the mega-context

**Today:** `QuoteProvider` owns quotes, clients, jobs, draft builder, realtime, and alerts.

**Target:**

| Concern | Owner |
|---------|--------|
| Server lists / mutations | `lib/data/*` (+ optional React Query later) |
| Draft “new quote” wizard | Local screen state or `useNewQuoteDraft()` |
| Realtime merge + notify | `lib/realtime.ts` + small callback into list state |
| Cross-screen lists | Thin contexts **or** query cache |

Contexts should mostly hold:

- Cached lists the UI needs in many places
- Loading / error flags
- Mutation helpers that call the data layer

Screens should not call `supabase.from(...)` directly (except rare auth/storage helpers).

### 2. Optional: React Query (TanStack Query)

When list refetch / stale data becomes painful:

```
useQuery(['quotes', userId], () => quotesApi.listQuotes(userId))
useMutation(quotesApi.updateQuote, { onSuccess: invalidate quotes })
```

Realtime handler becomes: `queryClient.setQueryData` / `invalidateQueries` instead of hand-rolled `setQuotes`.

Do **not** adopt Query until the data layer is the only I/O path (already true for most domain ops).

### 3. Split providers by domain (when QuoteContext exceeds ~400 lines of mixed concerns)

```
QuoteProvider     → quotes list + quote mutations
ClientProvider    → clients
JobProvider       → jobs + revenue helpers
DraftQuoteProvider or screen-local state → new quote builder
```

Avoid one provider that re-renders the whole tree on every keystroke in the draft form.

### 4. Payment / status pipeline (already correct direction)

```
Public client → Edge (public-quote / checkout)
             → Stripe
             → stripe-webhook (idempotent DB write)
             → Realtime + Expo Push → Handyman app
```

Rules:

- Never trust client money amounts
- Webhook is the only path that marks paid
- Decline is an edge write + push
- App UI is reactive (Realtime / push), not authoritative

### 5. Edge vs app types

Longer term, share status enums and deposit math:

- `depositFromTotal` lives in `_shared` (edge) and can be mirrored in `lib/data` or a small `shared/` package
- Status strings: prefer a single union `QuoteStatus` used in app + documented for SQL checks

### 6. Feature folders (soft)

When adding modules (invoices, scheduling):

```
features/quotes/
  api.ts          → re-export or wrap lib/data/quotes
  hooks.ts
  components/
app/quote/        → thin routes only
```

Keep Expo Router routes thin; put logic in `lib/` or `features/`.

---

## Phased roadmap

### Phase A — now / next (low risk)

1. **Single realtime module** — all quote subscriptions in `lib/realtime.ts`; context only applies patches.
2. **Draft state out of global context** — keep `lineItems` / `newQuote` local to `app/quote/new.tsx` (or a dedicated hook) so typing a line item does not re-render Dashboard.
3. **No duplicate notification hooks** — remove parallel `usePaymentNotifications` behavior; one channel per user.
4. **Screens use `lib/config` + data layer only** for links and CRUD.

### Phase B — when product grows

1. Introduce TanStack Query for quotes/clients/jobs.
2. Split Quote / Client / Job providers.
3. Navigation from push notification → `/quote/[id]` via notification response listener.
4. Shared package or folder for deposit % and status constants used by edge + app.

### Phase C — scale / multi-device

1. Push token table (`user_id`, `token`, `platform`) instead of single `profiles.expo_push_token`.
2. Background jobs / queue for webhook side effects if Stripe volume grows.
3. Observability: structured logs on edge functions, Sentry on app.

---

## Explicit non-goals (for now)

- GraphQL / tRPC layer
- Full offline-first sync (SQLite)
- Micro-frontends
- Replacing Supabase Auth

---

## File map (important)

| Path | Role |
|------|------|
| `lib/data/*` | Domain API + types |
| `lib/branding.ts` | PDF / public display names |
| `lib/config.ts` | Public URLs, env |
| `lib/realtime.ts` | Quote status subscription helper |
| `lib/notification.ts` | Expo push register + local notify |
| `context/*` | Auth, profile, quote cache, theme |
| `supabase/functions/*` | Public read, checkout, webhook, push |
| `public-quote-page/` | Static client quote + pay UI |

---

## Decision log (short)

- **Why service role on public-quote?** Clients are not authenticated; UUID is the capability. RLS keeps handyman data private; public path is intentional and narrow.
- **Why context still holds lists?** Simple mobile UX without Query yet; acceptable until lists + realtime complexity justify Query.
- **Why webhook marks `accepted`?** Aligns deposit paid with “ready to schedule”; UI maps `accepted` / `deposit_paid` / `paid` as paid-like statuses.
