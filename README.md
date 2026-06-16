# Padel Tour

Padel Tour is a recreational event-management app for reusable player rosters, fair Americano-style draws, live scoring and timers, standings, and cross-event history.

## Features

- Reusable players with 1-10 ratings
- Event-level name and rating snapshots
- Deterministic schedules with unequal court availability
- Fairness diagnostics for appearances, rests, partners, opponents, and ratings
- Safe draw editing before a match is completed
- Persistent score and timer state
- Standings derived from completed matches
- Historical player dashboard
- Responsive live-match controls

## Stack

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, Supabase Postgres, Zod, React Hook Form, and Vitest.

## Local Setup

Use Node 24 (`nvm use`) and install dependencies:

```bash
npm install
cp .env.example .env.local
```

Fill the Supabase variables in `.env.local`, then:

```bash
npm run dev
```

Supabase variables are required for authentication. Configure Google as an Auth provider in Supabase and add `/auth/callback` to the allowed redirect URLs.

## Environment

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
ADMIN_ROLE_API_SECRET
CONTEXT7_API_KEY
```

`SUPABASE_SECRET_KEY` and `ADMIN_ROLE_API_SECRET` are server-only and must never use a `NEXT_PUBLIC_` prefix. `CONTEXT7_API_KEY` is optional and only raises MCP rate limits.

## Supabase

Repository migrations are the schema source of truth.

```bash
supabase start
supabase db reset
supabase migration list --local
supabase gen types typescript --local --schema public > src/types/database.ts
```

`supabase db reset` applies `supabase/migrations/` and the repeatable `supabase/seed.sql`. For a hosted project, link it and use the current CLI help before running `supabase db push`.

## Quality Commands

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

## Context7

The official Context7 endpoint is configured in `.codex/config.toml`. Codex loads project MCP configuration only after the repository is trusted and a new session starts. The endpoint works without a key; set `CONTEXT7_API_KEY` for higher limits if desired.

## Deployment

Deploy as a standard Next.js application and configure the three Supabase environment variables in the hosting platform. Database migrations must be applied before the first production request.

Users sign in with Google through Supabase Auth. First-time sign-in creates a `member` account in `public.app_users`; administrators can grant or revoke the `admin` role through the server-only admin endpoints:

```bash
curl -X POST http://localhost:3000/api/admin/users/grant \
  -H "content-type: application/json" \
  -H "x-admin-role-secret: $ADMIN_ROLE_API_SECRET" \
  -d '{"email":"organizer@example.com"}'

curl -X POST http://localhost:3000/api/admin/users/revoke \
  -H "content-type: application/json" \
  -H "x-admin-role-secret: $ADMIN_ROLE_API_SECRET" \
  -d '{"email":"organizer@example.com"}'
```

Full RBAC is intentionally deferred; existing data access still runs through server-only actions using the Supabase secret key, with RLS enabled and browser roles denied.

GitHub: [asadkhalid305/padeltour](https://github.com/asadkhalid305/padeltour)
