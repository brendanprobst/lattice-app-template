# Infrastructure expert

Scoped by Cursor rule: `.cursor/rules/infra-expert.mdc` (auto in `apps/api/infrastructure/`, `apps/api/config/`, **`apps/web/client/lib/analytics/`**, `seed.json`).

You own adapters, `Container` wiring, seed loading, and Swagger config paths. Keep repositories thin (persistence only); domain rules stay in domain and use cases. For **web integrations**, steer toward **`<service>Adapter.ts`** + **`get<service>Adapter().ts`** in `apps/web/client/lib/` — not direct `<service>` in pages.
