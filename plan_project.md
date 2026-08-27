# Support Hub — Stage 1 Implementation Plan

## Context

300 Blankets (a charity running a drop-in support centre) needs a volunteer-facing web app to record who is served and what help they receive (meals/pantry, material aid, information/signposting), so the organisation can measure reach and report to its coordinator and committee. This is a **brand-new (greenfield) project** — the working directory currently contains only `scope_project.md`, which fully specifies the tech stack, DB schema, API surface, and screen flow for **Stage 1** (registering guests and logging what's given out). **Stage 2** (donations/donors, full stock-movement tracking, low-stock alerts) is explicitly out of scope for now, but the schema is designed so it slots in later without rework.

This plan turns that scope document into an actionable, sprint-based build order, resolving a few gaps and conflicts found while reviewing the project's Figma low-fidelity wireframes (`Support Hub — Low-Fi Wireframes`) against `scope_project.md`, and incorporating decisions made with the user:

- **Build and test locally** — this plan covers building and verifying the full Stage 1 app against local dev servers (`apps/api`, `apps/web`) connected to the cloud Supabase database. Deployment (Fly.io or otherwise) is not part of this plan and will be scoped separately later.
- **Online-only for v1** — no offline queuing/sync; PWA installability only.
- **Minimal automated testing** — manual testing plus a handful of critical tests around RLS/auth enforcement and the core write paths (guest/visit/service logging). No broad unit/integration/e2e suite.
- **Required-fields conflict resolved**: the Figma "Register guest" screen marks Birth Date and Postcode as "required," but this contradicts the scope doc's DB schema (both nullable). **The scope doc/DB schema wins** — only `display_name` and `gender` are required.
- **Stock UI conflict resolved with a deliberate scope addition**: the Figma "Add item"/"Add kitchen item" screens show live, interactive stock text ("In stock: 12 · low-stock alert at 5", "decrements stock automatically") that isn't in the Stage 1 scope doc (stock tracking is nominally Stage 2). The user wants this to be **real and interactive in Stage 1**, via a lightweight **mock stock model**: two extra columns on `inventory_items` (`quantity_on_hand`, `low_stock_threshold`) that get decremented/restored transactionally when services are logged/undone — explicitly **not** the full Stage 2 system (no donations, no `stock_movements` ledger, no restock workflow).
- **Guest deduplication**: to help volunteers avoid creating duplicate guest records with no ID required, guests capture an optional **phone number**, and returning-guest matching/ranking uses **name + birth date + phone number** together (phone as the strongest disambiguator when present).
- **Insufficient stock is blocked**: if a volunteer tries to log more of a kitchen/material-aid item than `quantity_on_hand` has left, the action is rejected outright (no partial/negative stock) and the UI shows a clear message — it does not silently clamp or allow negative stock.
- **`per_guest_limit` not enforced in Stage 1**: the scope's `inventory_items.per_guest_limit` column exists in the schema but volunteers are not limited in how much of an item they log per visit for now; enforcing it is deferred (see Post-Stage-1 Follow-ups).
- **Auth changed from magic-link to email + password** (overrides the scope doc's "magic link" note): volunteers log in directly on the device (iPad/phone/desktop) with email + password — no redirect out to an email client. Accounts are **provisioned by an admin** (email + role set up ahead of time, manually via the Supabase dashboard for Stage 1 — no in-app account-creation UI yet), and users can self-serve a **password reset** via a "Forgot password" email link. Still backed by Supabase Auth (email/password provider instead of OTP); JWT verification, role lookup, and RLS all work exactly the same regardless of how the session was created.

The goal of this plan is a working Stage 1 app — check-in → register/find guest → log kitchen/material-aid/information services (with live mock stock) → visit summary → reach reporting — fully built and verified against local dev servers.

---

## Sprint 0 (optional, half-sprint) — Repo & Tooling Bootstrap

Get an empty monorepo skeleton installing cleanly before any infra or schema work.

- pnpm workspace: `pnpm-workspace.yaml` (`apps/*`, `packages/*`), root `package.json`, `tsconfig.base.json`
- Empty package shells: `apps/api` (Express+TS), `apps/web` (`pnpm create vite apps/web --template react-ts`), `packages/shared`
- `.gitignore`, `.env.example` (placeholders for all env vars needed later)
- Git init, first commit

**Testing steps**
1. Run `pnpm install` at the repo root — completes with no errors and produces a lockfile.
2. Run `pnpm -r build` — every package (`apps/api`, `apps/web`, `packages/shared`) builds with no TypeScript errors.
3. Run `git status` — working tree is clean and the initial commit is present in `git log`.

## Sprint 1 — Infra Setup + Database Schema + Migrations

**1a. Supabase (first-time setup)**
- Create Supabase project, region = Sydney (`ap-southeast-2`); enable the **email/password** auth provider (not magic link); leave "Confirm email" as appropriate and configure the password-reset redirect URL to point at the local web app for now
- Record `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` in `.env` (never committed)

**Testing steps**
1. In the Supabase dashboard, confirm the project region shows Sydney (`ap-southeast-2`).
2. Under Authentication > Providers, confirm email/password auth is enabled (magic link not required).
3. Manually create one test user in Authentication > Users with an email + password, to use in later sprints' auth testing.
4. Confirm `.env` has all four values populated and is git-ignored (`git status` does not show it).

**1b. Drizzle schema — `db/schema.ts`** (source of truth for all 9 Stage 1 tables)
- `users`, `visits`, `categories`, `services`, `support_categories`, `service_supports`, `audit_log` — per `scope_project.md` section 5, verbatim
- `guests` — as scoped, **plus one Stage 1 addition**: `phone text null`, used for returning-guest matching/deduplication
- `inventory_items` — as scoped, **plus two Stage 1 mock-stock columns**: `quantity_on_hand integer null`, `low_stock_threshold integer null`
- Enums: `user_role`, `guest_gender`, `visit_status`, `station`, `gender_fit`, `audit_action`
- `db/drizzle.config.ts` → `DATABASE_URL`; generate + apply first migration (`db/migrations/0000_init.sql`)

**Testing steps**
1. Run `pnpm drizzle-kit generate` then apply the migration — both complete with no errors.
2. In the Supabase SQL editor (or `psql`), query `information_schema.tables` — confirm all 9 Stage 1 tables exist.
3. Inspect `inventory_items` columns — confirm `quantity_on_hand` and `low_stock_threshold` are present and nullable; inspect `guests` — confirm `phone` is present and nullable.
4. Confirm each enum type exists (`user_role`, `guest_gender`, `visit_status`, `station`, `gender_fit`, `audit_action`).

**1c. Local dev environment**
- Minimal `apps/api/src/index.ts` with `GET /api/health` (unauthenticated), CORS enabled for the local web dev origin
- `apps/api` dev script (e.g. `tsx watch src/index.ts` or `ts-node-dev`) running on a local port (e.g. `:3000`)
- `apps/web` dev script (`vite dev`, e.g. `:5173`) with `VITE_API_URL` pointing at the local API
- Both connect to the real cloud Supabase project (Sydney) — only the app servers run locally, the database does not

**Testing steps**
1. Run `pnpm --filter api dev` — request `http://localhost:3000/api/health` and confirm `{ status: "ok" }`.
2. Run `pnpm --filter web dev` — open `http://localhost:5173` and confirm the Vite shell renders with no console errors.
3. From the browser console on the web app, confirm a fetch to the API health endpoint succeeds with no CORS error.

## Sprint 2 — Auth, RLS, Audit Trigger (must pass before Sprint 3)

This is the load-bearing security sprint — do not proceed until RLS is manually verified.

**Account provisioning (how a volunteer gets an account)**
- Admins create accounts manually via the Supabase dashboard: Authentication > Users > add a user with an email + temporary password, then insert a matching row in `public.users` with `full_name` + `role` (`volunteer`/`admin`/`lead`). No in-app "create user" screen in Stage 1 (per decision above) — this is a dashboard/manual step for now.
- Volunteers change that temporary password on first login via the same "Forgot password" flow described below.

**Backend**
- `apps/api/src/middleware/verifyJwt.ts` — verifies the Supabase JWT (issued by the email/password sign-in), attaches `req.auth = { userId, role }`; never trusts client-sent role
- `apps/api/src/middleware/requireRole.ts` — role-guard middleware
- `db/migrations/..._rls.sql` — enable RLS on every mutating table; policies per role:
  - `volunteer`: read/write `guests`/`visits`/`services`/`service_supports`; read-only `inventory_items`/`categories`/`support_categories`; no `audit_log`
  - `admin`/`lead`: volunteer permissions + manage `inventory_items`/`categories`/`support_categories`; read `audit_log` and reports
- `db/migrations/..._audit_trigger.sql` — generic PL/pgSQL trigger function capturing table/row/action/actor/before/after, attached to every mutating table (written by the trigger, never by app code)
- `apps/api/src/lib/db.ts` — Drizzle client running queries under the authenticated session so RLS actually applies
- Critical automated tests live in `apps/api/src/middleware/__tests__/auth.test.ts` and `apps/api/src/__tests__/rls.test.ts`

**Frontend**
- `packages/shared/src/schemas/auth.ts` — Zod `loginSchema` (email + password), `resetPasswordSchema` (email)
- `apps/web/src/screens/Login.tsx` — direct in-app login form (email + password fields, no external redirect), calling `supabaseClient.auth.signInWithPassword`; a "Forgot password?" link that calls `supabaseClient.auth.resetPasswordForEmail` (this step alone still sends an email, only for reset — not for normal day-to-day login)
- `apps/web/src/screens/ResetPassword.tsx` — the page the reset-password email link lands on, letting the user set a new password (`supabaseClient.auth.updateUser`)
- Routing: unauthenticated visitors are redirected to `Login.tsx`; a successful login sends them to `CheckIn.tsx`

**Testing steps (blocking — do not proceed to Sprint 3 until all pass)**
1. Run `pnpm test` in `apps/api` — confirm: unauthenticated request → 401; volunteer JWT blocked from writing `inventory_items`; volunteer JWT can write `guests`/`visits`; admin JWT can manage inventory.
2. Using the test user created in Sprint 1a, log in directly on `Login.tsx` with email + password (no email redirect involved) — confirm it succeeds and lands on `CheckIn.tsx`.
3. Take that session's JWT and manually call `POST /api/inventory` as a volunteer — confirm it's rejected (403 / RLS error).
4. As the same volunteer, call `POST /api/guests` and `POST /api/visits` — confirm both succeed.
5. Click "Forgot password?", confirm a reset email arrives, follow it to `ResetPassword.tsx`, set a new password, and confirm logging in again with the new password works.
6. Query `audit_log` after the mutations in step 4 — confirm a matching row was written for every insert.

## Sprint 3 — Guests: Register + Search/Match

**Backend**
- `packages/shared/src/schemas/guest.ts` — Zod `createGuestSchema` (display_name + gender required; birth_date/postcode/phone/preferred_language/dietary/notes optional) and `guestSearchQuerySchema` (firstName/birthDate/postcode/**phone**)
- `apps/api/src/routes/guests.ts` — `GET /api/guests` (match search — ranks/matches on **name + birth date + phone**, phone being the strongest signal when provided), `POST /api/guests`, `GET /api/guests/:id`, `PATCH /api/guests/:id`, `GET /api/guests/:id/visits`

**Frontend**
- `apps/web/src/lib/supabaseClient.ts`, `apps/web/src/lib/apiClient.ts` (typed fetch, attaches JWT), `apps/web/src/lib/queries/guests.ts` (TanStack Query hooks: `useGuestSearch`, `useCreateGuest`, `useGuest`, `useGuestVisits`)
- `apps/web/src/screens/CheckIn.tsx` (Screen 1 — New guest / Returning guest entry, header shows the signed-in volunteer's name + sign-out; only reachable once logged in via `Login.tsx` from Sprint 2)
- `apps/web/src/screens/FindGuest.tsx` (Screen 2 — search by first name/birth date/postcode/**phone**, ranked matches with "last visit X ago", "none of these — start new guest" fallback)
- `apps/web/src/screens/RegisterGuest.tsx` (Screen 3 — name/alias + gender required; birth_date/postcode/**phone**/language/dietary/notes optional via expandable "add more"; phone called out in the UI copy as helping avoid duplicate records)
- React Router routes wired in `apps/web/src/App.tsx` for the three screens above

**Testing steps**
1. Backend: with a valid volunteer JWT, call `POST /api/guests` with only display_name + gender — confirm 201 and the row in Supabase has birth_date/postcode/phone as null.
2. Backend: register a guest with name + birth date + phone, then call `GET /api/guests?phone=` with that phone number — confirm it's returned as a strong/top match even if name is entered slightly differently.
3. Frontend: from `CheckIn.tsx`, choose "New guest" → fill only name + gender on `RegisterGuest.tsx` → save — confirm no validation error and the guest lands in Supabase.
4. Frontend: from `CheckIn.tsx`, choose "Returning guest" → search on `FindGuest.tsx` by partial first name and postcode — confirm the guest appears under "Possible matches" and can be selected, and that "none of these — start new guest" reaches `RegisterGuest.tsx`.
5. Register two guests with the same first name but different phone numbers/birth dates — confirm searching by phone correctly distinguishes them instead of returning both as equally ranked matches.

## Sprint 4 — Visits + Services Logging (incl. Mock Stock Decrement)

The most logic-heavy sprint — the transactional core of the app. Backend-only; the frontend that consumes these endpoints is built in Sprint 5.

**Backend**
- Inventory/categories/support-categories read endpoints: `apps/api/src/routes/inventory.ts` (`GET /api/inventory` returns `quantity_on_hand`/`low_stock_threshold`; admin-guarded `POST`/`PATCH`), `categories.ts`, `supportCategories.ts`
- Visits: `packages/shared/src/schemas/visit.ts`, `apps/api/src/routes/visits.ts` (`POST /api/visits`, `GET /api/visits/:id`, `PATCH /api/visits/:id`, `GET /api/visits?date=`)
- Services (transactional core): `packages/shared/src/schemas/service.ts` (Zod discriminated union on `station`), `apps/api/src/routes/services.ts`:
  - `POST /api/visits/:id/services` — kitchen/material_aid: **one Drizzle transaction** inserting the `services` row *and* decrementing `inventory_items.quantity_on_hand`; information: inserts `services` + `service_supports` rows in one transaction
  - **Insufficient-stock guard:** before inserting, check `quantity_on_hand >= requested quantity`. If not enough is left, the whole request is **rejected** (e.g. `409 Conflict` with a clear error message like "Only 3 left in stock") — no row is inserted and stock is never decremented below 0. `per_guest_limit` is **not** checked here in Stage 1 (deferred — see Post-Stage-1 Follow-ups).
  - `DELETE /api/services/:id` — undo: deletes the row *and* restores (`+= quantity`) `quantity_on_hand` in the same transaction if it was a kitchen/material_aid entry
- Seed data (`db/seed.ts`): `categories` (kitchen: hot meals/pantry; material_aid: clothing/toiletries/blankets), the 8 `support_categories` (Housing, Health, Mental health, Legal, Financial, Family violence, Drug & alcohol, Language services), and sample `inventory_items` **with seeded `quantity_on_hand`/`low_stock_threshold`** so stock UI is real from day one
- Critical automated tests cover: service logging decrementing stock atomically; the insufficient-stock rejection path; delete/undo restoring it; guest/visit/service Zod validation rejecting bad payloads
- **Explicit boundary:** mock stock only — no `stock_movements` ledger, no donations/donors, no restock endpoint; `per_guest_limit` not enforced

**Testing steps**
1. Run `pnpm test` in `apps/api` — confirm the service-logging/stock, insufficient-stock, and validation tests pass.
2. Run `db/seed.ts` and query `inventory_items` — confirm sample rows have realistic `quantity_on_hand`/`low_stock_threshold` values.
3. Create a visit (`POST /api/visits`), then `POST /api/visits/:id/services` for a material_aid item with quantity 2 — confirm the `services` row is created and `quantity_on_hand` decreases by exactly 2 in the same request.
4. `POST /api/visits/:id/services` again requesting more of that item than remains in `quantity_on_hand` — confirm the request is rejected with a clear error, no `services` row is created, and `quantity_on_hand` is unchanged.
5. Call `DELETE /api/services/:id` on the successful service from step 3 — confirm the row is removed and `quantity_on_hand` is restored (+2).
6. Repeat for an information-station service — confirm `service_supports` rows are created and no inventory row is touched.

## Sprint 5 — Volunteer Screens 4–7 (Record Services → Visit Summary)

Frontend-only; wires the UI to the Sprint 4 backend endpoints.

**Frontend**
- Query hooks: `apps/web/src/lib/queries/visits.ts`, `services.ts`, `inventory.ts`
- `apps/web/src/screens/RecordServices.tsx` (Screen 4 — three station cards, steppers, running totals, "Finish visit")
- `apps/web/src/components/AddItemModal.tsx` (Screen 5 — kitchen and material-aid sub-flows, live "In stock: N" / low-stock warning driven by `quantity_on_hand`/`low_stock_threshold`; if the requested quantity exceeds `quantity_on_hand` or the API rejects the request as insufficient stock, "Add to visit" is blocked/disabled and a clear inline message is shown, e.g. "Only 3 left in stock")
- `apps/web/src/components/InformationModal.tsx` (Screen 6 — multi-select 8 supports + optional note)
- `apps/web/src/screens/VisitSummary.tsx` (Screen 7 — recap by station, totals, "Confirm & finish" → Home)
- `apps/web/src/components/SignOutButton.tsx` (header button on `CheckIn.tsx`, calls `supabaseClient.auth.signOut`)
- PWA manifest/installability only (`apps/web/public/manifest.json`, Vite PWA plugin) — no offline write queue

**Testing steps**
1. Start a visit for a guest and open all three station cards on `RecordServices.tsx` — confirm quick-add and +/- steppers update the running-totals footer live.
2. Open `AddItemModal.tsx` for a material-aid item — confirm "In stock: N" and low-stock styling reflect the seeded `quantity_on_hand`/`low_stock_threshold`, and submitting decrements the displayed count. Then try to request more than is in stock — confirm "Add to visit" is blocked and a clear message is shown instead of the item being added.
3. Open `InformationModal.tsx` — select 2+ supports plus an optional note, confirm they appear back on `RecordServices.tsx`'s totals.
4. Click "Finish visit" — confirm `VisitSummary.tsx` shows an accurate recap grouped by station, then "Confirm & finish" returns to `CheckIn.tsx`.
5. Click sign-out — confirm it returns to `Login.tsx` and a signed-out session can't reach protected screens/API calls.
6. Confirm the PWA manifest is picked up (an "install"/"Add to Home Screen" prompt is available) — do not test offline behavior, it's out of scope.

## Sprint 6 — Reach Reporting + Final Manual Verification

**Backend**
- `apps/api/src/routes/reports.ts` — `GET /api/reports/reach?from=&to=` (unique guests, visits, new vs returning, items, supports signposted), `GET /api/reports/weekly`, `GET /api/reports/monthly`; restricted to `admin`/`lead`
- No dedicated reports screen is in the section-7 volunteer flow — treat as API-only for Stage 1 unless the coordinator specifically asks for an in-app view

**Testing steps**
1. Using seeded/test visit data from Sprints 3–5, call `GET /api/reports/reach?from=&to=` — confirm unique guest count, visit count, new-vs-returning split, item totals, and supports-signposted count all match what was manually logged.
2. Call `GET /api/reports/weekly` and `GET /api/reports/monthly` — confirm they return sensible subsets of the same data.
3. Call the reports endpoints with a volunteer JWT — confirm access is denied (admin/lead only).

**Final Stage 1 verification (local, done-criteria)** — walk the full flow on the local dev servers and confirm each step:
1. Sign in with email + password directly on `Login.tsx` (no email redirect for a normal login).
2. Find a returning guest by partial name/postcode on `FindGuest.tsx` (ranked match works), or register a new one on `RegisterGuest.tsx` confirming birth_date/postcode are optional.
3. On `RecordServices.tsx`, log a kitchen item, a material-aid item, and an information/signposting entry, confirming the live stock steppers update.
4. On `VisitSummary.tsx`, confirm totals match what was logged, then "Confirm & finish" returns to `CheckIn.tsx`.
5. Query `audit_log` — confirm a row exists for every mutation made in steps 2–4.
6. Re-run the Sprint 2 RLS check — confirm a volunteer JWT is still blocked from writing `inventory_items`.
7. Call `DELETE` on one logged service — confirm `quantity_on_hand` is restored.

Stage 1 is done when all 7 steps above pass.

---

## Post-Stage-1 Follow-ups (revisit after Stage 1 ships, not built now)

- **`per_guest_limit` enforcement** — the `inventory_items.per_guest_limit` column exists but isn't checked when logging services; decide whether/how to cap quantity per visit.
- **One open visit per guest** — currently nothing stops a guest from having two simultaneous "open" visits (e.g. an accidental double check-in); decide whether starting a new visit should require closing any existing open one first.
- **Shared-device session handling** — the iPad/phone/desktop stays signed in as one volunteer across an entire shift; decide whether an idle auto-logout (or any session-timeout policy) is needed for a shared device.

## Out of Scope / Stage 2 (do not build now)

- Donations/donors tables & endpoints
- `stock_movements` ledger, low-stock alert workflows, restock endpoints (beyond the Stage 1 mock counter)
- Deployment (Fly.io, CI/CD, or otherwise) — to be scoped separately later
- Offline queuing/sync
- Any test suite beyond the RLS/auth + core-write-path tests in Sprints 2 and 4

## Critical Files

- `db/schema.ts` — Drizzle schema, single source of DB truth (incl. Stage 1 mock stock columns)
- `db/migrations/*_rls.sql`, `*_audit_trigger.sql` — load-bearing security layer, verify before Sprint 3
- `apps/api/src/routes/services.ts` — transactional core (service logging + mock stock decrement/restore)
- `packages/shared/src/schemas/*.ts` — Zod schemas shared by both apps
- `apps/web/src/screens/Login.tsx`, `ResetPassword.tsx` — direct in-app email/password login and self-serve password reset (admin-provisioned accounts, no magic-link redirect)
- `apps/web/src/screens/CheckIn.tsx`, `FindGuest.tsx`, `RegisterGuest.tsx`, `RecordServices.tsx`, `VisitSummary.tsx` — the full volunteer-facing screen flow (Screens 1–7)
- `apps/web/src/components/AddItemModal.tsx`, `InformationModal.tsx` — where the mock stock model and signposting UI surface to volunteers
- `apps/web/src/lib/apiClient.ts`, `supabaseClient.ts` — frontend's connection to the API and to Supabase Auth

## Verification

Each sprint above ends with its own manual checkpoint. Stage 1 is "done" when the Sprint 6 end-to-end walkthrough passes locally (local dev servers + real Supabase data), RLS is confirmed still enforcing role boundaries, and the critical automated tests (RLS/auth + core write paths) pass (`pnpm test` in `apps/api`).
