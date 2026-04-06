# `apps/web/` — Next.js (App Router)

## Purpose

**`@lattice/web`** — Next.js frontend. Dev and production servers use **port `3001`** so the API can own **`3000`**.

## Imports

Use the **`@client/`** alias for all application code under `client/` (e.g. `@client/pages/...`, `@client/components/ui/...`, `@client/lib/...`, `@client/features/...`, `@client/stores/...`). `tsconfig.json` maps `@client/*` → `./client/*`.

The **`app/`** directory is for Next.js routing and layout only — thin files that import from **`client/pages/...`**.

## Styling and components

- **Tailwind CSS v4** + **shadcn/ui** (Base UI primitives) + **lucide-react**. Entry stylesheet: **`client/styles/globals.css`**. Primitives: **`client/components/ui/`** (`npx shadcn@latest add …`). **Route-level views:** **`client/pages/<route>/`** (e.g. `home`, `ui-gallery`) with **`index.ts`** barrels. See **[`docs/ui-and-styling.md`](docs/ui-and-styling.md)**, [`client/components/AGENTS.md`](client/components/AGENTS.md), [`client/pages/AGENTS.md`](client/pages/AGENTS.md).
- **`/`** — `client/pages/home`. **`/ui`** — `client/pages/ui-gallery`.

## Scripts

- `npm run dev` — Turbopack on port 3001
- `npm run build` / `npm run start` — production (start uses 3001)

## Environment

- Copy **`.env.example`** to **`.env.local`** at the app root (`apps/web/`). **`NEXT_PUBLIC_API_URL`** is the browser-visible API base. **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** power Auth (flows under **`/auth/*`**). Optional **`NEXT_PUBLIC_TEMPLATE_REPO_URL`** overrides GitHub CTA links on the home page.
- **Static export** (`npm run web:build:static`): set the same **`NEXT_PUBLIC_*`** values to **deployed** URLs/keys before building — they are embedded in `out/`. See **[`docs/plans/smoke_test_deployment_guide.plan.md`](../../docs/plans/smoke_test_deployment_guide.plan.md)**.

## Tests

Automated web tests live under repo-root **`test/web/`** (Vitest + Playwright), not in this package. Run **`npm run test:web:unit`** and **`npm run test:web:e2e`** from the monorepo root.
