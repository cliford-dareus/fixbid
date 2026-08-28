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
│  Contexts (UI + thin facades over Query cache)              │
│  Auth · Profile · Quote · Theme                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  TanStack Query  lib/query-client.ts                        │
│  queryKeys.quotes | clients | jobs                          │
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
| Server list cache + optimistic mutations | TanStack Query in `QuoteProvider` |
| Branding from profile | `lib/branding.ts`, settings → `profiles` |
| Payments: server is source of truth | `stripe-webhook` recomputes deposit; client amount ignored |
| Public page is capability URL | UUID link + edge function, not anon RLS on quotes |
| Config is env-driven | `lib/config.ts`, edge secrets |

---

## Recommended architecture (target)

### 1. Keep the thin data layer; stop growing the mega-context

**Today:** `QuoteProvider` still exposes draft builder + list facades; lists come from Query.

**Target:**

| Concern | Owner |
|---------|--------|
| Server lists / mutations | `lib/data/*` + TanStack Query |
| Draft “new quote” wizard | Local screen state or `useNewQuoteDraft()` |
| Realtime merge + notify | `lib/realtime.ts` → `queryClient.setQueryData` |
| Cross-screen lists | Query cache (via context facade or hooks) |

### 2. TanStack Query — **done (B1)**

```
useQuery(queryKeys.quotes(userId), () => fromResult(quotesApi.listQuotes(userId)))
useMutation → optimistic setQueryData + rollback
Realtime → setQueryData / invalidateQueries
```

`useQuote()` public API unchanged so screens need no rewrite.

### 3. Split providers by domain (when needed)

```
QuoteProvider     → quotes list + quote mutations  (or pure hooks)
ClientProvider    → clients
JobProvider       → jobs + revenue helpers
Draft local state → new quote builder
```

### 4. Payment / status pipeline

```
Public client → Edge (public-quote / checkout)
             → Stripe
             → stripe-webhook (idempotent DB write)
             → Realtime + Expo Push → Handyman app
```

### 5. Edge vs app types

Share status enums and deposit math between `_shared` and `lib/data` when drift appears.

### 6. Feature folders (soft)

```
features/quotes/api.ts · hooks.ts · components/
app/quote/ → thin routes
```

---

## Phased roadmap

### Phase A

1. **Single realtime module** — done (`lib/realtime.ts`)
2. **Draft state out of global context** — still open
3. **No duplicate notification hooks** — done
4. **Screens use `lib/config` + data layer** — mostly done

### Phase B

1. **TanStack Query for quotes/clients/jobs** — **done**
2. Split Quote / Client / Job providers (optional after Query)
3. Navigation from push notification → `/quote/[id]`
4. Shared deposit % / status constants app ↔ edge

### Phase C

1. Multi-device push token table
2. Observability (Sentry, structured edge logs)

---

## File map

| Path | Role |
|------|------|
| `lib/data/*` | Domain API + types |
| `lib/query-client.ts` | QueryClient, keys, `fromResult` |
| `lib/branding.ts` | PDF / public display names |
| `lib/config.ts` | Public URLs, env |
| `lib/realtime.ts` | Quote status subscription |
| `lib/notification.ts` | Expo push register + local notify |
| `context/quote-context.tsx` | Facade over Query + draft UI state |
| `supabase/functions/*` | Public read, checkout, webhook, push |

---

## Decision log

- **Why service role on public-quote?** Clients are not authenticated; UUID is the capability.
- **Why keep `useQuote` after Query?** Avoid a big-bang screen migration; context is a stable facade.
- **Why webhook marks `accepted`?** Deposit paid ≈ ready to schedule; UI treats accepted/deposit_paid/paid as paid-like.
