-- Email allowlist gate for signup (covers email/password and OAuth providers).
-- Apply in the Supabase SQL editor or via the Supabase CLI.
--
-- The gate is OPT-IN behind a feature flag stored in public.allowlist_settings.
-- Applying this migration creates the table, function and trigger but leaves
-- the flag DISABLED, so existing signup behavior is unchanged. Flip it on with:
--
--   select public.set_allowlist_enabled(true);
--
-- (and set EMAIL_ALLOWLIST_ENABLED=true in the API env).
--
-- IMPORTANT — schema permissions:
-- Recent Supabase projects restrict CREATE in the `auth` schema, so all helper
-- functions live under `public`. The trigger itself still attaches to
-- `auth.users`; if your SQL Editor role lacks TRIGGER privilege on
-- `auth.users`, run this migration via the Supabase CLI / direct psql as the
-- `postgres` role, or fall back to API-only enforcement (the API middleware
-- enforces the same allowlist via `EMAIL_ALLOWLIST_ENABLED`).
--
-- Add a friend:    insert into public.allowed_emails (email) values ('them@example.com');
-- Remove a friend: delete from public.allowed_emails where email = 'them@example.com';

create extension if not exists citext;

create table if not exists public.allowed_emails (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null unique,
  note        text,
  created_at  timestamptz not null default now()
);

-- Single-row settings table holding the runtime feature flag. The CHECK
-- constraint pins it to one row so callers do not need to know an id.
create table if not exists public.allowlist_settings (
  singleton  boolean primary key default true,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint allowlist_settings_singleton_chk check (singleton = true)
);

insert into public.allowlist_settings (singleton, enabled)
values (true, false)
on conflict (singleton) do nothing;

-- Backfill any pre-existing accounts so flipping the flag on later does not
-- lock current users out. Wrapped in a DO block with an insufficient_privilege
-- handler because some Supabase roles cannot read auth.users from the SQL
-- editor; the rest of the migration must still succeed.
do $$
begin
  insert into public.allowed_emails (email, note)
  select email, 'auto-seeded from existing auth.users'
  from auth.users
  where email is not null
  on conflict (email) do nothing;
exception
  when insufficient_privilege then
    raise notice 'Skipping auth.users backfill (insufficient privilege). Add existing emails manually with: insert into public.allowed_emails (email) values (...);';
end
$$;

-- Convenience helper: toggle the flag without remembering the singleton key.
create or replace function public.set_allowlist_enabled(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.allowlist_settings
     set enabled = p_enabled,
         updated_at = now()
   where singleton = true;
  return p_enabled;
end;
$$;

revoke all on function public.set_allowlist_enabled (boolean) from public;
grant execute on function public.set_allowlist_enabled (boolean) to service_role;

-- Trigger function lives in `public` (not `auth`) because Supabase no longer
-- permits CREATE in the auth schema from the SQL editor. SECURITY DEFINER
-- ensures it runs as the function owner (the migration runner — typically
-- `postgres`) so it can read public.allowlist_settings / public.allowed_emails
-- regardless of who is performing the auth.users insert.
create or replace function public.enforce_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_enabled boolean;
begin
  select enabled into is_enabled
    from public.allowlist_settings
   where singleton = true;

  if coalesce(is_enabled, false) = false then
    return new;
  end if;

  if new.email is null
     or not exists (select 1 from public.allowed_emails where email = new.email) then
    raise exception 'EMAIL_NOT_APPROVED: % is not on the allow list', new.email
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- supabase_auth_admin is the role that performs `insert into auth.users` for
-- every signup path; granting EXECUTE explicitly avoids surprises if Postgres
-- defaults change. service_role and postgres are included for admin tooling
-- and direct psql runs.
revoke all on function public.enforce_allowed_email () from public;
grant execute on function public.enforce_allowed_email () to supabase_auth_admin, service_role, postgres;

-- Clean up any prior version of the function in the auth schema (left over
-- from earlier iterations of this migration). Wrapped because the role may
-- lack DROP rights on auth.* — that is expected and not fatal.
do $$
begin
  execute 'drop function if exists auth.enforce_allowed_email() cascade';
exception
  when insufficient_privilege then
    null;
end
$$;

-- BEFORE INSERT trigger blocks signups whose email is not on the allowlist
-- (only when the feature flag is on). Supabase surfaces RAISE EXCEPTION text
-- to the client, so we use the stable prefix `EMAIL_NOT_APPROVED:` that the
-- web UI matches for a friendly error.
drop trigger if exists enforce_allowed_email on auth.users;
create trigger enforce_allowed_email
  before insert on auth.users
  for each row execute function public.enforce_allowed_email();
