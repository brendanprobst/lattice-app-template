-- Thing demo table (template vertical slice). Matches ThingRecord:
-- numeric id (app-assigned, not serial), name, created_at.
-- Idempotent. Demo rows use ids 1–3 so they do not collide with
-- CreateThingUseCase (randomInt >= 1_000_000).

create table if not exists public.things (
  id bigint primary key,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.things (id, name, created_at)
values
  (1, 'Demo lamp', now() - interval '2 days'),
  (2, 'Demo notebook', now() - interval '1 day'),
  (3, 'Demo coffee mug', now())
on conflict (id) do update
set name = excluded.name;
