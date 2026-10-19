# 001 — Duplicate guest warning: plan

(Written retroactively — describes what commit `209c6b1` built.)

## Approach

`POST /api/guests` runs `findPossibleDuplicates` inside the same `withAuth` transaction as the insert. It returns 409 with the matches instead of inserting, unless `allowDuplicate=true`. The web client turns the 409 into an `ApiError`, and Register guest renders the matches with two ways forward.

## Files

**Shared**
- `packages/shared/src/schemas/guest.ts`: `createGuestQuerySchema`

**Backend**
- `apps/api/src/routes/guests.ts`: `findPossibleDuplicates` (normalised SQL comparisons, limit 5, newest first, `matchedOn` computed per row) and the 409 branch in `POST /`

**Frontend**
- `apps/web/src/lib/apiClient.ts`: `ApiError` with `status` and `body`
- `apps/web/src/lib/queries/guests.ts`: `useCreateGuest` takes `{ input, allowDuplicate }`; `DuplicateGuest` type
- `apps/web/src/components/DuplicateGuestWarning.tsx`: the warning panel
- `apps/web/src/screens/RegisterGuest.tsx`: `save(allowDuplicate)`, which shows the warning on a 409

**Follow-up fixes (2026-10-19)**
- `RegisterGuest.tsx`: changing name, birth date, postcode or phone clears `duplicates` (in the form change handler since 002)
- `guest.ts` (shared): `duplicateGuestSchema` / `duplicateGuestsResponseSchema`, used by the 409 entry in the `POST /guests` OpenAPI registration and by the web `DuplicateGuest` type

**Tests**
- `apps/api/src/__tests__/guestDuplicates.test.ts`

## Trade-offs

- A separate pre-check endpoint (`GET /api/guests/duplicates`) was the alternative. It was rejected because a client could forget to call it, and there'd be a gap between the check and the insert.
