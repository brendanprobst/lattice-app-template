# ui-chrome (catalog)

Layout chrome, extra shadcn primitives, markdown, and avatar helpers harvested from Fosterfolio. **`npm run scaffold` does not copy this folder.**

Kernel already ships `button`, `input`, `card`, `badge`, `alert`, `label`, and `separator`. This bundle adds **dialog, dropdown-menu, sheet, textarea, tooltip** only.

## Apply

1. Copy `files/` onto the spawn (or template) repo root so paths match (`apps/web/client/...`).
2. Do **not** copy Fosterfolio `AppHeader.tsx`. Pass your own header into `AppShell` via the `header` prop. `active` is `"home" | "profile" | string` — feed/search are optional spawn nav items, not required.
3. If you already have any of the extra `components/ui/*` files, merge instead of overwrite.
4. Install markdown deps **in the spawn** `@lattice/web` package (not in the template kernel unless you intend to use Markdown day one):

   ```bash
   npm install react-markdown@^9 remark-breaks@^4 --workspace=@lattice/web
   ```

5. `DataPageSkeleton` variants: `profile`, `detail-with-sidebar` (was Fosterfolio `pet`), `editor`, `list`.
6. Wire `AppShell` in your root layout or page wrappers. `PageWithSidebar` needs `dialog` from this bundle and kernel `button`.

## Contents

| Path | Notes |
|------|--------|
| `apps/web/client/components/ui/dialog.tsx` | Default `max-w-2xl` |
| `apps/web/client/components/ui/dropdown-menu.tsx` | |
| `apps/web/client/components/ui/sheet.tsx` | Uses kernel `Button` |
| `apps/web/client/components/ui/textarea.tsx` | |
| `apps/web/client/components/ui/tooltip.tsx` | |
| `apps/web/client/components/layout/*` | `AppShell`, `PageWithSidebar`, `DataPageSkeleton`, sidebar panel context + barrel |
| `apps/web/client/components/markdown/*` | Needs `react-markdown` + `remark-breaks` |
| `apps/web/client/components/BioPreview.tsx` | Uses markdown + `lib/bioPreview` |
| `apps/web/client/components/OutboundLink.tsx` | `rel="noopener noreferrer"` |
| `apps/web/client/components/UserAvatar.tsx` | Uses `lib/displayInitials` |
| `apps/web/client/lib/displayInitials.ts` | |
| `apps/web/client/lib/bioPreview.ts` | |

`@base-ui/react` and `lucide-react` are already kernel deps.
