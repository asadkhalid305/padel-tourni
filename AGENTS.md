# Padel Event Manager

## Product invariants

- Fair scheduling is a core requirement.
- Stable IDs connect records; names are display values.
- Snapshot player names and ratings per event.
- Completed match data is the source of truth for standings and must not be silently overwritten.
- Never generate blank players or placeholder player values.
- Authentication is postponed, but keep authorization boundaries easy to add.

## Architecture

- Keep scheduling pure and independent from React and Supabase.
- Keep database access behind a small server-only data layer.
- Keep server-only code out of client bundles.
- Define each business rule once and derive standings from match records.

## Engineering

- Use strict TypeScript and avoid unjustified `any`.
- Validate external input with Zod.
- Prefer direct, readable solutions and avoid premature abstractions.
- Add dependencies only for a clear purpose.
- Do not leave core functionality as TODOs.
- Add a focused regression test for scheduling, ranking, timing, or consistency bugs.

## Verification

Before running npm, Next.js, or Vitest commands, load nvm and use the repo Node version:
export PATH=/bin:/usr/bin:/usr/local/bin:$PATH; source ~/.nvm/nvm.sh && nvm use

The `.nvmrc` value is authoritative; a plain shell may otherwise fall back to the system Node.

GitHub Actions runs the full CI gate for pushes to `main` and pull requests targeting `main`: formatting, linting, type checking, tests, and production build. Treat that workflow as the authoritative full verification layer.

Before completion, run only the local checks that matter for the changed surface. Do not run the full CI suite by default. Typical local checks are a relevant test file, targeted type checking, a production build when build output can change, visual inspection for UI work, migration verification for schema changes, and GitHub push verification when publishing. Run broader local checks only when the change has production, build, schema, or cross-cutting risk, or when pushing directly to `main`.

Vercel preview deployments use the currently configured remote Supabase schema and are not a reliable schema preview for PRs that add or change migrations. For schema-changing branches, verify against local Supabase or the migration-validation workflow before relying on preview behavior. Production migrations are applied only after changes land on `main`.
