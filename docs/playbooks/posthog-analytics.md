# PostHog analytics (optional)

This playbook explains how to turn on **[PostHog](https://posthog.com)** for the Next.js app (**`@lattice/web`**). Analytics are **disabled by default** and require an explicit env flag so local dev, CI, and forks stay quiet until you opt in.

## What is wired in the template

| Piece | Role |
|--------|------|
| **`apps/web/client/lib/analytics/`** | **`AnalyticsAdapter`** port + **`PostHogAnalyticsAdapter`** / **`NoopAnalyticsAdapter`** — all `posthog-js` calls go through here (see **`AGENTS.md`** in that folder). |
| **`apps/web/instrumentation-client.ts`** | Calls **`getAnalyticsAdapter().initFromEnv()`** (no direct PostHog imports). |
| **`apps/web/app/providers.tsx`** | Wraps with **`PostHogProvider`** when the adapter is enabled; mounts **`PostHogPageView`**. |
| **`apps/web/client/analytics/PostHogPageView.tsx`** | **`capturePageView`** via the adapter on route change. |

**Defaults in code:** session recording is **disabled** (`disable_session_recording: true`). Enable recordings from the PostHog project if you want them. Pageviews are manual (`capture_pageview: false`) so SPA navigations are not double-counted.

## 1. Create a PostHog project

1. Sign up at [PostHog Cloud](https://app.posthog.com/signup) (or use a self-hosted instance).
2. Create a project and open **Project settings**.
3. Copy the **Project API key** (token) for the browser.

## 2. Choose your ingest host

- **US Cloud (default in code):** `https://us.i.posthog.com`
- **EU Cloud:** `https://eu.i.posthog.com`

Set **`NEXT_PUBLIC_POSTHOG_HOST`** if you are not using the US default.

## 3. Configure `apps/web/.env.local`

From the app root **`apps/web/`**:

```bash
cp .env.example .env.local   # if you do not already have one
```

Add (or uncomment) **all** of the following:

```bash
# Required to turn on PostHog (anything other than "1" leaves it off)
NEXT_PUBLIC_LATTICE_POSTHOG_ENABLED=1

# From PostHog → Project settings
NEXT_PUBLIC_POSTHOG_TOKEN=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional; omit for US Cloud
# NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

**Rules:**

- **`NEXT_PUBLIC_LATTICE_POSTHOG_ENABLED`** must be exactly **`1`** to enable (explicit opt-in).
- **`NEXT_PUBLIC_POSTHOG_TOKEN`** must be non-empty.
- **`NEXT_PUBLIC_LATTICE_E2E=1`** (Playwright) **disables** PostHog so E2E runs do not pollute analytics.

Restart **`npm run dev -w @lattice/web`** after changing env.

## 4. Verify in the app

1. Open the app (e.g. `http://localhost:3001`).
2. In PostHog, open **Activity** / **Live events** (or **Web analytics** after data lands).
3. Navigate between routes; you should see **`$pageview`** events.

## 5. Production / static export (AWS and others)

`NEXT_PUBLIC_*` values are **baked into the client bundle** at build time.

1. Set **`NEXT_PUBLIC_LATTICE_POSTHOG_ENABLED`**, **`NEXT_PUBLIC_POSTHOG_TOKEN`**, and optionally **`NEXT_PUBLIC_POSTHOG_HOST`** in the environment used by **`npm run build -w @lattice/web`** (or your CI deploy step).
2. Deploy the built **`out/`** (or your host’s artifact) as usual.
3. In PostHog, confirm **Authorized URLs** / project settings allow your production origin if required by your account.

## 6. Optional: identify users after Supabase sign-in

The template does **not** call `posthog.identify` by default (privacy-preserving baseline). To tie events to a stable ID after login, call **`posthog.identify(user.id)`** (or your preferred distinct id) from a client effect when **`useAuth()`** exposes a session—only if your privacy policy allows it.

## 7. Optional: custom events and feature flags

- **Custom events:** `import posthog from 'posthog-js'` in a client module and `posthog.capture('my_event', { props })`.
- **Feature flags (React):** use hooks from **`posthog-js/react`** inside components that are under **`PostHogProvider`** (already set in **`providers.tsx`** when PostHog is enabled).

## 8. Further reading

- [PostHog Next.js docs](https://posthog.com/docs/libraries/next-js)
- [Reverse proxy (reduce ad-blocker impact)](https://posthog.com/docs/advanced/proxy)
