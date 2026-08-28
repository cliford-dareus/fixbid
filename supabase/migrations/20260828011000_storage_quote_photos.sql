-- quote-photos: handymen upload under {userId}/...; public read for client PDFs / public page

insert into storage.buckets (id, name, public)
values ('quote-photos', 'quote-photos', true)
on conflict (id) do update set public = excluded.public;

-- Drop old policies if re-applying
drop policy if exists "quote_photos_public_read" on storage.objects;
drop policy if exists "quote_photos_owner_insert" on storage.objects;
drop policy if exists "quote_photos_owner_update" on storage.objects;
drop policy if exists "quote_photos_owner_delete" on storage.objects;

create policy "quote_photos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'quote-photos');

create policy "quote_photos_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "quote_photos_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "quote_photos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
