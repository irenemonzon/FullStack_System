# 003 — Required postcode, and * for required fields: plan

## Approach

Make `postcode` required (trimmed, non-empty) in `createGuestSchema`, which `updateGuestSchema` inherits as "optional but not null". The form checks for a postcode before building the payload so the volunteer sees a friendly message, labels required fields with `*`, and adds a "No postcode" button that fills in 3012.

## Files

**Shared / DB**
- `packages/shared/src/schemas/guest.ts` — `displayName`/`postcode` trimmed and required; drop the nullable `postcode` override from `updateGuestSchema`; `guestSchema.postcode` nullable.
- No DB change.

**Backend**
- `apps/api/src/routes/guests.ts` — POST/PATCH descriptions in OpenAPI. Validation comes from the schemas.

**Frontend**
- `apps/web/src/components/GuestFormFields.tsx` — `*` labels, postcode `required`, "No postcode" button, postcode check in `readGuestForm`.

**Tests**
- `apps/api/src/__tests__/guestRequiredFields.test.ts` (new); `guestEdit.test.ts` and `guestDuplicates.test.ts` updated to send a postcode, and the edit test no longer clears it.

## Trade-offs

- Enforcing in the app only (no `NOT NULL`) avoids backfilling real records with a guessed postcode.
