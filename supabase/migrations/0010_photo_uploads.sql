-- Poopipoo — Phase 16: restroom photos
-- Requires 0001–0007 and 0009. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor.
--
-- Photos are compressed in the browser, uploaded to the public bucket
-- `restroom-images` (restroom-images/<user id>/<file>), and their public URLs
-- saved in restrooms.images.
--
-- For now photos are only allowed for restrooms in Metro Manila (same box as
-- lib/cities.ts). The demo account can't upload (storage policy + 0009's
-- restroom triggers).
--
-- Error messages raised here are matched by the app (lib/moderation/errors.ts):
--   'Photos not available here'   restroom is outside Metro Manila
--   'Invalid restroom photo'      not an uploaded photo of this user, or too many

-- ============================================================
-- Bucket: public read, max 5 MB, JPEG/PNG/WebP only
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restroom-images', 'restroom-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can view (public bucket: files are served without a policy).
-- Signed-in users write only inside their own folder; never the demo account.
drop policy if exists "Users can upload restroom photos" on storage.objects;
create policy "Users can upload restroom photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'restroom-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_demo_user())
  );

drop policy if exists "Users can delete their own restroom photos" on storage.objects;
create policy "Users can delete their own restroom photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'restroom-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ============================================================
-- restrooms.images: only this app's uploads, max 5, Metro Manila only
-- ============================================================

create or replace function public.check_restroom_images()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  url text;
begin
  -- Secret key / SQL Editor (imports, moderators fixing data): no checks
  if uid is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.images is not distinct from old.images
     and (new.latitude, new.longitude) is not distinct from (old.latitude, old.longitude) then
    return new;
  end if;
  if coalesce(cardinality(new.images), 0) = 0 then
    return new;
  end if;

  if cardinality(new.images) > 5 then
    raise exception 'Invalid restroom photo' using errcode = 'P0001';
  end if;

  -- Metro Manila only for now (lib/cities.ts: south 14.34, west 120.9, north 14.79, east 121.14)
  if new.latitude not between 14.34 and 14.79 or new.longitude not between 120.9 and 121.14 then
    raise exception 'Photos not available here' using errcode = 'P0001';
  end if;

  -- Every new URL must be a photo this user uploaded to restroom-images.
  -- (On update, URLs that were already there are kept as they are.)
  foreach url in array new.images loop
    if tg_op = 'UPDATE' and url = any(old.images) then
      continue;
    end if;
    if url !~ ('^https://[^/]+/storage/v1/object/public/restroom-images/' || uid::text || '/[A-Za-z0-9._-]+$') then
      raise exception 'Invalid restroom photo' using errcode = 'P0001';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists restrooms_check_images on public.restrooms;
create trigger restrooms_check_images
  before insert or update of images, latitude, longitude on public.restrooms
  for each row execute function public.check_restroom_images();
