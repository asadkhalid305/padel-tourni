---
name: padeltour-supabase
description: Use for Supabase schema, migrations, seed data, generated types, and server-side persistence in this project.
---

# Supabase Workflow

1. Check current Supabase docs or changelog for version-sensitive behavior.
2. Keep repository SQL migrations as the schema source of truth.
3. Any schema change applied through a plugin must also exist in a committed migration.
4. Apply migrations through the authenticated Supabase integration when possible, then inspect tables, constraints, and advisors.
5. Keep seed data repeatable and non-destructive.
6. Regenerate `src/types/database.ts` after schema changes.
7. Keep all mutations and secret-key access server-side. Never expose a secret or service-role key to browser code.
8. Enable RLS on exposed tables and keep the unauthenticated access model explicit and easy to replace with user policies later.
9. Preserve event-player name and rating snapshots even when reusable player records change.
10. Verify changes with a real query after applying them.
11. Do not apply pull-request migrations to production Supabase. PR schema changes must be validated with local Supabase or the migration-validation GitHub Action.
12. Production migrations are applied from GitHub Actions on `push` to `main`. Keep migrations backward-compatible so app deploys and schema deploys can complete safely even if their timing overlaps.
