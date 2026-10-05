# Harvest reports

One markdown file per `npm run harvest` run. These live **in this template**, not in the sibling `cursor/` plans repo.

## Naming

`harvest-<YYYY-MM-DD>-<child-app>.md`

## After you run the script

```bash
cd lattice-app-template
npm run harvest -- --from ../fosterfolio --focus profile,styling,components
```

Open the file this printed under `docs/research/harvests/`.

| Section | What to do |
|---------|------------|
| § SCRIPT — * | **Read** — inventory only; already complete |
| § AGENT — * | **Next:** Cursor Agent fills these ([playbook step 2](../../playbooks/upstream-harvest.md#step-2--analyze-cursor-agent--do-this-next)) |
| § REVIEWER — | **After agent:** you mark `APPROVE-KERNEL` / `APPROVE-CAPABILITY` / `APPROVE-CATALOG` / `SKIP` / `DEFER` ([template growth](../../playbooks/template-growth.md)) |

Full walkthrough: [`docs/playbooks/upstream-harvest.md`](../../playbooks/upstream-harvest.md)
