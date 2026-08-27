# Support Hub

A volunteer-facing web app for **300 Blankets**, a charity running a drop-in support centre. It records who is served and what help they receive (meals/pantry, material aid, information/signposting), so the organisation can measure its reach and report to its coordinator and committee.

Used at the door on an iPad, and also on phone/desktop.

## Status

**Stage 1** is in progress — see [`plan_project.md`](./plan_project.md) for the sprint-by-sprint build plan and current status, and [`scope_project.md`](./scope_project.md) for the original spec (schema, API surface, screen flow). Where the two differ, `plan_project.md` is authoritative — it documents every deliberate deviation (e.g. email/password login instead of magic-link, a mock stock model, `guests.phone` for deduplication) along with the reasoning.

**Stage 2** (donations, donors, full stock-movement tracking, low-stock alerts) is explicitly out of scope for now.

## Tech stack

| Layer | Choice |
| :--- | :--- |
| Backend | Node.js + Express + TypeScript |
| Frontend | Vite + React + TypeScript (PWA) |
| Routing | React Router v6 |
| Database | PostgreSQL via Supabase (Sydney region) |
| ORM / migrations | Drizzle |
| Validation | Zod schemas shared between both apps |
| Auth | Supabase Auth (email/password) |
| Repo | pnpm monorepo |

## Repository structure

```
apps/
  api/       Express backend
  web/       React + Vite frontend (PWA)
packages/
  shared/    Zod schemas shared by both apps
db/
  schema.ts       Drizzle schema — source of truth for the database
  migrations/     Generated + hand-written SQL migrations
```

## Prerequisites

- Node.js 20+
- pnpm
- A Supabase project (Sydney / `ap-southeast-2` region), with the **email/password** auth provider enabled

## Setup

1. Install dependencies:
   ```
   pnpm install
   ```
2. Copy `.env.example` to `.env` at the repo root, and fill in your Supabase project's URL, anon key, service role key, and database connection string (`Project Settings > API` and `Project Settings > Database` in the Supabase dashboard).
3. Also copy the `VITE_*` values into `apps/web/.env` — Vite only reads env files from the app's own directory, so they need to exist in both places.
4. Apply the database schema and migrations:
   ```
   pnpm --filter db migrate
   ```
5. Create at least one user: add them under Authentication > Users in the Supabase dashboard, then insert a matching row in `public.users` with their role (`volunteer`, `admin`, or `lead`). There's no in-app sign-up.

## Running locally

```
pnpm dev:api     # http://localhost:3000
pnpm dev:web     # http://localhost:5173
```

## Testing

```
pnpm --filter api test
```

Tests run against the real Supabase project configured in `.env` (there's no local Postgres or mocking), and expect the `TEST_VOLUNTEER_*`/`TEST_ADMIN_*` accounts described in `.env.example` to exist.

## Building

```
pnpm -r build
```
