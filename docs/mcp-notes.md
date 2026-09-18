# MCP Usage Notes

## Server used

GitHub MCP server (`@modelcontextprotocol/server-github`).

## Task

Opened a pull request for the habit tracker implementation (T1–T6) against a
minimal base branch, so the work could be reviewed on GitHub:

- Verified the target repo (`ioana-gabriela-tudor/habittracker`) and its state
  (empty, no branches) via `get_file_contents` / `list_commits`.
- Created `main` as a base branch pointing at the repo's actual root commit
  (`aa9925d`, ancestor of the feature branch — GitHub rejects PRs between
  branches with no common history).
- Opened the PR with `create_pull_request` (`feature/habit-tracker` → `main`),
  including a structured summary and test plan in the body.
- Along the way, used `list_pull_requests` and `get_file_contents` as read-side
  checks to isolate a token-permission problem (the PAT initially had
  Pull-requests: Read-only) from an actual application error.

The local commits themselves were pushed with plain `git push` (a deliberate
choice — MCP's `push_files` re-uploads file content as new commits, which
would have flattened 6 meaningful per-task commits into one and risked manual
transcription errors on a 110KB `package-lock.json`). MCP was used for the
parts of this task that are inherently server-side operations.

## Why this is a meaningful use of MCP, not an incidental one

Opening a pull request is a **server-side operation on GitHub's data** — it
doesn't exist as a local file or git ref, only as an object the GitHub API
creates. There is no way to produce a real, reviewable PR without talking to
GitHub's API in some form.

Without MCP, the equivalent would have been: install/authenticate the `gh`
CLI (which wasn't available in this environment), or hand-craft raw
`curl`/REST calls to the GitHub API, manually handling auth headers, JSON
payloads, and error responses. The MCP server replaced that with typed,
discoverable tool calls (`create_branch`, `push_files`, `create_pull_request`,
`list_pull_requests`, etc.), which also made it fast to diagnose *why* PR
creation was failing — a couple of quick read-only calls (`list_pull_requests`,
`get_file_contents`) confirmed the token could authenticate and read fine,
narrowing the fault straight to the token's write scope on the Pull Requests
permission, rather than guessing at network/auth/repo-state issues blindly.

This wasn't a case where MCP was reached for out of habit for something a
shell command could do just as well — creating and inspecting GitHub-hosted
objects (branches, PRs) is exactly the class of task MCP tooling exists for.

---

## Session 2: reviewing and addressing feedback on that PR

## Server used

GitHub MCP server, again — this time the review/comment surface rather than
the branch/PR-creation surface (`get_pull_request`, `get_pull_request_files`,
`create_pull_request_review`, `get_pull_request_comments`).

## Task

- Reviewed PR #1 by pulling its metadata and changed-file list via
  `get_pull_request` / `get_pull_request_files`, cross-checked against the
  actual diff (`git diff origin/main...master`) to confirm they matched, then
  posted the findings as a real review with two inline, line-anchored
  comments via `create_pull_request_review` (a timezone bug in `dates.ts`
  and a client-build drift risk in `public/*.js`).
- After fixing both issues locally and pushing the fix commit, posted a
  second `create_pull_request_review` reply, again inline at the same two
  lines, pointing at the fix commit and summarizing what changed.
- Tried to also flip each thread to GitHub's "Resolved" state. That turned
  out to be out of reach: thread resolution is a GraphQL-only mutation
  (`resolveReviewThread`) that neither this GitHub MCP server nor `gh` CLI
  (not installed in this environment) exposes. Confirmed this by searching
  the available MCP tools before giving up on it, rather than assuming.

## Why this is a meaningful use of MCP, not an incidental one

Posting a *review* — as opposed to a plain issue comment — is a distinct
GitHub object type (`pulls/{n}/reviews`) with its own semantics: it groups
inline comments under one reviewer action (COMMENT/APPROVE/REQUEST_CHANGES)
and anchors each comment to a specific file+line in a specific diff, which is
what makes them show up as normal PR review comments instead of a wall of
text in the conversation tab. `add_issue_comment` (a plain comment) could not
have produced that.

Without MCP, the equivalent would have been raw REST calls to
`POST /repos/{owner}/{repo}/pulls/{n}/reviews` with a hand-built JSON body
(commit SHA, per-comment `path`/`line`/`body`), or installing and
authenticating `gh` CLI first — neither of which was necessary here. The MCP
tool call replaced that with one typed call per review.

Just as importantly, MCP was also the thing that made the *limitation*
legible: instead of assuming resolution was possible and silently faking it
(e.g. just saying "resolved" in prose), I could search the actual tool
surface, see there was no resolve/GraphQL tool, and report that honestly to
the user with the reasoning — that's a check that's only possible because
the available operations are enumerable, typed tool calls rather than an
opaque `gh` invocation whose full capability surface isn't visible upfront.
