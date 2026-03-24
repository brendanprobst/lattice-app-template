# `client/pages/` — Route-level views

## Purpose

**Full-page UI** wired from Next **`app/`** routes. One folder per logical page; **`index.ts`** re-exports the public entry so imports stay short (`@client/pages/home`).

## Conventions

| Folder        | Route | Notes |
|---------------|-------|--------|
| **`home/`**   | `/`   | Marketing / template landing. |
| **`ui-gallery/`** | `/ui` | Design-system smoke / QA (not product UI). |

- **Do not** put shadcn primitives here — those stay in **`client/components/ui/`** (see [`../components/AGENTS.md`](../components/AGENTS.md)).
- **Splitting:** As a page grows, add colocated modules under the same folder (e.g. `home/StepCards.tsx`, `home/constants.ts`) and keep **`HomePage.tsx`** as the thin composer.
- **Future:** Add **`client/features/<feature>/`** for reusable feature UI shared across pages; pages compose features + `ui/` primitives.

## Imports

```ts
import { HomePage } from "@client/pages/home";
import { UiGalleryPage } from "@client/pages/ui-gallery";
```
