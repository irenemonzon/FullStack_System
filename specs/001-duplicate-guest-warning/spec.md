# 001 — Duplicate guest warning

Status: built (spec written retroactively from commit `209c6b1`; no `tasks.md` because the work was already done)
Branch: `duplicate-guest-check`

## Why

Guests don't show ID, and a volunteer at a busy door may not find someone through "Returning guest" search. They might then register a guest who already has a record. Duplicate records split a guest's help history across two profiles and inflate the reach numbers. Phone deduplication (see `plan_project.md`, Context) only helps if the volunteer searches first, so registration needs its own check.

## Behaviour

- When a volunteer saves a new guest, the API first checks for **possible duplicates**: existing guests with
  - the **same phone number**, comparing digits only (`0412 345 678` = `0412345678`), **or**
  - the **same name** (ignoring case and extra spaces) **plus** the same birth date **or** the same postcode (ignoring case and surrounding spaces).
- A matching name on its own is **not** flagged, because different people share common names.
- If there are possible duplicates, the guest is **not** created. Register guest shows up to 5 matches, newest first. Each one shows its name, birth date, postcode and phone, which fields matched, and an **"Open existing profile"** button.
- If the volunteer confirms the guest is someone else, **"Not the same person — register anyway"** creates the guest without running the check again.
- If the volunteer edits any field the check compares on (name, birth date, postcode, phone) while the warning is showing, the warning disappears and **"Save guest"** comes back. Saving then runs the check on the corrected details.
- Any authenticated user (volunteer, lead or admin) gets the same behaviour. The check runs inside `withAuth`, so it only sees guests that the caller's RLS allows.

## Acceptance criteria

API (covered by `apps/api/src/__tests__/guestDuplicates.test.ts`):

- [x] **Given** a guest with phone `04xxxxxxxx`, **when** a guest with a different name and the same phone written with spaces is registered, **then** 409 with that guest in `duplicates`, `matchedOn: ["phone"]`.
- [x] **Given** a guest with name N and birth date D, **when** a guest named N (different case and spacing) with birth date D is registered, **then** 409 with `matchedOn: ["name", "birthDate"]`.
- [x] **Given** a guest with name N and postcode P, **when** a guest named N with postcode `" P "` is registered, **then** 409 with `matchedOn: ["name", "postcode"]`.
- [x] **Given** a guest named N, **when** a guest named N with a different birth date and postcode is registered, **then** 201.
- [x] **Given** a possible duplicate, **when** registered with `?allowDuplicate=true`, **then** 201.

UI (manual):

- [x] On a 409, Register guest shows the warning with each match and the fields it matched on.
- [x] "Open existing profile" goes to `/guests/:id` for that guest; no new guest is created.
- [x] "Not the same person — register anyway" creates the guest and goes to their profile.
- [ ] With the warning showing, changing the phone (or name, birth date or postcode) hides the warning and shows "Save guest". Saving checks the new details again.
- [ ] `/api/docs` lists the `allowDuplicate` query parameter and the 409 response for `POST /api/guests`.

## Contract changes

- **Shared schemas** (`packages/shared/src/schemas/guest.ts`): `createGuestQuerySchema` (`allowDuplicate?: "true" | "false"`), `duplicateGuestSchema` (Guest + `matchedOn: ("phone"|"name"|"birthDate"|"postcode")[]`) and `duplicateGuestsResponseSchema`. The web app's `DuplicateGuest` type comes from these schemas.
- **API**: `POST /api/guests` gains the `allowDuplicate` query parameter and a new response, `409 { error, duplicates: DuplicateGuest[] }`. Both are registered in `openapi.ts`.
- **Web API client**: errors are thrown as `ApiError` carrying `status` and `body`, so callers can tell a 409 apart from other failures.
- **Database / RLS / audit log**: none. No new tables or columns, and the comparisons are done at query time.

## Out of scope

- Merging duplicate records that already exist.
- Fuzzy or phonetic name matching (e.g. "Jon" vs "John").
- Edits: they never block, and only a changed phone number is checked. See [002](../002-edit-guest/spec.md).

## Open questions

None. Duplicate warnings on edit are specified in [002 — Edit guest details](../002-edit-guest/spec.md).

## Decisions

- **409 with the matches in the body, not a separate "check" endpoint.** Doing the check and the insert in one request (and one `withAuth` transaction) means a client can't skip it by mistake. `allowDuplicate=true` is the explicit override.
- **Phone alone is enough; name alone isn't.** This matches the deduplication rule in `plan_project.md`: phone is the strongest disambiguator, and names collide.
- **Corrections are checked again** (added 2026-10-19). Previously, after the warning appeared, "register anyway" was the only way forward even if the volunteer had fixed a typo, so the corrected details were never checked. Only the four compared fields clear the warning. Editing language, dietary or notes can't change the result, so those leave it in place.
- **Normalised at query time, not stored.** No migration or extra columns. The guest table is small enough that `regexp_replace`/`lower` in the `WHERE` clause is fine at Stage 1 volumes.
