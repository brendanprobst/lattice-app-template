---
name: stage-chunk
description: >-
  Splits a git diff into commit chunks, then stages them one at a time
  (manual, the default) or commits each chunk without pushing (auto). Use
  when the user invokes /stage-chunk, with or without a chunking request
  such as separating infra, api, and web changes, and with or without auto
  or manual.
disable-model-invocation: true
---

# Stage chunk

Split a diff into commit chunks, then land them one chunk at a time. Never push. Never edit file contents. Never skip git hooks.

## Mode

Default **manual**. Use **auto** only when the user says auto.

- **manual** — stage the chunk, then wait. The user writes the message and commits. Stage the next chunk only after they say "next".
- **auto** — commit each chunk with a message. Do not push.

## 1. Confirm the repo and branch

If the user already named both the repository and the branch, that pair is confirmed. Continue in the same turn.

Otherwise stop after this step. Report one best guess and wait.

Pick the guess in this order:

1. The git repo for the file the user has open, if it has a diff.
2. Otherwise the only workspace repo with a diff.
3. Otherwise the current workspace repo and its checked-out branch.

The diff is uncommitted work on that branch (staged, unstaged, and untracked files that belong to the change). If the tree is clean, use commits on the branch that are not in the default branch (`main` or `master`): `git diff --shortstat <default>...HEAD` and `git diff --name-only <default>...HEAD`. A clean tree has nothing to stage or commit; report the plan only.

Count changed files and lines changed (insertions plus deletions). Include untracked files in both counts.

Reply with only the guess, in this shape:

**Best guess:** `<repo>` on `<branch>` — `<N>` files, `<N>` lines changed. Mode: manual.

Confirm this repo and branch, or name different ones.

Do not validate a chunking request, propose chunks, stage, or commit until the repo and branch are confirmed.

## 2. After the repo and branch are confirmed

Read the diff with git. Open a file only when its path does not show which chunk it belongs to.

### The user sent chunking text with the skill

Judge that request against the diff.

Lead with one sentence, using these words:

- **that's doable** — every named chunk maps to at least one file, no file belongs in two chunks, and the chunks cover the diff.
- **the request is ambiguous** — a name matches no files, two chunks would claim the same file, or a file fits none of the named chunks and you would have to guess where it goes.

Then list the chunks. For a doable request, one line per chunk: chunk name, file count, and the paths. For an ambiguous request, name the files or words that do not fit. Do not invent a different split. Do not stage or commit an ambiguous request.

### No chunking text

Report the plan for how the diff will be chunked for commit. One line per chunk, in commit order:

- **Chunk name** — file count, lines changed, and the paths.

Split by concern that can land as its own commit. In this monorepo that is usually infra, api (`apps/api`, `test/api`), web (`apps/web`, `test/web`), packages, supabase, then docs and agent config. Keep a behavior and its tests in the same chunk. Merge areas that share one concern. Leave a single chunk when the diff is already one concern.

Do not restate hunks.

## 3. Land the chunks

Run this only for a doable request or for the plan from step 2. Start with the first chunk.

### Manual

Stage only that chunk's paths. Leave every other change unstaged. Show the staged paths, then stop.

The user reviews, describes the change, and commits. Do not commit.

When they say "next", if that chunk's paths are still uncommitted, do not stage the following chunk. Otherwise stage the next chunk the same way and stop again. After the last chunk is committed, say the diff is fully chunked.

### Auto

Commit the chunks in order. For each one, stage only that chunk's paths, then commit. Before the first commit, read `git status`, `git diff`, and `git log` so the message matches the repo. One or two sentences on why. Do not commit secrets (`.env`, credentials). Do not push. When every chunk is committed, report the new commits.
