---
name: padeltour-git-github
description: Use for repository setup, secret-safe commits, GitHub publication, and push verification in this project.
---

# Git and GitHub

1. Inspect `git status`, the diff, and ignored files before staging.
2. Keep `main` deployable. Use a small number of meaningful Conventional Commit-style commits.
3. Never commit `.env*`, credentials, database secrets, build output, or temporary files.
4. When multiple AI sessions or agents may be working in the same project, stage and commit only files this agent created or intentionally changed for the current task or Linear ticket. Do not use broad staging commands such as `git add .` unless the diff has been reviewed and every staged path belongs to this task.
5. If another agent or user may also be editing a file touched by this task, notify the user before staging that the file appears shared and identify the exact block or hunk this agent changed. Stage only this agent's intended hunk when practical; otherwise ask before staging the whole shared file.
6. Use the authenticated GitHub integration for hosted operations when it supports them; use `git` and `gh` for local history, remotes, and push gaps.
7. Before pushing, run only the local checks that matter for the changed surface; do not run the full CI suite by default. GitHub Actions is the authoritative full verification gate for pushes to `main` and pull requests targeting `main`.
8. Run broader local checks only when the change has production, build, schema, or cross-cutting risk, or when pushing directly to `main`.
9. Scan tracked files for likely secrets when the diff touches config, env, credentials, or similar sensitive paths.
10. After pushing, verify the remote branch points to the local commit and the working tree is clean.
11. Never force-push or rewrite published history unless the user explicitly requests it.
