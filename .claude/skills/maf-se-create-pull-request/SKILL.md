---
name: maf-se-create-pull-request
description: 'Use when asked to open, raise, or create a pull request for the current branch with the gh CLI. Covers filling the repo PR template, matching the project title convention, and returning the PR URL. Trigger phrases: "create the PR", "open a pull request", "raise a PR for this branch".'
model: sonnet
---

# Create Pull Request

Output: the created PR's GitHub URL, on its own line. Nothing else needs narrating.

## Overview

Open a pull request for the current branch using `gh`, with a title that matches the project's convention and a body filled from the repo's PR template. The end product is the PR URL.

## When to Use

- The user asks to open / raise / create a PR for the current branch.
- `gh` is installed and authenticated (`gh auth status`).

Not for: pushing commits (that's plain git); editing an existing PR (`gh pr edit`); merging (never merge unless explicitly asked).

## Workflow

### 1. Preflight — is there anything to PR?

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'); BASE=${BASE:-main}
git log --oneline origin/$BASE..HEAD    # commits this PR would introduce
git diff --stat origin/$BASE...HEAD     # files it touches
```

Empty commit range → stop and say so; there is nothing to open a PR for. Then make sure the branch is pushed and tracked:

```bash
git push -u origin HEAD
```

### 2. Title — match the project convention

Do not assume a format. Detect it, strongest signal first:

1. **CI enforcement (the pipeline).** Look in `.github/workflows/` for a PR-title check (`amannn/action-semantic-pull-request`, a title regex, `commitlint`), and for `commitlint.config.*` / `.commitlintrc*`. If one enforces a format, obey it exactly (usually Conventional Commits: `type(scope): summary`).
2. **Docs.** `CONTRIBUTING.md` / PR template comments may state a title rule.
3. **Precedent.** `gh pr list --state merged --limit 20 --json title -q '.[].title'` and `git log origin/$BASE --oneline -20`.

If nothing enforces or documents a convention, write a short imperative summary (≤ ~70 chars). Only add a `type:` prefix if the repo's own history uses one — never invent a convention the repo doesn't follow.

### 3. Body — fill the repo template

Find the template: `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, or `.github/PULL_REQUEST_TEMPLATE/*.md`.

- **Template exists** → copy it and fill **every** section against the real diff (from step 1). No blank fields, no leftover `<!-- placeholder -->` prompts — the template's own instructions usually say incomplete PRs are returned unreviewed. Tick only checklist boxes you have actually verified.
- **No template** → write What / Why (link the ticket) / Blast radius / How verified.

Write the body to a file so multi-line markdown survives the shell:

```bash
gh pr create --base "$BASE" --head "$(git branch --show-current)" \
  --title "<title from step 2>" --body-file /tmp/pr-body.md
```

`gh pr create` echoes the PR URL on success — capture it from the output. If not captured, retrieve it with `gh pr view --json url -q .url`.

Add `--draft` if the change isn't ready for review (the safe default for work in progress). Never use `--fill` (bypasses the template) or `--web` (there's no browser here).

## Common Mistakes

- **`gh pr create --fill`.** Generates the body from commit messages and skips the template entirely. Always `--body-file`.
- **Placeholder body.** Unfilled template sections get the PR bounced before review. Fill or delete every prompt.
- **No commits / unpushed branch.** `gh pr create` errors on an empty range; run the step-1 preflight first.
- **Guessing the title format.** Detect it (step 2); don't bolt on a `feat:` prefix a repo that doesn't use one.
- **Not returning the URL.** The URL is the deliverable — always end with it.
