---
paths:
  - "seed.json"
---
# Infrastructure expert (this repo)

- **Repositories**: implement interfaces from `apps/api/domain/repositories/` only; no domain rules that belong in entities/use cases — persistence mapping and I/O only.
- **Container** (`apps/api/infrastructure/container.ts`): explicit getters for each port and use case factory; no hidden globals.
- **Seed** (`apps/api/infrastructure/seed.ts`, root `seed.json`): optional bootstrap for in-memory/demo; production paths will swap adapters here later — keep seed shape documented in code comments if non-obvious.
- **Config** (`apps/api/config/`): Swagger assembly and env-driven OpenAPI metadata; add new decorator paths to `config/swagger/index.ts` when you add route JSDoc files.
- Do not import Express or HTTP framework types into repositories.
- **Web analytics:** vendor SDKs (`posthog-js`, etc.) stay behind **`AnalyticsAdapter`** in **`apps/web/client/lib/analytics/`** — same "port + implementation" idea as API adapters, separate from **`Container`** (browser has no DI container; use **`getAnalyticsAdapter()`**).
- **Remote SQL:** **Agents never apply SQL to a remote database.** Do not pass `--approve-sql`. Do not run `psql`, `supabase db push`, `supabase db reset`, or the Supabase Management API against a remote project, and do not edit `lattice.applied_sql`. If SQL needs applying, stop and tell the user to run `npm run deploy:aws -- --env <env>` themselves (in Claude Code: `! npm run deploy:aws -- --env dev`). A refusal from the SQL confirm is the expected result for an agent, not an error to work around.
