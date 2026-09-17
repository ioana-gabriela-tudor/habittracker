---
name: maf-se-fetch-jira-ticket
description: 'Fetch the full context of a Jira issue into the conversation — issue, comments, subtasks, parent epic, and linked issues — via the Jira MCP. Does not plan or write code. Invoked by maf-se-create-plan or maf-se-create-graph-plan when the work is tracked in Jira.'
model: sonnet
---

# Fetch Jira Ticket

Fetch silently — no narration of each MCP call. Output only the assembled context block at the end. Keep the assembled block under 800 words unless the calling skill explicitly requests full fidelity.

## When to Use

- A Jira issue is referenced: a key like `MOD-421`, a Jira URL, or "plan/implement ticket X".
- A Jira MCP server is connected.
- Called by `maf-se-create-plan` or `maf-se-create-graph-plan` to populate their Scope description before planning begins.

Not for: tickets in other trackers; free-form task descriptions with no Jira issue.

## What to Fetch

The description alone is never enough — requirements, scope cuts, and decisions live in comments and linked issues. Fetch every applicable row.

| Fetch | Tool | Why it matters |
|-------|------|----------------|
| The issue | `getJiraIssue(issueKey: "MOD-421")` | Summary, description, status, priority, labels, assignee, and IDs for epic / parent / subtasks. |
| Comments | Included in `getJiraIssue` response (`comments` field) | Clarifications and scope changes that never reached the description. The most-skipped source. |
| Parent / Epic | `getJiraIssue` on the parent or epic link key | Scope boundaries — what this ticket owns vs. its epic or parent story. |
| Subtasks | Use summaries + keys from parent response. Fetch full detail via `getJiraIssue` only if a subtask is in-progress and its description is absent. Cap full fetches at 5; note total count. | Child work that is part of this ticket's scope. |
| Linked issues | Fetch full detail via `getJiraIssue` for `blocks` / `is blocked by` relationships only. Use summaries from the `issuelinks` field for all other types. Cap full fetches at 5; note total count. | Blockers and dependencies that constrain implementation. |

**Argument shapes vary by MCP build.** Call `getJiraIssue` with the human key (`MOD-421`); use the keys it returns for follow-up calls. If a call errors, inspect that tool's schema and retry that call only — do not re-run prior calls.

## Output

Return a single assembled context block for the calling skill to use as its Scope description. Truncate individual comments to 200 words. If more than 5 linked issues exist, list the first 5 and note the total count.

```
## Ticket: MOD-421 — [Summary]

**Status:** [status]  **Priority:** [priority]  **Assignee:** [assignee]

### Description
[issue description]

### Comments (chronological, each ≤200 words)
[all comments, attributed]

### Parent / Epic
[epic or parent summary + key if present]

### Subtasks
[subtask summaries + keys]

### Linked Issues
[linked issue summaries + keys + link type (blocks, is blocked by, relates to) — full detail for blockers; summary only for others]
```

Keep the Jira key verbatim (`MOD-421`) — the calling planning skill uses it as the plan folder name.
