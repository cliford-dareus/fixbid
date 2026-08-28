-- Allow authenticated handymen to record manual payments for themselves.
-- Stripe webhook uses service role and bypasses RLS.

drop policy if exists "Handymen can insert own payments" on public.payments;
create policy "Handymen can insert own payments"
  on public.payments
  for insert
  to authenticated
  with check (handyman_id = auth.uid());
