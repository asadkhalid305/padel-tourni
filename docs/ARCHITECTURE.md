# Architecture

## Modules

- `src/domain/`: pure scheduling, diagnostics, rankings, timer math, and consistency checks.
- `src/lib/data.ts`: server-only read model and historical aggregation.
- `src/app/actions.ts`: validated server-side mutations.
- `src/app/` and `src/components/`: App Router screens and responsive controls.
- `supabase/migrations/`: authoritative database schema.

## Database

Reusable `players` are snapshotted into `event_players`. Events own rounds, and rounds own matches. Matches reference four event-player IDs, enforce distinct participants, and store score and timer state. RLS is enabled on every public table; only the server secret role has access in this unauthenticated version.

## Scheduling Boundary

The scheduler accepts stable player IDs, ratings, per-round court counts, and a seed. It returns a deterministic schedule without importing React or Supabase. Diagnostics and tests operate on the same output.

## Server And Client

Reads happen in server components through the data layer. Mutations use Zod-validated server actions. Client components are limited to form feedback, draw controls, and the ticking timer display. Secrets never enter client bundles.

## Timers And Standings

Timer state persists timestamps and accumulated pause seconds; countdown and overtime are derived with pure functions. Standings are rebuilt from completed match records, using total points when match counts are equal and average points when they differ.

## Future Authentication

Replace the current server-secret access with authenticated Supabase clients and ownership or membership policies. The existing RLS boundary, server actions, and repository layer keep that change localized.
