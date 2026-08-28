-- Per-quote acceptance: require deposit vs e-sign / accept without payment.

alter table public.quotes
  add column if not exists acceptance_mode text default 'deposit';

alter table public.quotes
  add column if not exists accepted_at timestamptz;

alter table public.quotes
  add column if not exists accepted_by_name text;

comment on column public.quotes.acceptance_mode is
  'deposit = client must pay deposit; accept = client can e-sign / accept without payment';

comment on column public.quotes.accepted_at is 'When the client accepted (e-sign or deposit path)';
comment on column public.quotes.accepted_by_name is 'Typed name from client accept / e-sign';

-- Profile default for new quotes
alter table public.profiles
  add column if not exists default_acceptance_mode text default 'deposit';

comment on column public.profiles.default_acceptance_mode is
  'Default for new quotes: deposit | accept';

-- Best-effort constraint (ignore if already present)
do $$
begin
  alter table public.quotes
    add constraint quotes_acceptance_mode_check
    check (acceptance_mode is null or acceptance_mode in ('deposit', 'accept'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_default_acceptance_mode_check
    check (default_acceptance_mode is null or default_acceptance_mode in ('deposit', 'accept'));
exception when duplicate_object then null;
end $$;
