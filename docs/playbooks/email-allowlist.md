# Email allowlist for private access

This app can be restricted to people the owner has explicitly approved. Approval is enforced at signup time by a Postgres trigger on `auth.users`, so it covers **both** email/password signup and Google OAuth — no client-side bypass is possible. There is also a defense-in-depth check on every authenticated API request.

The whole feature is **off by default** behind a two-layer feature flag:

| Layer  | Flag                                          | Default | Effect when off                              |
|--------|-----------------------------------------------|---------|----------------------------------------------|
| API    | `EMAIL_ALLOWLIST_ENABLED` env var (`true` or `1`, case-insensitive for `true`) | unset / off | `requireAllowedEmail` middleware is a no-op. |
| DB     | `public.allowlist_settings.enabled` boolean   | `false` | Trigger short-circuits and allows all signups. |

You must flip **both** to fully enable the gate. They are independent so you can run the API in "enforce" mode while leaving the DB trigger off (or vice versa) during a rollout, and so that turning the DB flag off in an emergency does not require a redeploy.

### Deployed API (AWS Lambda) — Terraform

**Fix (2026):** The API Lambda **did not** receive `EMAIL_ALLOWLIST_ENABLED` from Terraform before, so **every deployed environment had the API allowlist middleware off** even when operators set `EMAIL_ALLOWLIST_ENABLED=true` only in `apps/api/.env` locally or believed “the database gate was enough.”

The database trigger blocks **new** `auth.users` inserts; the API middleware blocks **authenticated requests** using `public.allowed_emails`. For production you need **both** the Supabase SQL steps below **and**:

1. In `infra/terraform/envs/dev/terraform.tfvars`, opt in (the variable defaults to **`false`** in `variables.tf`):
   ```hcl
   email_allowlist_enabled = true
   ```
2. Run **`terraform apply`** (or your usual deploy) so the Lambda’s environment includes `EMAIL_ALLOWLIST_ENABLED=true`.

Confirm in **AWS Console → Lambda → your API function → Configuration → Environment variables**. Until that variable is present and set to `true` (or `1`), the API will not enforce the list regardless of Supabase settings.

## How the gate works

- **Table**: `public.allowed_emails (email citext unique, note text, created_at timestamptz)`.
- **Settings**: `public.allowlist_settings (singleton, enabled, updated_at)` — single-row config.
- **Trigger function**: `public.enforce_allowed_email()` (`SECURITY DEFINER`). Lives in `public` because Supabase restricts `CREATE` in the `auth` schema; the function reads the settings row and short-circuits when disabled, otherwise raises `EMAIL_NOT_APPROVED: ...` for any email not in `allowed_emails`.
- **Trigger**: `enforce_allowed_email` runs `BEFORE INSERT ON auth.users` and calls the public function.
- **API middleware**: `requireAllowedEmail` runs after `requireSupabaseAuth` on every protected route. When `EMAIL_ALLOWLIST_ENABLED` is off, the factory returns a pass-through. When on, it consults `public.allowed_emails` (with a 60s in-process cache) and returns 403 `EMAIL_NOT_APPROVED` for emails not on the list.

The trigger and table are defined in `apps/api/supabase/migrations/allowed_emails_signup_gate.sql`. The migration is fully idempotent — re-running it is safe.

### If the SQL Editor still rejects the trigger

Supabase grants `USAGE` on the `auth` schema to the SQL Editor role but withholds `CREATE`, so the function-in-`public` pattern above works. If your project also withholds `TRIGGER` privilege on `auth.users`, the final `create trigger` line will fail with a similar `permission denied` error. Two fallbacks:

1. **Run the migration via the Supabase CLI / direct psql as the `postgres` role.** See **[Supabase migrations playbook](supabase-migrations.md)**. Quick form:
   ```bash
   psql "postgresql://postgres:<password>@<host>:5432/postgres" \
     -f apps/api/supabase/migrations/allowed_emails_signup_gate.sql
   ```
2. **Skip the DB trigger entirely and rely on the API middleware.** The API gate already rejects every authenticated request from a non-approved email; the only loss is that orphan `auth.users` rows accumulate when someone tries to sign up. Comment out the final `drop trigger` / `create trigger` block and re-run.

## Enable the gate

1. Apply the migration if you haven't already (Supabase Studio → SQL Editor).
2. Flip the DB flag:
   ```sql
   select public.set_allowlist_enabled(true);
   ```
3. Set the API env var:
   - **Local:** `apps/api/.env` — `EMAIL_ALLOWLIST_ENABLED=true`, then restart the API.
   - **AWS:** `email_allowlist_enabled = true` in Terraform (see *Deployed API* above); `terraform apply` updates Lambda.

## Disable the gate (rollback)

Either layer alone is enough to neutralize the feature. To disable from the DB without a redeploy:

```sql
select public.set_allowlist_enabled(false);
```

To disable from the API, unset `EMAIL_ALLOWLIST_ENABLED`, set it to `false`, or (on AWS) set `email_allowlist_enabled = false` in Terraform and apply.

## Troubleshooting (“allowlist not working”)

Work through these in order:

1. **Lambda / process env** — `EMAIL_ALLOWLIST_ENABLED` must be exactly `true` or `1` (see `isEmailAllowlistEnabled` in `apps/api/auth/requireAllowedEmail.ts`). On AWS, verify the Lambda environment variable after apply.
2. **Database flag** — In Supabase SQL editor:
   ```sql
   select enabled from public.allowlist_settings where singleton = true;
   ```
   Expect `true` if you want the signup trigger active.
3. **Trigger present** — Still in SQL editor:
   ```sql
   select tgname, tgenabled
   from pg_trigger
   where tgrelid = 'auth.users'::regclass
     and tgname = 'enforce_allowed_email';
   ```
   If this returns no rows, the migration did not create the trigger (often **permission denied** in the browser SQL editor). Run `allowed_emails_signup_gate.sql` with **psql as `postgres`** (see *If the SQL Editor still rejects the trigger* above).
4. **Rows in `allowed_emails`** — Test addresses must be inserted; the migration only auto-seeds existing `auth.users` and one owner example.
5. **JWT email** — The API reads `email` from the Supabase JWT. If a custom token path omits `email`, the middleware treats the user as unapproved (`403`). Normal Supabase email + Google OAuth users include `email` in the access token.

## Whitelist a friend

```sql
insert into public.allowed_emails (email, note)
values ('them@example.com', 'optional note');
```

Email comparison is case-insensitive (`citext`).

## Remove someone

```sql
delete from public.allowed_emails where email = 'them@example.com';
```

This blocks future signups *and* invalidates existing API requests for that user once the API's 60-second allowlist cache expires. To kick them out immediately, also delete their `auth.users` row in Supabase Studio.

## What the user sees when blocked

- **Email/password signup** — the sign-up page shows: *"This email is not yet approved for access. Ask the owner to add you to the allowlist."*
- **Google OAuth** — Supabase redirects back to `/auth/sign-in` with an error description; the sign-in page detects the trigger error and shows the same friendly message.
- **Authenticated API call from a removed user** — the API responds `403 { error: { code: "EMAIL_NOT_APPROVED" } }`.
