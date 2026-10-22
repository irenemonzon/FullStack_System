# 003 — Required postcode, and * for required fields

Status: built
Branch: `required-postcode`

## Why

Postcode is needed for every guest (reach reporting by area, and it's one of the signals for spotting returning guests and duplicates — see [001](../001-duplicate-guest-warning/spec.md)), but today it's optional and often left blank. The form also marks required fields inconsistently: Gender says "(required)", Name says nothing.

## Behaviour

- On Register guest and Edit guest, **Name**, **Gender** and **Postcode** are required. Their labels show a `*` (e.g. "Gender *") instead of the word "(required)". No other field gets a `*`.
- Saving with any of the three missing is blocked in the form with a clear message, and rejected by the API (400) if sent anyway. A value that's only spaces counts as missing.
- Next to Postcode, a **"No postcode"** button fills in the default postcode **3012**, for guests who don't have one (e.g. no fixed address). The volunteer can still change it.
- **Existing guests without a postcode** are given 3012 by a one-off migration, so every guest has one.
- Birth date, phone, language, dietary and notes stay optional and can still be cleared on edit.
- Applies to every role (volunteer, lead, admin) — there's no role-specific behaviour.

## Acceptance criteria

API (tests in `apps/api/src/__tests__/`):

- [ ] **Given** a volunteer, **when** `POST /api/guests` has no `postcode`, an empty one, or only spaces, **then** 400 and no guest is created.
- [ ] **Given** a volunteer, **when** `POST /api/guests` has name, gender and postcode, **then** 201.
- [ ] **Given** a guest, **when** `PATCH /api/guests/:id` sends `postcode: null` or `""`, **then** 400 and the postcode is unchanged.
- [ ] **Given** a guest, **when** PATCH changes only their notes, **then** 200 (postcode doesn't have to be re-sent).
- [ ] **Given** a volunteer, **when** `POST /api/guests` has a `displayName` of only spaces, **then** 400.

UI (manual, iPad-sized viewport):

- [ ] Name, Gender and Postcode labels show `*`; no label says "(required)".
- [ ] Register guest with no postcode shows an error and doesn't submit.
- [ ] "No postcode" fills in 3012, and the guest saves with it.
- [x] After migrating, no guest has a null or blank postcode.
- [ ] Editing a guest and clearing the postcode shows an error and doesn't save.

## Contract changes

- **Shared schemas** (`packages/shared/src/schemas/guest.ts`): `createGuestSchema.postcode` becomes a required, trimmed, non-empty string; `displayName` is trimmed too. `updateGuestSchema.postcode` can be omitted but not `null`/empty. `guestSchema` (the response) keeps `postcode` nullable, matching the column.
- **API**: no new endpoints. `POST`/`PATCH /api/guests` validation changes as above; `openapi.ts` picks this up from the schemas; the POST description ("gender required, nothing else is") is updated.
- **Database**: `db/migrations/0004_backfill_guest_postcode.sql` sets `postcode = '3012'` where it's null or blank. No schema change — `guests.postcode` stays nullable.
- **RLS / audit log**: no new tables or columns. The audit trigger logs each backfilled guest as an update with a null `actor_id` (no signed-in user).

## Out of scope

- Validating postcode format (e.g. 4 digits). Any non-empty text is accepted.
- Making birth date required (the Figma wireframe marks it required; not asked for here).
- Changing the Find guest search — postcode stays an optional filter there.

## Open questions

None.

## Decisions

- **Deviates from `plan_project.md`**, which settled on only `display_name` and `gender` being required (the scope doc's DB schema has postcode nullable). Changed at the user's request on 2026-10-23.
- **Required in the app, not the database** (decided 2026-10-23): the column stays nullable (no `NOT NULL`); the API and form enforce it.
- **Existing blank postcodes backfilled with 3012** (decided 2026-10-23, at the user's request), the same default as "No postcode".
- **No postcode → default 3012** (decided 2026-10-23): a "No postcode" button fills in 3012, rather than allowing a blank or a placeholder like `NFA`. Side effect: two guests with the same name who both got 3012 will now trigger the name + postcode duplicate warning from 001. That's the existing "Register anyway" flow, so it's acceptable.
