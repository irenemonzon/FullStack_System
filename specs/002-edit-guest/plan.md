# 002 — Edit guest details: plan

## Approach

`PATCH /api/guests/:id` reads the guest's current phone, applies the update, and if the phone changed to a non-empty number, looks up other guests with the same digits (the same normalisation as 001). It returns them as `phoneSharedWith`. The new Edit guest screen sends the whole form, with empty optional fields as `null`, then goes back to the profile and passes `phoneSharedWith` along in the router's history state. The profile shows the warning from that state. The × clears it by replacing the history entry, so the warning stays closed on refresh or Back.

## Files

**Shared**
- `packages/shared/src/schemas/guest.ts`: `updateGuestSchema` allows `null` for optional fields; new `updateGuestResponseSchema` / `UpdateGuestResponse`

**Backend**
- `apps/api/src/routes/guests.ts`: `PATCH /:id` (shared phone lookup, OpenAPI entry with the new response and 400)

**Frontend**
- `apps/web/src/components/GuestFormFields.tsx` (new): the guest fields, `GuestFormValues`, `emptyGuestForm`, `guestToFormValues`, `readGuestForm`. Both screens use them.
- `apps/web/src/screens/RegisterGuest.tsx`: uses `GuestFormFields`. The duplicate warning is now cleared in the change handler, replacing the earlier effect.
- `apps/web/src/screens/EditGuest.tsx` (new), with its route `/guests/:guestId/edit` in `App.tsx`
- `apps/web/src/screens/GuestProfile.tsx`: "Edit details" button and the shared phone warning
- `apps/web/src/components/SharedPhoneWarning.tsx` (new), `icons.tsx` (`XIcon`)
- `apps/web/src/lib/queries/guests.ts`: `useUpdateGuest` returns `UpdateGuestResponse` and refreshes every guest query

**Tests**
- `apps/api/src/__tests__/guestEdit.test.ts`

## Trade-offs

- **Router state rather than a stored "dismissed" flag.** The warning only exists right after a save, so nothing needs to be stored in the database. This matches "once closed, it stays closed".
- **Profile ↔ edit swap via `replace`.** Opening, saving and cancelling all replace the current history entry, so the browser's Back goes to wherever the volunteer was before the profile, not back to the profile a second time.
