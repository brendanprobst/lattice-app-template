# UI, styling, and components (`@lattice/web`)

## Stack

- **Tailwind CSS v4** — `@import "tailwindcss"` in [`client/styles/globals.css`](../client/styles/globals.css), PostCSS via [`postcss.config.mjs`](../postcss.config.mjs).
- **shadcn/ui (registry v4)** — copy-paste components under [`client/components/ui/`](../client/components/ui/), built on **Base UI** and **class-variance-authority**. Configuration: [`components.json`](../components.json). The **`shadcn`** npm package is a **devDependency** so `globals.css` can `@import "shadcn/tailwind.css"` during builds; the CLI is run via **`npx shadcn@latest add …`**.
- **lucide-react** — icons (e.g. `import { Check } from "lucide-react"`).
- **Utilities** — `cn()` in [`client/lib/utils.ts`](../client/lib/utils.ts) (`clsx` + `tailwind-merge`).

## Folder layout (scaling)

| Path | Role |
|------|------|
| **`client/components/ui/`** | shadcn primitives only — see [`client/components/AGENTS.md`](../client/components/AGENTS.md). |
| **`client/pages/<name>/`** | Full-page views for **`app/`** routes; barrel **`index.ts`** — see [`client/pages/AGENTS.md`](../client/pages/AGENTS.md). |
| **`client/features/<feature>/`** | (Optional, add when needed) Reusable feature UI shared by multiple pages. |

Imports:

```ts
import { HomePage } from "@client/pages/home";
import { Button } from "@client/components/ui/button";
```

## Design tokens

Theme colors and radius live as **CSS variables** in `globals.css` (`:root` and `.dark`). Tailwind maps them through `@theme inline` (e.g. `bg-background`, `text-muted-foreground`). Toggle dark mode by adding class `dark` on `<html>` when you implement a theme switcher.

## Adding components

From `apps/web/`:

```bash
npx shadcn@latest add <component> -y
```

Aliases in `components.json` point to `@client/components/ui` and `@client/lib/utils`. New files should land under `client/components/ui/`.

## Icons

Prefer **lucide-react** for consistency with shadcn examples. Icon names vary by version; if a name fails to resolve, pick an alternative from the [Lucide](https://lucide.dev/icons/) catalog.

## Live catalog

- **`/ui`** — Component gallery (buttons, badges, form, cards, alerts) for **visual QA** and onboarding.
- **`/`** — Lattice “app generator” style landing; links to `/ui` and template docs.

## Static export

This app uses **`output: "export"`** in Next config. Use **client-safe** patterns: `"use client"` where primitives require it, avoid server-only APIs on pages you need pre-rendered. The gallery and home are static-friendly.

## Testing

- **Vitest + RTL** — `npm run test:web:unit` (from monorepo root); tests under `test/web/unit/`. [`vitest.setup.ts`](../../../test/web/vitest.setup.ts) mocks `next/image`.
- **Playwright** — `npm run test:web:e2e`; specs under `test/web/e2e/` hit the real dev server and assert `/` and `/ui` landmarks.

## Optional env vars

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Browser-facing API base (shown on the home page for visibility). |
| `NEXT_PUBLIC_TEMPLATE_REPO_URL` | GitHub (or other) URL for “View on GitHub” / README links; defaults to a placeholder if unset. |

See **`.env.example`** in `apps/web/` (copy to **`.env.local`** for local dev).
