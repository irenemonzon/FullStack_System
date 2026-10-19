# 002 — Edit guest details

Status: approved
Branch: `edit-guest`

## Why

A guest's details change, or were entered wrong: a new phone number, a typo in the name, a birth date added on a later visit. Right now a volunteer can't fix any of this, because the app has no edit screen. `PATCH /api/guests/:id` exists, but nothing in the web app calls it. Phone numbers matter most, because phone is the main signal for spotting returning guests and duplicates (see [001](../001-duplicate-guest-warning/spec.md)).

## Behaviour

- The guest profile (`/guests/:id`) gets an **"Edit details"** button next to the guest's name.
- It opens an edit form with the same fields as Register guest: name, gender, birth date (DD/MM/YYYY), postcode, phone, language, dietary, notes. The fields are filled in with the current values.
- **Save** updates the guest and returns to the profile. **Cancel** returns without changing anything.
- Optional fields can be **cleared**: emptying the box removes the value (e.g. a phone number that no longer works).
- Any signed-in user (volunteer, lead or admin) can edit a guest. This matches what can be done today: the `guests_all` RLS policy already allows updates for every role, and the audit trigger already records each edit along with who made it.
- **Shared phone warning:** if the saved phone number (digits only, same comparison as 001) also belongs to **another** guest, the edit **is still saved**. Back on the profile, a warning shows: *"This phone number is also used by: <name> — Open profile"*, listing up to 5 guests. The warning has an **×** to close it.
  - The warning only appears if the phone was **changed** in this edit. Editing someone's notes doesn't warn about a number that was already shared.
  - Once closed, the warning stays closed. It isn't shown again on later visits to the profile.

## Acceptance criteria

API (new tests in `apps/api/src/__tests__/guestEdit.test.ts`):

- [ ] **Given** a guest, **when** `PATCH /api/guests/:id` changes their postcode, **then** 200 with the updated guest and `phoneSharedWith: []`.
- [ ] **Given** guest A with phone `0412345678` and guest B, **when** B's phone is changed to `0412 345 678`, **then** 200, B is saved with the new phone, and `phoneSharedWith` contains A.
- [ ] **Given** guests A and B sharing a phone already, **when** B's notes are edited, **then** `phoneSharedWith: []` (phone unchanged).
- [ ] **Given** a guest with a phone, **when** PATCH sends `phone: null`, **then** the phone is cleared.
- [ ] **Given** a guest, **when** PATCH sends `displayName: ""` or an invalid birth date, **then** 400 and nothing is changed.

UI (manual, iPad-sized viewport):

- [ ] "Edit details" on the profile opens the form, filled in with the current values.
- [ ] Changing the phone to one used by another guest saves, returns to the profile, and shows the warning with that guest and "Open profile".
- [ ] × closes the warning.
- [ ] Clearing the postcode and saving removes it from the profile.
- [ ] Cancel leaves the guest unchanged.

## Contract changes

- **Shared schemas** (`packages/shared/src/schemas/guest.ts`): `updateGuestSchema` lets the optional fields (birthDate, postcode, phone, preferredLanguage, dietary, notes) be `null` to clear them. Today it's `createGuestSchema.partial()`, which rejects both empty strings and `null`. New `updateGuestResponseSchema` = Guest + `phoneSharedWith: Guest[]`.
- **API**: the `PATCH /api/guests/:id` response gains `phoneSharedWith`, updated in `openapi.ts`. The phone lookup reuses the normalisation from 001 and excludes the guest being edited.
- **Web**: new route `/guests/:id/edit` (`EditGuest.tsx`). The guest form fields are shared with `RegisterGuest.tsx` rather than copied. `useUpdateGuest` (already exists, unused) also refreshes the guest lists.
- **Database / RLS / audit log**: none. The existing policy and audit trigger already cover updates.

## Out of scope

- Blocking an edit, or requiring confirmation, because of a shared phone. The edit always saves.
- Warning about name + birth date/postcode matches on edit. Only the phone is checked.
- Merging two guest records.
- Deleting a guest.
- Restricting editing to leads/admins.

## Open questions

None.

## Decisions

- **Save first, then warn on the profile** (decided 2026-10-19), rather than warning on the edit form with "Save anyway". It keeps editing to one step, and a shared number is allowed anyway.
- **Every role can edit** (decided 2026-10-19). This matches the existing `guests_all` policy, so no RLS change is needed.
- **Warn but don't block on edit, unlike registration.** By the time a guest is edited, they already have a record, so a shared number is more likely a real situation (a family phone, a support worker's number) than an accidental second registration.
