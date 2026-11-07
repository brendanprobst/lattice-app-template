-- Demo Thing rows. Ids 1–3 stay clear of CreateThingUseCase (randomInt >= 1000000).
--
--   npm run supabase:seed:things
--   npm run supabase:seed:things:down -- --yes

insert into public.things (id, name, created_at)
values
  (1, 'Demo lamp', now() - interval '2 days'),
  (2, 'Demo notebook', now() - interval '1 day'),
  (3, 'Demo coffee mug', now())
on conflict (id) do update
set name = excluded.name;

select id, name from public.things where id in (1, 2, 3) order by id;
