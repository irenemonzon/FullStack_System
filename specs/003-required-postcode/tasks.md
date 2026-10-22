# 003 — Required postcode, and * for required fields: tasks

## Build

- [x] Shared Zod schema changes
- [x] Migration `0004_backfill_guest_postcode.sql` (no schema change)
- [x] Migration applied (`pnpm --filter db migrate`)
- [x] API route descriptions in `openapi` registrations
- [x] API tests for each API-level acceptance criterion
- [x] Frontend changes
- [x] `pnpm --filter api test` and `pnpm -r build` pass

## Manual checks

- [x] No guest has a null or blank postcode after migrating
- [ ] Name, Gender and Postcode labels show `*`; no "(required)"
- [ ] Register with no postcode shows an error and doesn't submit
- [ ] "No postcode" fills in 3012 and the guest saves
- [ ] Editing a guest and clearing the postcode shows an error and doesn't save

## Before merging

- [x] `spec.md` matches what was built; `Status: built`
