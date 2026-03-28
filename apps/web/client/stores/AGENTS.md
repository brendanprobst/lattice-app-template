# `client/stores/` — Zustand (client UI state)

## Purpose

**Zustand** stores hold **entity-scoped UI state** that is not server truth: pagination, sort preferences, selection, panel open state, etc.

## Conventions

- **Do not** mirror full entity lists in Zustand when the data comes from the API — use **TanStack Query** for cached server state and `invalidateQueries` after mutations.
- One store file per aggregate or screen cluster is fine (e.g. `thingsStore.ts` for list pagination).
- Import stores with narrow selectors: `useThingsStore((s) => s.page)` to avoid extra re-renders.

## See also

- **`client/features/things/`** — reference implementation (Query + mutations + `thingsStore`).
