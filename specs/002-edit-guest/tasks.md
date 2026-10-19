# 002 — Edit guest details: tasks

## Build

- [x] Shared Zod schema changes (`updateGuestSchema` nullable fields, `updateGuestResponseSchema`)
- [x] DB schema / migrations: none needed (existing `guests_all` policy and audit trigger cover updates)
- [x] `PATCH /api/guests/:id` returns `phoneSharedWith`; OpenAPI entry updated
- [x] API tests for each API-level acceptance criterion (`guestEdit.test.ts`)
- [x] Shared `GuestFormFields`; Register guest moved onto it
- [x] Edit guest screen and route; "Edit details" on the profile; shared phone warning with ×
- [x] `pnpm --filter api test` (27/27) and `pnpm -r build` pass

## Manual checks

- [ ] "Edit details" on the profile opens the form, filled in with the current values (including birth date as DD/MM/YYYY)
- [ ] Changing the phone to one used by another guest saves, returns to the profile, and shows the warning with that guest and "Open profile"
- [ ] × closes the warning; refreshing the page doesn't bring it back
- [ ] Clearing the postcode and saving removes it from the profile
- [ ] Cancel leaves the guest unchanged
- [ ] Register guest still works, including the duplicate warning and the "edit a field → Save guest comes back" fix from 001
- [ ] All of the above on an iPad-sized viewport

## Before merging

- [ ] `spec.md` matches what was built; `Status: built`
