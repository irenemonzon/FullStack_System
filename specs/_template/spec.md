# NNN — Feature name

Status: draft | approved | built
Branch: `feature-branch-name`

## Why

The volunteer/admin problem this solves, in one or two sentences.

## Behaviour

- User-visible rules, in plain language.
- Who can do it (volunteer / lead / admin).
- Edge cases: missing optional fields, an open visit already exists, a shared device, etc.

## Acceptance criteria

Each one becomes an API test in `apps/api/src/__tests__/` or a manual check in `tasks.md`.

- [ ] **Given** …, **when** …, **then** …

## Contract changes

- **Shared schemas** (`packages/shared/src/schemas/`): …
- **API** (method, path, request, responses incl. error statuses; registered in `openapi.ts`): …
- **Database** (`db/schema.ts`, migrations): …
- **RLS / audit log**: … (or "none — no new tables or columns")

## Out of scope

What this deliberately doesn't do.

## Open questions

Decisions that must be made before the spec is approved. Empty when `Status: approved`.

## Decisions

Choices made along the way (including deviations from `plan_project.md` / `scope_project.md`) and why.
