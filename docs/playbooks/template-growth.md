# Template growth (kernel / capability / catalog)

Lattice stays a **clone-and-go** stencil. Harvest is how the platform grows; it is not a license to dump every reusable file into `apps/`.

**Agents:** this policy is always-on in [`agents/prompts/template-growth.md`](../../agents/prompts/template-growth.md). Harvest sessions also load [`agents/prompts/harvest-expert.md`](../../agents/prompts/harvest-expert.md). Operational steps: [Upstream harvest](upstream-harvest.md).

## Destinations

| Destination | Scaffold copies it? | Default | Examples |
|-------------|---------------------|---------|----------|
| **Kernel** | Yes | On | Auth, Things, Container, deploy, CI |
| **Capability** | Yes | **Off** | Email allowlist, PostHog |
| **Catalog** | **No** (until opt-in) | n/a | Extra UI, profile primitives used by one app |

Capabilities need a playbook, an off-switch, and tests that pass while off. Keep that set small.

Catalog lives under `catalog/<bundle-id>/` after the first `APPROVE-CATALOG`. Do not add an empty `catalog/` “for later.”

## Harvest bar

- `--focus` is a search aid, not an include list.
- Product path segments stay in the child app.
- Prefer **two child apps** (same generalized form) before kernel/capability. Otherwise catalog, skip, or defer.
- Reviewer verdicts: `APPROVE-KERNEL` | `APPROVE-CAPABILITY` | `APPROVE-CATALOG` | `SKIP` | `DEFER`.
