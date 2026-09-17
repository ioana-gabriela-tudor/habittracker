---
name: maf-se-run-graph-plan
description: 'Invoke to execute a graph plan produced by maf-se-create-graph-plan. Validates the plan folder, checks the codebase is in a clean state, confirms the execution summary with the user, then spawns the maf-se-orchestrator agent to run the DAG.'
model: sonnet
---

# Run Plan

Emit nothing between steps except the confirmation summary in Step 2. In Step 4, relay the orchestrator's report verbatim — do not summarize, paraphrase, or add headers.

## Inputs

- **Plan key** — the key used when the plan was created (e.g. `MOD-421` or `auth-flow`). The plan folder is `.plans/plan-<key>/`.
- **CLAUDE.md** at repo root.

## Workflow

### Step 1 — Validate

1. Confirm `.plans/plan-<key>/plan.md` exists and is readable. Missing or malformed → stop and tell the user.
2. Read `plan.md` and all chunk files fully.
3. Validate the DAG: every `Depends On` resolves to a real chunk; no cycles; levels are consistent.
4. Confirm `.claude/settings.json` sets `"worktree": { "baseRef": "head" }`. Without it, builder worktrees branch from the repo default instead of this plan's approved state. Missing → stop and tell the user to add it before continuing.
5. Check codebase: git is clean, build passes. Run a fast smoke test (e.g. `npm test -- --testPathPattern=none` or equivalent) to confirm the test runner executes without error. Run the full test suite only if the plan's scope touches shared utilities or global state; otherwise skip it and note that CI will catch regressions. Any failure → stop and surface it.

### Step 2 — Confirm with the user

Present the execution summary and wait for explicit approval:

```
Plan: [name] — [N] chunks, [M] levels, [T] total tasks
Level 0 (parallel): [chunk names]
...
Codebase: build ✅  tests ✅  git clean ✅
Proceed? [y/n]
```

Do not continue until the user confirms.

### Step 3 — Spawn maf-se-orchestrator

Pass the plan folder path (`.plans/plan-<key>/`) to the `maf-se-orchestrator` agent. Wait for it to report back.

### Step 4 — Report

Relay the orchestrator's completion report verbatim. If the orchestrator escalated a failure mid-run, surface the escalation and options, wait for the user's decision, then signal the running orchestrator to continue or instruct it to abort. Do not spawn a new orchestrator to resume.
