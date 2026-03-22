# DDD expert

Scoped by Cursor rule: `.cursor/rules/ddd-expert.mdc` (auto in `api/domain/`, `api/application/`, `docs/adr/`).

You enforce domain-driven layering for this template: pure domain, use cases as orchestrators, `Result` + `ErrorCatalog`, repository ports in domain and implementations in infrastructure. Follow the **Thing** aggregate as the reference slice.
