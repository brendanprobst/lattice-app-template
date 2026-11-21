-- Thing demo table (template vertical slice). Matches ThingRecord:
-- numeric id (app-assigned, not serial), name, created_at.
-- Demo rows live in supabase/migrations/seed/features/things.sql.

create table if not exists public.things (
  id bigint primary key,
  name text not null,
  created_at timestamptz not null default now()
);
