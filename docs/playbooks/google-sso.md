# Google SSO (Supabase OAuth)

The "Continue with google" button is wired in the repo. Enabling it is **operator configuration** on two dashboards — Google Cloud Console and **this** Supabase project — plus the redirect allowlist. Standup prints the leftover checklist; `npm run deploy:check -- --env <env>` confirms the key and provider.

`getOauthProvider()` reads `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER` and falls back to `google`.

## How the flow works

1. Button → `https://<project-ref>.supabase.co/auth/v1/authorize?provider=google&redirect_to=…`
2. Supabase → Google consent
3. Google → `https://<project-ref>.supabase.co/auth/v1/callback` (**Supabase's** callback, never the app origin)
4. Supabase → `<site-origin>/auth/sign-in?next=…&code=…`
5. The client exchanges the code (`flowType: "pkce"`).

A new Supabase project does **not** inherit Google or redirect URLs from another project.

## 1. Google Cloud Console

Create or reuse an **OAuth 2.0 Client ID** of type *Web application*.

| Field | Value |
|---|---|
| **Authorized JavaScript origins** | `https://<project-ref>.supabase.co` |
| **Authorized redirect URIs** | `https://<project-ref>.supabase.co/auth/v1/callback` |

`<project-ref>` is the host in `NEXT_PUBLIC_SUPABASE_URL`. The app hostname and `localhost` do **not** belong on this Google client — Google redirects to Supabase, not to the app.

While the consent screen is **Testing**, only listed test users can finish sign-in.

Copy the **Client ID** and **Client secret**. Do not put the Google secret in `NEXT_PUBLIC_*`, `terraform.tfvars`, or Infisical `/shared`.

## 2. Supabase → Authentication → Providers → Google

Paste **Google's** Client ID and Client secret, enable, and save. Supabase's service_role / JWT values go in `terraform.tfvars` (SSM), not Google and not Infisical `/sensitive`.

The toggle can look on while GoTrue still reports the provider off until both fields are saved. Confirm with `deploy:check`.

## 3. Supabase → Authentication → URL Configuration

| Setting | Local | Deployed |
|---|---|---|
| **Site URL** | `http://localhost:3001` | `https://<custom-domain>` |
| **Redirect URLs** | `http://localhost:3001/**` | `https://<custom-domain>/**` |

`redirectTo` includes `/auth/sign-in?next=…`. Do not add `localhost` on prod.

## 4. Keys must be the same project

`Invalid API key` means the publishable/anon key belongs to a **different** project than `NEXT_PUBLIC_SUPABASE_URL`. Copy URL + key from **this** project's Settings → API into:

- `apps/web/.env.<env>` (laptop `standup` / `deploy:aws`)
- `infra/terraform/envs/<env>/terraform.tfvars` (`supabase_url`)
- Infisical `/shared` (`NEXT_PUBLIC_SUPABASE_*`) so **Deploy app** bakes the same pair

Lambda JWT issuer/audience and service role must be this project (`terraform.tfvars` → SSM). Then rebuild the static site so `/shared` matches.

## Verify

```bash
npm run deploy:check -- --env prod
```

Expect `supabase anon key` accepted and `google provider` enabled. Then click **Continue with google** on the deployed `/auth/sign-in`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Invalid API key` | URL and publishable key are not a pair (often leftover from the previous project). |
| `Unsupported provider: provider is not enabled` | Google not saved on **this** project. |
| Google `redirect_uri_mismatch` | Client missing `https://<project-ref>.supabase.co/auth/v1/callback`. |
| Supabase "requested path is invalid" | Site origin not on **Redirect URLs** (use `https://<host>/**`). |
| Google "Access blocked" | Consent screen in Testing and the account is not a test user. |
| Signed in on the client, API 401/403 | `SUPABASE_JWT_ISSUER` / audience still point at another project. |
