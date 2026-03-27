# `docs/` — Documentation

## Contents

- **`adr/`** — Architecture Decision Records numbered `NNN-title.md`; see `adr/README.md` for the index.
- **`research/`** — Exploratory notes (not ADRs), e.g. [Supabase access patterns](research/supabase-access-patterns.md) (client SDK vs API vs ORM) and the canonical [security-first Supabase Auth default](research/supabase-auth-security-first.md) for API/client separation.

## For agents

Read ADRs when changing layering, `Result` usage, repositories, use case shape, **persistence adapters**, or **deployment / full-stack** layout. Keep ADRs accurate when you make deliberate architectural changes; see [ADR-006](adr/006-full-stack-and-deployment.md) for hosting/Terraform decisions and [ADR-007](adr/007-ci-and-environment-promotion.md) for CI/deployment promotion policy. Use **`research/`** for onboarding tradeoffs that do not yet rise to a recorded ADR.
