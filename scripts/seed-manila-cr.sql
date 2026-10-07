-- Poopipoo — 20 seeded restrooms around Manila (Santa Cruz, Sampaloc,
-- Ermita, Quiapo, Binondo, Tondo).
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run: a restroom whose
-- name already exists is skipped.
--
-- Notes:
-- - Coordinates are approximate (from public knowledge of each place, not
--   Google Maps). Good enough to find the building; not the exact door.
-- - Descriptions, amenities and free/paid are typical for the kind of place,
--   not verified on site. Reviews and reports from users will correct them.
-- - created_by NULL = seeded (no owner). Edit/delete them here in SQL only.
-- - status 'approved' so they show right away. ai_checked_at is set so they
--   don't appear in the moderation dashboard's "Not checked by AI" list.
-- - Running as the SQL Editor (no signed-in user) skips the Phase 11
--   rate limit trigger.
-- - Why not ON CONFLICT DO NOTHING: restrooms has no unique column besides
--   id, so ON CONFLICT would never fire. The NOT EXISTS below does the
--   duplicate check by name instead.

begin;

insert into public.restrooms
  (name, description, address, latitude, longitude, amenities, is_free,
   rating, review_count, status, created_by, images, ai_checked_at)
select
  v.name, v.description, v.address, v.latitude, v.longitude, v.amenities, v.is_free,
  0, 0, 'approved', null, '{}', now()
from (
  values
    -- ---------- Blumentritt ----------
    ('Blumentritt Market CR',
     'Public CR sa loob ng palengke. Karaniwang may maliit na bayad.',
     'Blumentritt Rd. cor. Rizal Ave., Santa Cruz, Manila',
     14.6224, 120.9842, array['tissue']::text[], false),
    ('Blumentritt LRT Station CR',
     'Nasa loob ng LRT-1 Blumentritt Station, para sa mga pasahero.',
     'LRT-1 Blumentritt Station, Rizal Ave., Santa Cruz, Manila',
     14.6227, 120.9829, array['soap', 'free']::text[], true),

    -- ---------- España ----------
    ('University of Santo Tomas CR',
     'Nasa loob ng UST campus. Para sa may access sa campus (estudyante, staff, bisita).',
     'España Blvd., Sampaloc, Manila',
     14.6096, 120.9893, array['tissue', 'soap', 'wheelchair', 'free']::text[], true),
    ('España Boulevard Public CR',
     'Public CR malapit sa España Blvd. Approximate na lokasyon, paki-confirm kung nakita mo.',
     'España Blvd., Sampaloc, Manila',
     14.6107, 120.9912, array['free']::text[], true),
    ('SM San Lazaro CR — 2nd Floor',
     'Mall CR sa 2nd floor. Malinis karaniwan, may attendant.',
     'SM City San Lazaro, A.H. Lacson Ave. cor. Felix Huertas St., Santa Cruz, Manila',
     14.6175, 120.9845, array['bidet', 'tissue', 'soap', 'wheelchair', 'baby-changing', 'air-conditioned', 'free']::text[], true),
    ('SM San Lazaro CR — 3rd Floor',
     'Mall CR sa 3rd floor, malapit sa food court at sinehan.',
     'SM City San Lazaro, A.H. Lacson Ave. cor. Felix Huertas St., Santa Cruz, Manila',
     14.6177, 120.9847, array['bidet', 'tissue', 'soap', 'wheelchair', 'air-conditioned', 'free']::text[], true),

    -- ---------- SM City Manila (tabi ng City Hall) ----------
    ('SM City Manila CR — Ground Floor',
     'Mall CR sa ground floor, malapit sa main entrance.',
     'SM City Manila, Natividad Almeda-Lopez St. cor. San Marcelino St., Ermita, Manila',
     14.5898, 120.9832, array['bidet', 'tissue', 'soap', 'wheelchair', 'air-conditioned', 'free']::text[], true),
    ('SM City Manila CR — 2nd Floor',
     'Mall CR sa 2nd floor. May baby changing area.',
     'SM City Manila, Natividad Almeda-Lopez St. cor. San Marcelino St., Ermita, Manila',
     14.5900, 120.9834, array['bidet', 'tissue', 'soap', 'wheelchair', 'baby-changing', 'air-conditioned', 'free']::text[], true),
    ('SM City Manila CR — 3rd Floor',
     'Mall CR sa 3rd floor, malapit sa food court.',
     'SM City Manila, Natividad Almeda-Lopez St. cor. San Marcelino St., Ermita, Manila',
     14.5896, 120.9830, array['bidet', 'tissue', 'soap', 'wheelchair', 'air-conditioned', 'free']::text[], true),

    -- ---------- Rizal Park ----------
    ('Rizal Park Main CR',
     'Public CR sa Rizal Park, malapit sa Rizal Monument. Karaniwang may maliit na bayad.',
     'Rizal Park (Luneta), Roxas Blvd., Ermita, Manila',
     14.5826, 120.9787, array['tissue', 'soap', 'wheelchair']::text[], false),
    ('Rizal Park Garden CR',
     'Public CR malapit sa mga garden sa Rizal Park.',
     'Rizal Park (Luneta), Ermita, Manila',
     14.5834, 120.9803, array['tissue', 'soap']::text[], false),
    ('Rizal Park Fountain CR',
     'Public CR malapit sa central lagoon at dancing fountain.',
     'Rizal Park (Luneta), Ermita, Manila',
     14.5818, 120.9811, array['tissue', 'soap', 'wheelchair']::text[], false),

    -- ---------- Iba pa ----------
    ('Manila City Hall CR',
     'Nasa loob ng City Hall, para sa mga may transaksyon. Office hours lang.',
     'Manila City Hall, Padre Burgos Ave., Ermita, Manila',
     14.5896, 120.9817, array['soap', 'wheelchair', 'free']::text[], true),
    ('Quiapo Church CR',
     'Malapit sa Quiapo Church at Plaza Miranda. Matao lalo na tuwing Biyernes.',
     'Quiapo Church, Quezon Blvd. / Plaza Miranda, Quiapo, Manila',
     14.5986, 120.9838, array['free']::text[], true),
    ('Binondo Church CR',
     'Malapit sa Binondo Church (Minor Basilica of San Lorenzo Ruiz).',
     'Binondo Church, Plaza Lorenzo Ruiz, Binondo, Manila',
     14.6000, 120.9746, array['soap', 'free']::text[], true),
    ('Divisoria Mall CR',
     'Mall CR sa Divisoria. Matao, karaniwang may maliit na bayad.',
     'Divisoria Mall, Sto. Cristo St. cor. C.M. Recto Ave., Binondo, Manila',
     14.6040, 120.9730, array['tissue', 'soap']::text[], false),
    ('Lucky Chinatown Mall CR',
     'Mall CR sa Lucky Chinatown, malinis karaniwan.',
     'Lucky Chinatown Mall, Reina Regente St., Binondo, Manila',
     14.6032, 120.9739, array['bidet', 'tissue', 'soap', 'wheelchair', 'baby-changing', 'air-conditioned', 'free']::text[], true),
    ('168 Shopping Mall CR',
     'Mall CR sa 168, Divisoria. Matao, lalo na tuwing Pasko.',
     '168 Shopping Mall, Soler St., Binondo, Manila',
     14.6040, 120.9767, array['tissue', 'soap']::text[], false),
    ('Tutuban Center CR',
     'Mall CR sa Tutuban Center, malapit sa PNR Tutuban.',
     'Tutuban Center, C.M. Recto Ave., Tondo, Manila',
     14.6081, 120.9725, array['tissue', 'soap', 'air-conditioned']::text[], false),
    ('Manila Central Post Office CR',
     'Nasa loob ng Central Post Office, para sa mga may transaksyon. Office hours lang.',
     'Manila Central Post Office, Liwasang Bonifacio, Ermita, Manila',
     14.5967, 120.9773, array['free']::text[], true)
) as v(name, description, address, latitude, longitude, amenities, is_free)
where not exists (
  select 1 from public.restrooms as r where r.name = v.name
);

commit;

-- ============================================================
-- Verification
-- ============================================================

-- Should list all 20 (seeded, approved)
select name, address, latitude, longitude, is_free, array_length(amenities, 1) as amenity_count, status
from public.restrooms
where created_by is null
  and name in (
    'Blumentritt Market CR', 'Blumentritt LRT Station CR', 'University of Santo Tomas CR',
    'España Boulevard Public CR', 'SM San Lazaro CR — 2nd Floor', 'SM San Lazaro CR — 3rd Floor',
    'SM City Manila CR — Ground Floor', 'SM City Manila CR — 2nd Floor', 'SM City Manila CR — 3rd Floor',
    'Rizal Park Main CR', 'Rizal Park Garden CR', 'Rizal Park Fountain CR', 'Manila City Hall CR',
    'Quiapo Church CR', 'Binondo Church CR', 'Divisoria Mall CR', 'Lucky Chinatown Mall CR',
    '168 Shopping Mall CR', 'Tutuban Center CR', 'Manila Central Post Office CR'
  )
order by name;

select count(*) as approved_total from public.restrooms where status = 'approved';
