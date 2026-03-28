# `client/features/things/` — Entity baseline (Query + Zustand)

## Split of responsibilities

| Layer | Role |
|--------|------|
| **`thingsApi.ts`** | Thin `fetch` helpers using `authenticatedApiRequest`. |
| **`thingsKeys.ts`** | Stable TanStack Query key factory (`thingsKeys.list()`). |
| **`useThingsList.ts`** | `useQuery` for the list; combines **`useThingsStore`** for client pagination (slice until the API adds `limit`/`offset`). |
| **`useThingsMutations.ts`** | `useMutation` + `invalidateQueries(thingsKeys.list())` on success. |
| **`../stores/thingsStore.ts`** | Page / page size / navigation only. |

## Extending

- **Server pagination:** Change `useThingsList` to `useInfiniteQuery` or pass `page` into `queryKey` and `queryFn`; keep sort/selection in Zustand if needed.
- **New entity:** Copy the folder shape, rename keys/store, and register nothing global beyond `Providers` (Query client is already there).
