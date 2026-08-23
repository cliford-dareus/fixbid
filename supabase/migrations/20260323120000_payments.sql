-- Optional but recommended for stripe-webhook idempotency and reporting.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes (id) on delete set null,
  handyman_id uuid references auth.users (id) on delete set null,
  client_id uuid,
  amount numeric(12, 2) not null,
  currency text not null default 'usd',
  type text not null default 'deposit',
  status text not null default 'succeeded',
  stripe_session_id text,
  stripe_payment_intent_id text,
  customer_email text,
  source text,
  created_at timestamptz not null default now()
);

create unique index if not exists payments_stripe_payment_intent_uidx
  on public.payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists payments_stripe_session_uidx
  on public.payments (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists payments_quote_id_idx on public.payments (quote_id);
create index if not exists payments_handyman_id_idx on public.payments (handyman_id);

-- Service role bypasses RLS; lock down for anon/authenticated if you enable RLS later.
alter table public.payments enable row level security;

create policy "Handymen can read own payments"
  on public.payments
  for select
  to authenticated
  using (handyman_id = auth.uid());
