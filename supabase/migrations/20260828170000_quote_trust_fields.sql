-- Client-trust fields: scope, warranty, deposit defaults (profile) and per-quote snapshots.

-- Profile defaults (applied when creating/sending a quote)
alter table public.profiles
  add column if not exists default_inclusions text;
alter table public.profiles
  add column if not exists default_exclusions text;
alter table public.profiles
  add column if not exists warranty_text text;
alter table public.profiles
  add column if not exists deposit_percent integer default 50;
alter table public.profiles
  add column if not exists quote_valid_days integer default 30;

-- Per-quote client-facing scope (snapshotted at send time when possible)
alter table public.quotes
  add column if not exists inclusions text;
alter table public.quotes
  add column if not exists exclusions text;
alter table public.quotes
  add column if not exists warranty_text text;
alter table public.quotes
  add column if not exists deposit_percent integer;
alter table public.quotes
  add column if not exists valid_until date;

comment on column public.profiles.default_inclusions is 'Default bullet list for public quote Included section';
comment on column public.profiles.default_exclusions is 'Default bullet list for public quote Not included section';
comment on column public.profiles.warranty_text is 'Default workmanship warranty line shown on public quotes';
comment on column public.profiles.deposit_percent is 'Default deposit percent (e.g. 50)';
comment on column public.profiles.quote_valid_days is 'How many days a sent quote stays valid';
