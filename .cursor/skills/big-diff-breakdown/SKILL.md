---
name: big-diff-breakdown
description: >-
  Breaks a large working tree into reviewed, commit-sized chunks. Stages one
  chunk at a time, writes a strict review report for each, and hands fixes
  off as prompts for other agents. The user makes every commit. Use when the
  user invokes /big-diff-breakdown, or wants a big uncommitted diff (often
  from parallel agents) split, scrutinized, and landed safely.
disable-model-invocation: true
---

# Big diff breakdown

You chunk, stage, and review. You do not implement, and you do not commit. The user has the final say on every commit. Your job is to make review and fixing fast.

## Rules (defaults)

- **No fixes in this chat.** Each problem goes out as a hand-off prompt (see below), which keeps this context clean.
- **Only the user commits and pushes.** You stage. Subagents and hand-off agents never stage, commit, or push.
- **Rule-break check.** If the user asks for something that breaks a rule here, reply with one line, such as "Breaks skill rule (no fixes here). Proceed?". If they confirm, do it. Don't lecture or refuse. When a rule is waived for committing, commit only file sets you've tested, and re-check `HEAD` and the index right before each commit.
- **Check reality, not memory.** Before stating what's staged, committed, or pushed, run `git fetch`, `git status -sb`, and `git log origin/<branch>..HEAD`.

## 1. Start clean

1. Run `git fetch`, `git status -uall`, and `git diff --cached --stat`.
2. **If anything is already staged, don't inherit it.** Ask the user to unstage it, or unstage it yourself if they agree, and build the chunk plan yourself.
3. Report the branch, file count, lines changed, and how far it is ahead of or behind the remote.

## 2. Plan the chunks

- Split by concern, in an order that can actually land:
  - **Dependencies first.** If file X imports a new module Y, Y's chunk lands first (`grep` the imports).
  - **Generated output last.** It comes after every source it's generated from.
  - **Tests go with their code.**
- **Split mixed files by hunk.** If one file holds two concerns, stage only one chunk's lines:
  - build the blob from `git show HEAD:<file>`, apply the chunk's edits, then `git hash-object -w --stdin` and `git update-index --cacheinfo 100644,<sha>,<file>`;
  - or use `git apply --cached` on the selected hunks.
- **Check the plan covers everything.** Every changed path belongs to exactly one chunk; diff the sorted lists.
- Keep two numbering schemes and never mix them: **chunks** (1, 2, 3…) and **hand-offs** (H1, H2…).
- Show the plan as a table: chunk, files, and what it depends on.

## 3. Stage one chunk and check it works alone

1. Stage only that chunk.
2. Export the index by itself: `git checkout-index -a --prefix=<scratch>/`. Run the project's tests there.
3. **For generated output:** regenerate in the export with the *committed* generator, and compare every staged file with `--diff-filter=AMR`. Generated files often show up as renames.
4. **To check several chunks in order before any are committed:** use a temporary index (`GIT_INDEX_FILE=<tmp> git read-tree HEAD`, add each chunk's files, export, test). The user's real index is never touched.
5. Then stop and report.

## 4. Report each chunk

Use this structure every time:

1. **TL;DR:** one paragraph, longer than a commit message. What changed, why, file and line counts, and the test result on the chunk alone.
2. **Critical snippets:** `file:line` plus a short code excerpt for each thing worth extra attention, with its severity:
   - 🔴 real bug or security issue;
   - 🟡 should fix;
   - ⚪ minor.
3. **Review**, through four lenses:
   - **Code quality:** correctness, dead code, tests.
   - **Security posture:** secrets, permissions, what an agent or attacker could reach.
   - **Project principles:** read the repo's `CLAUDE.md` / `AGENTS.md`. In Lattice that's kernel / capability / catalog and the two-app bar.
   - **LLM-workflow scalability:** would an agent misread, duplicate, or silently break this? Watch for docs that disagree with code, duplicated rules, and silent no-ops.
4. **Design trade-offs:** when a fix involves a real choice, sketch the code, say where the decision changes it, and recommend one option.
5. **Triage:** findings in priority order.
6. **Hand-off prompts** for the fixes (format below).
7. **Commit message**, matching the repo's log style, plus how to commit safely. Use plain `git commit`, never `-a` or paths, when other agents' edits are unstaged on top.
8. **Push readiness**, answered from the remote's real state, including any dependency between commits ("push X only together with Y").

Then wait. Don't stage the next chunk until the user has committed this one and says "next".

## 5. Hand-off prompts

One per fix, or per group of fixes that touch the same files:

```markdown
> **H<n>. <title>**
> **You are the planner and the implementer. Start now; don't ask for approval.**
>
> <2–3 paragraph problem statement: what's wrong, where (file:line), why it matters>
>
> *Hint:* <short direction, not a spec>
>
> **Working alongside other agents:** other agents are editing this working tree at the same time.
> - Expect to touch: `<files>`.
> - Shared with H<m>: `<file>`. Make targeted edits there; never rewrite the whole file.
> - Don't revert, reformat, stage, or commit anything. The reviewer owns the index.
> - Finish by listing every file you changed and the tests you ran.
```

- Write hand-offs only against **committed** code.
- If a deny rule will block the fix (for example, editing settings), tell the agent to report the exact change for a person to apply, not to work around the rule.

## 6. Side agents (only when the user OKs a batch)

- **Use fresh agents, not forks,** so context stays clean. Give each one exactly the hand-off prompt.
- **Isolate each one** with `isolation: "worktree"`. Set `worktree.baseRef: "head"` in `.claude/settings.json` so worktrees start from local commits, not `origin/main`.
- **Make sure worktrees can't leak:** `.claude/worktrees/` must be gitignored *and* excluded by any copy or scaffold script.
- **Group hand-offs by file,** so no two agents share one.
- **When an agent reports back, check the worktree yourself before trusting the report:**
  - 0 commits beyond the base, and an empty index;
  - only the expected files changed;
  - the diff matches what the agent reported.
- **Bring the work back unstaged:** `git -C <worktree> diff`, then `git -C <main> apply`. Review it as a new chunk.
- **Afterwards:** offer to remove the worktree and its branch. Use `SendMessage` only for corrections while an agent is running.

## 7. Commits made by others, and pausing

- **Before anything is pushed, review commits made by other agents.** Check that the commit message matches the code (`git show --stat`).
- **Before a push you've been told to do:** scan the outgoing diff for secrets (keys, tokens, DB URLs with passwords, real `.env` files).
- **When the user pauses:** save a short resume note in project memory. List what's committed, staged, and open, plus the next steps in order.
