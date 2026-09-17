---
name: maf-se-address-pull-request-feedback
description: 'Use when asked to address, respond to, or act on review feedback on a pull request — apply requested changes, reply to reviewers, resolve threads. Trigger phrases: "address the review comments", "handle PR feedback", "the reviewer asked for changes", "respond to the review".'
model: sonnet
---

# Address PR Feedback

No preamble or narration between steps. Output only: the triage checklist, commit messages, API call outputs, and the final summary comment. Triage: one line per thread. Summary comment: two sections only — what changed (bullets) and open items (bullets).

## Overview

Act on every piece of review feedback on a PR, then make it visible that you did. The trap that defeats this: **`gh pr view --comments` does NOT show inline (line-anchored) review comments** — only the conversation and review summaries. Rely on it and you silently miss most of a code review. Feedback lives in four places; gather all four before touching code.

## When to Use

- The user asks to address/respond to review feedback, or a reviewer requested changes.
- `gh` is installed and authenticated, on the PR's branch.

## Step 1 — Discover ALL feedback

```bash
PR=$(gh pr view --json number -q .number)
read -r OWNER REPO < <(gh repo view --json owner,name -q '[.owner.login,.name]|@tsv')
gh pr view --json title,state,reviewDecision,headRefName,baseRefName   # reviewDecision: CHANGES_REQUESTED / APPROVED / REVIEW_REQUIRED
```

Gather every source (`--paginate` — without it you get only the first 30 and silently drop the rest):

```bash
# Inline, line-anchored review comments + thread resolution state + the ids you need to reply/resolve.
# GraphQL does NOT expand {owner}/{repo} — pass real values via -F (only the REST *path* below expands them).
gh api graphql -f query='
query($owner:String!,$repo:String!,$num:Int!){
  repository(owner:$owner,name:$repo){ pullRequest(number:$num){
    reviewThreads(first:100){ nodes{
      id isResolved isOutdated
      comments(first:50){ nodes{ databaseId author{login} path line body url } } } } } } }' \
  -F owner="$OWNER" -F repo="$REPO" -F num="$PR"

gh api repos/{owner}/{repo}/pulls/$PR/reviews  --paginate -q '.[]|{user:.user.login,state,body}'   # verdicts + summaries
gh api repos/{owner}/{repo}/issues/$PR/comments --paginate -q '.[]|{user:.user.login,body}'          # conversation comments
gh pr checks   # run only if CI status is unknown; if checks are already passing, note it and skip
```

From each thread keep two ids: the thread's `id` (base64 node id — for resolving) and its comment's `databaseId` (numeric — for replying). If a PR exceeds `first:100` threads, raise the cap or page with `pageInfo{ endCursor hasNextPage }`.

Notes: `isOutdated` does NOT mean handled — feedback on a since-changed line still counts. Include **bot reviewers** (CodeRabbit, Copilot, linters). A `` ```suggestion `` block is a literal patch — apply it verbatim when correct. Pending (unsubmitted) reviews are invisible to the API; you cannot see those.

## Step 2 — Triage

Build one checklist, one row per thread: `path:line — reviewer — the ask — disposition`. Bucket: blocking/correctness first → clear requested changes → cross-cutting ("do this everywhere") → questions → disagree/out-of-scope. Order by dependency and by file so you edit each file once.

## Step 3 — Make the changes

- Group edits logically; **one commit per logical change**, message referencing the point addressed.
- Re-run build/tests/lint locally — verify the fix before pushing, don't just assume it.
- `git push` to the same branch. **Never force-push** unless the reviewer asked for a rebase/squash: it detaches existing comments from their diff.

## Step 4 — Close the loop (do not skip)

Pushing silently is not "addressed". For each thread you handled:

```bash
# Reply to a specific inline thread (COMMENT_ID = the comment's numeric databaseId from step 1)
gh api --method POST repos/{owner}/{repo}/pulls/$PR/comments/COMMENT_ID/replies -f body="Done in <sha> — <what changed>."

# Resolve a thread you actually fixed (GraphQL only — no gh shortcut; THREAD_ID = the base64 node id from step 1)
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -F id=THREAD_ID

# Re-request review after addressing changes (no gh shortcut)
gh api --method POST repos/{owner}/{repo}/pulls/$PR/requested_reviewers -f 'reviewers[]=REVIEWER_LOGIN'
```

Resolve only the mechanical threads you clearly fixed; leave discussion threads for the reviewer to close. A top-level summary comment (`gh pr comment $PR --body "..."`) listing what changed and any open items helps. Confirm CI: `gh pr checks --watch`.

## Handling feedback you disagree with

Never silently ignore it and never silently comply. Reply in the thread with reasoning and evidence (a benchmark, the existing convention, a spec link), propose an alternative, and leave the thread **unresolved** for the reviewer to decide. If it's a cheap nit, just make the change. If it's genuinely out of scope, propose a follow-up issue and link it.
