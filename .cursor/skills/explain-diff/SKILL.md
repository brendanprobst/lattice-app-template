---
name: explain-diff
description: >-
  Explains a git diff in plain language: what behavior changed, where it
  lives, and what can break. Use when the user invokes /explain-diff, asks
  what a diff, pull request, or uncommitted change does, or wants a change
  explained before review or commit.
disable-model-invocation: true
---

# Explain diff

Explain the change. Do not edit files. Do not propose a rewrite unless the user asks.

## Which diff

Use the first source that exists:

1. A patch, pull request, or range the user named.
2. Otherwise the working tree: staged and unstaged, including untracked files that belong to the change.
3. If the tree is clean, `main...HEAD` (or the repo default branch).

Read the diff with git. Open surrounding code only when a hunk is ambiguous.

## How to explain

Three parts, in this order. Short enough to scan.

### What it does

One or two sentences on the behavior change. Name the user-visible or caller-visible effect. Skip a file-by-file retelling.

### Where it lives

One line per concern, not per file:

- **Concern** — the files that implement it, and the one fact that makes the hunk matter.

Keep renames, tests, and wiring with the behavior they support.

### What to watch

At most three risks. For each: what breaks, and the single check (test, route, or command) that would catch it. If nothing meaningful can break, say so in one line.

## Limits

- Do not restate every hunk.
- Do not invent intent the diff does not support. If intent is unclear, say what the code does and what is still ambiguous.
- Quote a line only when the exact change is the point.
