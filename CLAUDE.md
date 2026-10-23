# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Support Hub — a volunteer-facing web app for the charity 300 Blankets, used to register drop-in-centre guests and log what help they receive (meals/pantry, material aid, information/signposting). Two governing docs, read before making scope decisions:

- `scope_project.md` — the original spec: tech stack, DB schema, API surface, screen flow.
- `plan_project.md` — the actionable sprint-by-sprint build plan, including every deliberate deviation from `scope_project.md` (with the reasoning), e.g. email/password auth instead of magic-link, a mock stock model added to Stage 1, `guests.phone` added for deduplication. **When the two disagree, `plan_project.md` is current.**

Stage 1 (this build) is registration + logging what's given out. Stage 2 (donations, donors, full stock-movement tracking) is explicitly out of scope — don't build toward it preemptively.

## Spec-driven workflow

New features follow the workflow in `specs/README.md`:
- Before writing any implementation code for a new feature or behaviour change, create `specs/NNN-name/spec.md` from `specs/_template/` and get the user to approve it. While a spec is still `Status: draft` or has open questions, only work on the spec itself.
- Change the contract (Zod schemas in `packages/shared`, `db/schema.ts`/migrations) before writing route or screen code, and turn API-level acceptance criteria into tests in `apps/api/src/__tests__/`.
- If behaviour changes during or after implementation, update the spec in the same branch. Before merging, make sure the spec matches what was built and set `Status: built`.
- Small fixes that restore behaviour already specified (bugs, copy, styling) don't need a spec.

## Commands

Install once at the repo root (pnpm workspace):
```
pnpm install
```

Run dev servers (two separate processes):
```
pnpm dev:api     # apps/api on :3000 (tsx watch)
pnpm dev:web     # apps/web on :5173 (vite)
```

Build everything / one package:
```
pnpm -r build
pnpm --filter api build
pnpm --filter web build
```

Tests:
```
pnpm --filter api test                              # API: all tests (Vitest)
pnpm --filter api exec vitest run src/__tests__/rls.test.ts   # API: single file
pnpm --filter web test                              # web: all tests (Jest + React Testing Library)
pnpm --filter web exec jest src/__tests__/RegisterGuest.test.tsx   # web: single file
```
API tests hit the **real** Supabase project over the network (there's no local Postgres or mocking) — `.env` must be populated and the `TEST_VOLUNTEER_*`/`TEST_ADMIN_*` accounts must exist for `rls.test.ts` and `auth.test.ts` to pass.

Web tests run offline in jsdom (`apps/web/jest.config.cjs`, Babel 7 transform, config inline so it can't affect Vite). `src/__tests__/setup.ts` mocks `lib/supabaseClient` with a signed-in session and replaces `fetch`; tests queue API responses with `mockApi()` and render screens with `renderScreen()` from `src/__tests__/utils.tsx`, so screens go through their real React Query hooks and `apiClient`. Tests are type-checked by `tsconfig.test.json` as part of `pnpm --filter web build`.

Database (run from `db/`, or `pnpm --filter db <script>`):
```
pnpm --filter db generate   # diff db/schema.ts -> new file in db/migrations
pnpm --filter db migrate    # apply pending migrations to DATABASE_URL
pnpm --filter db push       # push schema directly, no migration file (rarely used here)
pnpm --filter db studio     # Drizzle Studio
```
Hand-written SQL (RLS policies, triggers) is added via `npx drizzle-kit generate --custom --name=<name>` from `db/`, which creates an empty, journal-tracked migration file to fill in by hand — `drizzle-kit generate` (no `--custom`) would instead try to autogenerate SQL from `schema.ts` and miss it entirely.

## Environment

Two `.env` files, not one:
- **repo root `.env`** — used by `apps/api` and `db` (Supabase keys, `DATABASE_URL`, `PORT`, `WEB_ORIGIN`, `TEST_*` accounts). Copy `.env.example`.
- **`apps/web/.env`** — Vite only reads env files from the app's own directory, so `VITE_API_URL`/`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` must be duplicated there (same values as the root file's Vite-prefixed entries).

## Architecture

**Monorepo layout**: `apps/api` (Express+TS), `apps/web` (Vite+React+TS), `packages/shared` (Zod schemas used by both apps), `db` (Drizzle schema + migrations, its own workspace package rather than living inside `apps/api`).

**`db` and `@support-hub/shared` have no build step.** Their `package.json` `main`/`exports` point straight at the `.ts` source (e.g. `db/package.json` maps `"./schema.js"` -> `"./schema.ts"`). `apps/api` (tsx) and `apps/web` (Vite/esbuild) both resolve and transpile these on the fly. If you add a new export, update the `exports` map in the producing package — don't expect a `dist/` to exist for either.

**Auth**: Supabase email/password (not magic-link — see `plan_project.md` for why). The frontend calls `supabase.auth.signInWithPassword` directly; there's no `/api/login` route. Every `/api/*` route except `/api/health` runs through `verifyJwt` (`apps/api/src/middleware/verifyJwt.ts`), which verifies the JWT against Supabase's JWKS endpoint, then looks up the caller's role fresh from `public.users` — the role is never taken from the token or trusted from the client. Accounts are provisioned by an admin directly in Supabase (no in-app signup); there's no endpoint for it.

**RLS is load-bearing, not decorative.** `apps/api`'s Postgres connection (`apps/api/src/lib/db.ts`) authenticates as the `postgres` owner role, which **bypasses RLS by default**. Every authenticated request must go through `withAuth(req.auth, fn)`, which opens a transaction, sets `request.jwt.claims` and does `SET LOCAL ROLE authenticated` before running any query — only then do the policies in `db/migrations/0001_rls_policies.sql` actually apply. Calling `db.transaction`/raw queries directly instead of `withAuth` silently skips all row-level security. Note also that Postgres RLS can't restrict *which columns* change within an allowed row — where that matters (volunteers may decrement `inventory_items.quantity_on_hand` but not edit the catalogue), it's enforced by a trigger (`enforce_inventory_items_column_guard`), not a policy.

**Audit log** (`db/migrations/0002_audit_trigger.sql`) is written only by a `SECURITY DEFINER` trigger on every mutating table — never insert into `audit_log` from application code.

**Mock stock model**: `inventory_items.quantity_on_hand`/`low_stock_threshold` are a Stage 1 addition not in the original scope (real stock tracking is Stage 2). Service logging must decrement/restore `quantity_on_hand` transactionally alongside the `services` insert/delete — see the Sprint 4 section of `plan_project.md` for the exact contract (including the insufficient-stock rejection behavior).

**Test accounts**: `volunteer.test@supporthub.local` / `admin.test@supporthub.local` were created via the Supabase Admin API specifically for automated testing (not real people), because the developer's real account's password isn't available to script against. Their credentials live in `.env` as `TEST_VOLUNTEER_*`/`TEST_ADMIN_*`.
