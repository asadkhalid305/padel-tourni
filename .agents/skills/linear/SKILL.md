---
name: padeltour-linear
description: Keep Padeltour engineering work synchronized with Linear as the source of truth for issues, features, documentation, and future work. Use when Codex discovers follow-up work, reads or implements a Linear ticket, reports implementation progress, prepares work for manual testing, or completes and closes a ticket after approval and deployment.
---

# Padeltour Linear

Treat Linear as the durable record of project work. Use the connected Linear tools and preserve the repository's product invariants and verification requirements. Keep updates short and practical.

## Capture Discovered Work

1. Search Linear for an existing equivalent issue before creating one.
2. Create an issue when work reveals a real bug, missing feature, documentation gap, technical debt item, or deferred follow-up outside the current scope.
3. Tell the user what was discovered and include the new or existing issue identifier.
4. Write a clear title and a concise description with just the useful context, impact, expected outcome, and any needed reproduction or acceptance details.
5. Choose the most appropriate team, project, priority, and labels from available Linear data. Do not invent identifiers or add noise.

## Work On A Ticket

1. Resolve the ticket from its identifier, URL, or title. Ask only when multiple matches remain or a product decision cannot be inferred safely.
2. Read the full issue, comments, linked context, and relevant project documents before editing code.
3. Move the issue to the team's active status when implementation begins.
4. Implement and verify the requested work.
5. When implementation is ready, leave the issue open and report the important outcome in plain language.
6. Use only brief comments when something material changed, remains open, or is blocking progress. Prefer one or two short sentences. Avoid templates, command lists, or repeated status commentary.
7. Wait for explicit user approval that manual testing looks good. Do not commit, push, deploy, or close the issue before this approval unless the user explicitly requests a different sequence.

## Complete A Ticket

After the user approves:

1. Recheck the diff, relevant tests, and working tree.
2. Create an intentional commit referencing the Linear issue identifier.
3. Push the completed work to remote `main` and verify the remote commit.
4. Move the issue to the team's completed status only after the push succeeds.
5. Report the commit, remote verification, and final issue status to the user.

If implementation or push fails, keep the issue open, record a concise blocker when useful, and do not imply completion.

## Linear Hygiene

- Keep one issue focused on one independently understandable outcome.
- Prefer acceptance criteria that describe observable behavior.
- Link related or duplicate issues instead of copying context.
- Never silently expand the current ticket; create follow-up issues for out-of-scope discoveries.
- Preserve issue history, but keep comments short and only add them when they add new information.
- Use the Linear connector sparingly and only for state changes, issue creation, or meaningful updates.
