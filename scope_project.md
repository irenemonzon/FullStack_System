
 
## 1. Overview
 
The **Support Hub** is a drop-in centre run by the charity **300 Blankets** serving people experiencing hardship. Volunteers give guests meals/pantry items, material aid (clothing, toiletries, blankets), and information about other services.
 
We are building a **volunteer-facing web app** (used on an iPad at the door, also phone/desktop) that records **who is served and what help they receive**, so the organisation can measure its **reach** (unique guests, visits, items handed out, supports signposted) and report to its coordinator and committee.
 
### Two-stage plan
 
- **Stage 1 — current scope.** Register the guest at the door and record all help *given out* during a visit (kitchen, material aid, information). Inventory is a reference catalogue (a picklist of what can be given).
- **Stage 2 — later, out of scope now.** The admin side: record help *coming in* (donations, donors) and full stock tracking (stock movements, low-stock alerts). The schema below is designed so Stage 2 slots in without rework.

 
## 3. Technologies
 
Per the project ADRs (with Express chosen over Hono).
 
| Layer | Choice |
| :---- | :---- |
| Backend | Node.js + **Express** + TypeScript |
| Frontend | Vite + React + TypeScript + Tailwind (PWA) |
| Routing | React Router v6 |
| Server state | TanStack Query |
| Database | PostgreSQL via **Supabase** (Sydney region, `ap-southeast-2`) |
| ORM / migrations | **Drizzle** (schema-as-TypeScript is the source of truth) |
| Validation | **Zod** schemas in `packages/shared`, imported by both apps |
| Auth | Supabase Auth (magic link); JWT verified in Express middleware |
| Hosting | Fly.io, Sydney region — one Node app serves the API + static React build |
| Repo | pnpm monorepo |
 
Cost target: **~$0/month for v1** on Supabase + Fly.io free tiers. All data resides in Australia.
 
---
 
## 4. Repository structure
 
```
hub-support/
├── apps/
│   ├── api/            # Express backend (TypeScript)
│   │   ├── src/
│   │   │   ├── middleware/   # JWT verify, Zod validate, role guard
│   │   │   ├── routes/       # guests, visits, services, inventory, reports
│   │   │   └── index.ts
│   └── web/            # React + Vite frontend (PWA)
│       └── src/
│           ├── screens/      # check-in, search, register, visit, add-item, summary
│           ├── components/
│           └── lib/          # api client, supabase client, query hooks
├── packages/
│   └── shared/         # Zod schemas, shared types, enums, constants
├── db/
│   ├── schema.ts       # Drizzle schema (source of truth)
│   └── migrations/     # generated SQL
├── pnpm-workspace.yaml
├── Dockerfile          # multi-stage: web build → copy into api/public 
└── package.json
```
 
 
---
 
## 5. Database structure (Stage 1)
 
PostgreSQL. Use snake_case columns, `uuid` PKs (default `gen_random_uuid()`), `timestamptz` for times. Enforce **row-level security (RLS)** per role and an **audit log** via a trigger on every mutating table.
 
### Tables
 
**users** — a volunteer/admin, linked 1:1 to a Supabase Auth user.
- `id` uuid PK (= `auth.users.id`) · `full_name` text · `email` text unique · `role` enum(`volunteer`,`admin`,`lead`) · `active` boolean · `created_at` timestamptz
**guests** — the registered person. No ID-document fields.
- `id` uuid PK · `display_name` text · `gender` enum(`woman`,`man`,`non_binary`,`prefer_not_to_say`) **NOT NULL** · `birth_date` date null (entered as DD/MM/YY) · `postcode` text null · `preferred_language` text null · `dietary` text null · `notes` text null · `created_at`/`updated_at` timestamptz · `created_by` uuid FK→users.id
**visits** — one guest interaction on a day.
- `id` uuid PK · `guest_id` uuid FK→guests.id **NOT NULL** · `volunteer_id` uuid FK→users.id · `visited_at` timestamptz · `status` enum(`open`,`finished`) · `notes` text null
**categories** — item categories scoped to a station.
- `id` uuid PK · `station` enum(`kitchen`,`material_aid`) · `name` text
**inventory_items** — catalogue of what can be handed out (picklist only in Stage 1; stock counts arrive in Stage 2).
- `id` uuid PK · `category_id` uuid FK→categories.id · `name` text · `size` text null (clothing) · `gender_fit` enum(`mens`,`womens`,`unisex`,`kids`) null (clothing) · `unit` text · `per_guest_limit` integer null · `active` boolean
**services** — what a guest received at one station during a visit.
- `id` uuid PK · `visit_id` uuid FK→visits.id · `station` enum(`kitchen`,`material_aid`,`information`) · `inventory_item_id` uuid FK→inventory_items.id null · `quantity` integer null · `details` jsonb null · `created_at` timestamptz · `created_by` uuid FK→users.id
- Kitchen/material_aid rows set `inventory_item_id` + `quantity`. Information rows leave those null and use `service_supports`.
**support_categories** — signposting lookup.
- `id` uuid PK · `name` text — seed: Housing, Health, Mental health, Legal, Financial, Family violence, Drug & alcohol, Language services
**service_supports** — many-to-many: which supports were signposted in an information service.
- `id` uuid PK · `service_id` uuid FK→services.id · `support_category_id` uuid FK→support_categories.id · `note` text null
**audit_log** — written by a trigger, not app code.
- `id` bigserial PK · `table_name` text · `row_id` uuid · `action` enum(`insert`,`update`,`delete`) · `actor_id` uuid · `before` jsonb · `after` jsonb · `at` timestamptz
### Relationships
 
```
users 1─* guests        (created_by)
users 1─* visits         (volunteer_id)
users 1─* services       (created_by)
guests 1─* visits        (guest_id, required)
visits 1─* services      (visit_id)
categories 1─* inventory_items  (category_id)
inventory_items 1─* services    (inventory_item_id, nullable)
services 1─* service_supports   (service_id)
support_categories 1─* service_supports (support_category_id)
```
 
---
 
## 6. API structure (Stage 1)
 
Express, `/api` prefix. Every route needs a valid Supabase JWT except `/api/health`. Validate bodies/queries with the shared Zod schemas. Return the created/updated row on mutations.
 
### Guests
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/guests?firstName=&birthDate=&postcode=` | Low-friction match search → ranked possible matches |
| POST | `/api/guests` | Register a guest (gender required) |
| GET | `/api/guests/:id` | Read profile |
| PATCH | `/api/guests/:id` | Edit profile |
| GET | `/api/guests/:id/visits` | Visit history |
 
### Visits
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/visits` | Start a visit for a registered guest (`guestId` required) |
| GET | `/api/visits/:id` | Read a visit with its services (summary screen) |
| PATCH | `/api/visits/:id` | Update status (`finished`) / notes |
| GET | `/api/visits?date=YYYY-MM-DD` | List a day's visits |
 
### Services (station logging)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/visits/:id/services` | Log one station action. Kitchen/material carry `inventoryItemId`+`quantity`; information carries `supportCategoryIds` + optional notes |
| DELETE | `/api/services/:id` | Undo a mis-logged service |
 
### Inventory (catalogue read; management is admin)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/inventory?station=&categoryId=` | Item catalogue for the picklist |
| POST | `/api/inventory` · PATCH `/api/inventory/:id` | Manage items (admin) |
 
### Lookups & reports
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/categories` | Item categories by station |
| GET | `/api/support-categories` | Signposting categories |
| GET | `/api/reports/reach?from=&to=` | Unique guests, visits, new vs returning, items, supports signposted |
| GET | `/api/reports/weekly` · `/api/reports/monthly` | Coordinator / committee views |
| GET | `/api/health` | Unauthenticated liveness check |
 
> **Stage 2 (do not build now):** `/api/donations`, `/api/donors`, stock-movement writes, low-stock reporting.
 
---
 
## 7. Volunteer flow (screens)
 
The app follows this path (low-fidelity wireframes exist in Figma):
 
1. **Check-in / Home** — New guest or Returning guest.
2. **Find returning guest** — search by first name / birth date / postcode → pick a match or start new.
3. **Register guest** — name/alias + required gender; other fields optional.
4. **Record services** — three station cards (Kitchen, Material aid, Information) with quick-add.
5. **Add item** — per-item entry: kitchen (meal/pantry + quantity) and material aid (item + size + gender/fit + quantity).
6. **Information & signposting** — multi-select supports shared + optional note.
7. **Visit summary** — recap of everything given, then Confirm & finish.
---
 
## 8. Cross-cutting rules
 
- **Security:** RLS enforces role access at the DB (`volunteer` < `admin` < `lead`). JWT verified in Express middleware attaches `{ userId, role }`; never trust client-sent role. RLS is load-bearing — test it in the first sprint.
- **Atomic writes:** logging a kitchen/material service that will later decrement stock must be transactional; wrap the `services` insert (and, in Stage 2, the `stock_movements` insert) in one Drizzle transaction.
- **Audit:** all mutations captured by a Postgres trigger → `audit_log`. Do not write audit rows from app code.
- **Data residency:** everything in Sydney (Supabase + Fly.io).
- **Types:** Zod schemas in `packages/shared` are the single source of validation truth for both apps. Drizzle schema is the single source of DB truth. Keep them aligned; do not duplicate enums by hand.
- **No secrets in the client.** Supabase anon key + magic-link auth only; service-role key stays server-side.
---
 
## 9. Suggested build order
 
1. Monorepo + API scaffolding + Supabase project + Drizzle schema + migrations.
2. Auth (magic link) + JWT middleware + RLS policies + audit trigger. Test RLS.
3. Guests: register + match-search endpoints and screens.
4. Visits + services logging (kitchen, material aid, information) end-to-end.
5. Inventory catalogue + seed categories/support_categories.
6. Visit summary + reach reporting (weekly/monthly).

---
 

 