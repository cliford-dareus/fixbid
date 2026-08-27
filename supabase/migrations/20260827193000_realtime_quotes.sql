-- Allow clients to receive postgres_changes on quotes (handyman app subscription).
-- Safe to re-run: ignore error if already in publication.

do $$
begin
  alter publication supabase_realtime add table public.quotes;
exception
  when duplicate_object then null;
  when others then
    -- table may already be a member under a different error code
    raise notice 'realtime quotes: %', SQLERRM;
end $$;
