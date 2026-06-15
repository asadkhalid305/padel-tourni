---
name: padeltour-git-github
description: Use for repository setup, secret-safe commits, GitHub publication, and push verification in this project.
---

# Git and GitHub

1. Inspect `git status`, the diff, and ignored files before staging.
2. Keep `main` deployable. Use a small number of meaningful Conventional Commit-style commits.
3. Never commit `.env*`, credentials, database secrets, build output, or temporary files.
4. Use the authenticated GitHub integration for hosted operations when it supports them; use `git` and `gh` for local history, remotes, and push gaps.
5. Before pushing, run the relevant checks and scan tracked files for likely secrets.
6. After pushing, verify the remote branch points to the local commit and the working tree is clean.
7. Never force-push or rewrite published history unless the user explicitly requests it.
