-- FixBid core RLS
-- Handymen only access their own rows. Service role (edge functions) bypasses RLS.
-- Safe to re-run: drops policies by name if present, then recreates.

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public.is_quote_owner(qid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.quotes q
    where q.id = qid and q.handyman_id = auth.uid()
  );
$$;

revoke all on function public.is_quote_owner(uuid) from public;
grant execute on function public.is_quote_owner(uuid) to authenticated;

-- ── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── clients ─────────────────────────────────────────────────────────────────
alter table public.clients enable row level security;

drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;

create policy "clients_select_own"
  on public.clients for select to authenticated
  using (handyman_id = auth.uid());

create policy "clients_insert_own"
  on public.clients for insert to authenticated
  with check (handyman_id = auth.uid());

create policy "clients_update_own"
  on public.clients for update to authenticated
  using (handyman_id = auth.uid())
  with check (handyman_id = auth.uid());

create policy "clients_delete_own"
  on public.clients for delete to authenticated
  using (handyman_id = auth.uid());

-- ── quotes ──────────────────────────────────────────────────────────────────
alter table public.quotes enable row level security;

drop policy if exists "quotes_select_own" on public.quotes;
drop policy if exists "quotes_insert_own" on public.quotes;
drop policy if exists "quotes_update_own" on public.quotes;
drop policy if exists "quotes_delete_own" on public.quotes;

create policy "quotes_select_own"
  on public.quotes for select to authenticated
  using (handyman_id = auth.uid());

create policy "quotes_insert_own"
  on public.quotes for insert to authenticated
  with check (handyman_id = auth.uid());

create policy "quotes_update_own"
  on public.quotes for update to authenticated
  using (handyman_id = auth.uid())
  with check (handyman_id = auth.uid());

create policy "quotes_delete_own"
  on public.quotes for delete to authenticated
  using (handyman_id = auth.uid());

-- ── quote_line_items ────────────────────────────────────────────────────────
alter table public.quote_line_items enable row level security;

drop policy if exists "qli_select_own" on public.quote_line_items;
drop policy if exists "qli_insert_own" on public.quote_line_items;
drop policy if exists "qli_update_own" on public.quote_line_items;
drop policy if exists "qli_delete_own" on public.quote_line_items;

create policy "qli_select_own"
  on public.quote_line_items for select to authenticated
  using (public.is_quote_owner(quote_id));

create policy "qli_insert_own"
  on public.quote_line_items for insert to authenticated
  with check (public.is_quote_owner(quote_id));

create policy "qli_update_own"
  on public.quote_line_items for update to authenticated
  using (public.is_quote_owner(quote_id))
  with check (public.is_quote_owner(quote_id));

create policy "qli_delete_own"
  on public.quote_line_items for delete to authenticated
  using (public.is_quote_owner(quote_id));

-- ── jobs ────────────────────────────────────────────────────────────────────
alter table public.jobs enable row level security;

drop policy if exists "jobs_select_own" on public.jobs;
drop policy if exists "jobs_insert_own" on public.jobs;
drop policy if exists "jobs_update_own" on public.jobs;
drop policy if exists "jobs_delete_own" on public.jobs;

create policy "jobs_select_own"
  on public.jobs for select to authenticated
  using (handyman_id = auth.uid());

create policy "jobs_insert_own"
  on public.jobs for insert to authenticated
  with check (handyman_id = auth.uid());

create policy "jobs_update_own"
  on public.jobs for update to authenticated
  using (handyman_id = auth.uid())
  with check (handyman_id = auth.uid());

create policy "jobs_delete_own"
  on public.jobs for delete to authenticated
  using (handyman_id = auth.uid());

-- ── payments (reinforce if migration already enabled RLS) ───────────────────
alter table if exists public.payments enable row level security;

drop policy if exists "Handymen can read own payments" on public.payments;
drop policy if exists "payments_select_own" on public.payments;

create policy "payments_select_own"
  on public.payments for select to authenticated
  using (handyman_id = auth.uid());

-- No insert/update/delete for authenticated — only service role / edge functions
