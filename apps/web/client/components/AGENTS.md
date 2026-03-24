# `client/components/` — Shared UI building blocks

## Layout

- **`ui/`** — **Design-system primitives** from shadcn/ui (Base UI). Generated/maintained via `npx shadcn@latest add …`. Do not mix route-specific or marketing-only layouts in this folder.
- **No page shells here** — route-level views live under **`client/pages/<route>/`** (see [`../pages/AGENTS.md`](../pages/AGENTS.md)).

## Imports

```ts
import { Button } from "@client/components/ui/button";
```

## Scaling

- **Feature-specific composed widgets** (e.g. a “Thing list” used on multiple routes): prefer **`client/features/<name>/`** when you introduce it; keep **`components/ui/`** generic.
- **Icons:** `lucide-react` next to components that use them.
