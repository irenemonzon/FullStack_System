# NNN — Feature name: tasks

## Build

- [ ] Shared Zod schema changes
- [ ] DB schema / migrations (incl. RLS and audit trigger if a table is added)
- [ ] API route changes, registered in `apps/api/src/lib/openapi.ts`
- [ ] API tests for each API-level acceptance criterion
- [ ] Frontend changes
- [ ] `pnpm --filter api test` and `pnpm -r build` pass

## Manual checks

- [ ] One per UI-level acceptance criterion, on an iPad-sized viewport

## Before merging

- [ ] `spec.md` matches what was built; `Status: built`
