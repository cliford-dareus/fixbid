-- Optional branding columns on profiles (safe if some already exist).
-- Run via supabase db push or SQL editor.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists zip text;
alter table public.profiles add column if not exists tagline text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists license_number text;
alter table public.profiles add column if not exists insurance_info text;
alter table public.profiles add column if not exists payment_note text;
alter table public.profiles add column if not exists logo_url text;
alter table public.profiles add column if not exists default_material_markup numeric;
alter table public.profiles add column if not exists default_tax_rate numeric;
