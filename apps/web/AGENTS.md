# `apps/web/` — Next.js (App Router)

## Purpose

**`@lattice/web`** — Next.js frontend. Dev and production servers use **port `3001`** so the API can own **`3000`**.

## Imports

Use the **`@client/`** alias for all application code under `client/` (e.g. `@client/components/...`, `@client/styles/...`, `@client/lib/...`). `tsconfig.json` maps `@client/*` → `./client/*`.

The **`app/`** directory is for Next.js routing and layout only; keep feature UI in `client/`.

## Scripts

- `npm run dev` — Turbopack on port 3001
- `npm run build` / `npm run start` — production (start uses 3001)
