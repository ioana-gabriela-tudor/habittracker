---
name: maf-se-create-plan
description: 'Invoke for small-to-medium tasks intended for a single agent. Reads context, asks one clarifying question if the goal is ambiguous, then writes a structured implementation plan to plan-<name>.md. Does not write code. Use maf-se-create-graph-plan instead when the work requires parallel sub-agents.'
model: sonnet
---

# Implementation Plan

## Inputs

- Task or ticket: ${input:task:Describe the task, paste the ticket URL, or summarize the goal}
- Scope hint (optional): ${input:scope:e.g. scaffold only, first slice, full feature}

## Required Behavior

1. Gather just enough context from the workspace to ground the plan. Prefer reading product docs (PRD, ARCH, STYLES, AGENTS) and existing entry points over broad exploration. Do not narrate file reads in chat; proceed silently until the plan is written.
2. If the scope is genuinely ambiguous, ask one short clarifying question. Otherwise infer and proceed.
3. Write the plan to `plan-${camelCaseName}.md` using the exact structure in the Template section. Do not include YAML frontmatter in that file.
4. After writing, summarize the plan in chat with section names only, and offer next steps.
5. Organize the sections from database, to backend, to frontend, to validation, but adapt as needed for the task. The template is a guide, not a rule.

## Plan Template

```
## Plan: <Human Readable Title>

<One short paragraph stating the goal and constraints.>

## 1. <Section Name>

<One short paragraph explaining why this workstream exists and what it produces.>

- [ ] <Small, concrete task>
- [ ] <Small, concrete task>

## 2. <Section Name>

<Short paragraph.>

- [ ] <Small, concrete task>

## N. Validation

<Short paragraph.>

- [ ] <Install / typecheck / lint / start / smoke-test step>

## Relevant Files

- `<absolute or workspace-relative path>` — <why it matters>

## Decisions

- <Decision and rationale>

## Further Considerations

- [ ] <Open question or follow-up>
```

## Quality Bar

- Break work into many small checkbox tasks rather than a few large ones.
- Reference real files in the workspace when they exist; mark proposed paths clearly when they do not.
- Keep scope honest: if the repo is greenfield in an area, say so and plan accordingly.
- Do not write production code, run installs, or modify source files in the planning turn.
