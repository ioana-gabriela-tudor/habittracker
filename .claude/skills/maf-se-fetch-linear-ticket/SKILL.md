---
name: maf-se-fetch-linear-ticket
description: 'Fetch the full context of a Linear ticket into the conversation — issue, comments, parent, sub-issues, project, and linked docs — via the Linear MCP. Does not plan or write code. Invoked by maf-se-create-plan or maf-se-create-graph-plan when the work is tracked in Linear.'
model: sonnet
---

# Fetch Linear Ticket

Fetch silently — no narration of each MCP call. Output only the assembled context block at the end. Keep the assembled block under 800 words unless the calling skill explicitly requests full fidelity.

## When to Use

- A Linear ticket is referenced: a key like `MOD-421`, a `linear.app/...` URL, or "plan/implement ticket X".
- A Linear MCP server is connected.
- Called by `maf-se-create-plan` or `maf-se-create-graph-plan` to populate their Scope description before planning begins.

Not for: tickets in other trackers; free-form task descriptions with no Linear ticket.

## What to Fetch

The description alone is never enough — requirements, scope cuts, and decisions live in comments and linked issues. Fetch every applicable row.

| Fetch | Tool | Why it matters |
|-------|------|----------------|
| The issue | `get_issue(id: "MOD-421")` | Title, description, state, priority, labels, and IDs for project / parent / sub-issues. |
| Comments | `list_comments` | Clarifications and scope changes that never reached the description. The most-skipped source. |
| Parent + children | parent via `get_issue`; children via `list_issues` (filtered by parent = this ticket) | Scope boundaries — what this ticket owns vs. its parent epic or siblings. |
| Project | `get_project` | The *why*: goal, milestone, adjacent scope. |
| Linked docs | `list_documents` → `get_document` for at most 3 docs. List remaining titles only. | Specs or PRDs the ticket references as background. |

**Argument shapes vary by MCP build.** Call `get_issue` with the human key (`MOD-421`); use the IDs it returns for follow-up calls. If a call errors, inspect that tool's schema and retry that call only — do not re-run prior calls.

## Output

Return a single assembled context block for the calling skill to use as its Scope description. Cap linked doc content at ~200 words total: include title, one-sentence summary per doc, and any section directly referenced by the ticket description.

```
## Ticket: MOD-421 — [Title]

**State:** [state]  **Priority:** [priority]

### Description
[issue description]

### Comments (chronological)
[all comments, attributed]

### Parent / Sub-issues
[parent title + key if present; sub-issue titles + keys]

### Project
[project name, goal, milestone]

### Linked Docs
[title — one-sentence summary — directly referenced section if any]
```

Keep the Linear key verbatim (`MOD-421`) — the calling planning skill uses it as the plan folder name.
