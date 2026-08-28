-- Revision history for quotes (revise-and-resend, edits)
create table if not exists public.quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  handyman_id uuid not null references auth.users (id) on delete cascade,
  revision_number int not null,
  reason text not null default 'edit',
  previous_status text,
  new_status text,
  previous_total numeric(12, 2),
  new_total numeric(12, 2),
  snapshot jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  unique (quote_id, revision_number)
);

create index if not exists quote_revisions_quote_id_idx
  on public.quote_revisions (quote_id, created_at desc);

alter table public.quote_revisions enable row level security;

-- Handyman owns revisions for their quotes
drop policy if exists "quote_revisions_select_own" on public.quote_revisions;
create policy "quote_revisions_select_own"
  on public.quote_revisions for select
  to authenticated
  using (handyman_id = auth.uid());

drop policy if exists "quote_revisions_insert_own" on public.quote_revisions;
create policy "quote_revisions_insert_own"
  on public.quote_revisions for insert
  to authenticated
  with check (handyman_id = auth.uid());

-- Immutable history — no update/delete for clients
drop policy if exists "quote_revisions_no_update" on public.quote_revisions;
create policy "quote_revisions_no_update"
  on public.quote_revisions for update
  to authenticated
  using (false);

drop policy if exists "quote_revisions_no_delete" on public.quote_revisions;
create policy "quote_revisions_no_delete"
  on public.quote_revisions for delete
  to authenticated
  using (false);

comment on table public.quote_revisions is
  'Immutable snapshots of quote state before each revision (pricing/scope changes).';
