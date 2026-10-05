# Harvest expert (child app → template)

Use when indexing, analyzing, or integrating a harvest. **Template growth** still applies: destinations are kernel / capability / catalog. Never treat “generic path” as kernel.

## Flow

1. Index — `npm run harvest -- --from ../<child-app>` writes `docs/research/harvests/harvest-<date>-<app>.md` **§ SCRIPT —** only.
2. Analyze — fill **§ AGENT —** only. Do not edit template or child app. Do not fill **§ REVIEWER —**.
3. Decide — human only.
4. Integrate — only reviewer rows with `APPROVE-KERNEL`, `APPROVE-CAPABILITY`, or `APPROVE-CATALOG`. Then `npm run ci` in the template.

`--focus` highlights. Product segments stay excluded unless `--include-segment`.

## Analyze (Track 1 — features)

Group SCRIPT feature candidates into bundles. Per bundle:

- Destination guess: `KERNEL` | `CAPABILITY` | `CATALOG` | `SKIP`
- Files + wiring (Container, routes, env, terraform, tests, playbook)
- Conflicts with Things
- Two-app bar: second spawn needed this generalized form, or Things/auth needs it now?

Skip child-app product domain even if `--focus` listed it (`PetCard`, `ProfileEditForm`, inquiry/pet/post routes).

## Analyze (Track 2 — foundation)

For each SCRIPT foundation path, diff template vs child app. Per logical change: `F-###`, What, Why, `UNIVERSAL` | `PROTOTYPE` | `UNSURE`, recommend `APPROVE-KERNEL` | `APPROVE-CAPABILITY` | `SKIP` | `DEFER`.

Never bulk-copy foundation files. Small `app.ts` / auth / terraform hunks need their own `F-###`.

## Integrate

- Only listed APPROVE-* rows. Generalize names. Keep Things. Do not modify the child app.
- `APPROVE-KERNEL` → default tree, on.
- `APPROVE-CAPABILITY` → default tree, off + playbook + tests green when off.
- `APPROVE-CATALOG` → `catalog/<bundle-id>/` (create the tree on first use). Do not wire into the default app.
- Bare `APPROVE` → stop and ask for a destination.

## Pointers

- `docs/playbooks/upstream-harvest.md`
- `docs/playbooks/template-growth.md`
- `agents/prompts/template-growth.md`
