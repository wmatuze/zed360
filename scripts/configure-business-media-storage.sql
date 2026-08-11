-- Run this once in the Supabase SQL Editor after creating the public
-- `business-media` bucket in Storage.
--
-- Bucket restrictions recommended in the dashboard:
--   Public bucket: yes
--   Maximum file size: 5 MB
--   Allowed MIME types: image/jpeg, image/png, image/webp

drop policy if exists "Zed360 managers upload business media" on storage.objects;
create policy "Zed360 managers upload business media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-media'
  and exists (
    select 1
    from public.business_members membership
    where membership.user_id = auth.uid()
      and membership.role in ('owner', 'manager')
      and membership.business_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Zed360 managers update business media" on storage.objects;
create policy "Zed360 managers update business media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'business-media'
  and exists (
    select 1
    from public.business_members membership
    where membership.user_id = auth.uid()
      and membership.role in ('owner', 'manager')
      and membership.business_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'business-media'
  and exists (
    select 1
    from public.business_members membership
    where membership.user_id = auth.uid()
      and membership.role in ('owner', 'manager')
      and membership.business_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Zed360 managers delete business media" on storage.objects;
create policy "Zed360 managers delete business media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-media'
  and exists (
    select 1
    from public.business_members membership
    where membership.user_id = auth.uid()
      and membership.role in ('owner', 'manager')
      and membership.business_id::text = (storage.foldername(name))[1]
  )
);
