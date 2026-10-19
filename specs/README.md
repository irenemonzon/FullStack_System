# Specs

Every feature built after Stage 1 starts here, as a written spec, before any code. The spec says **what** the feature does and why; the code is one implementation of it. When behaviour changes, the spec changes first (in the same branch), then the code.

Stage 1 itself is specified by the two root docs and isn't duplicated here — see [`000-stage-1/`](000-stage-1/README.md).

## Layout

```
specs/
  _template/               copy this folder to start a new feature
  000-stage-1/             pointer to scope_project.md / plan_project.md
  NNN-short-name/
    spec.md                what & why: behaviour, acceptance criteria, contract changes, out of scope
    plan.md                how: files touched, schema/API/migration changes, decisions and trade-offs
    tasks.md               ordered checklist, ticked off as the branch progresses
```

Number features in the order they're started (`001`, `002`, …). The folder name and the git branch name should match, minus the number (e.g. `001-duplicate-guest-warning` ↔ branch `duplicate-guest-warning`).

Small changes (a copy tweak, a styling fix, a bug fix that restores already-specified behaviour) don't need a spec. Anything that adds or changes behaviour a volunteer or admin would notice, or touches a Zod schema, an endpoint, the DB schema, RLS or the audit log, does.

## Workflow

1. **Spec** — copy `_template/` to `specs/NNN-name/` and fill in `spec.md`. Set `Status: draft`. Resolve every item under "Open questions" before moving on — those are decisions, not implementation details.
2. **Approve** — read the spec and change it to `Status: approved`. No implementation code before this point.
3. **Plan** — fill in `plan.md` (files, schema/migration changes, RLS and audit impact, decisions) and break it down in `tasks.md`.
4. **Contract first** — change the Zod schemas in `packages/shared` (and `db/schema.ts` / migrations) before route or screen code. They're the executable part of the spec, shared by the API, the web app and `/api/docs`.
5. **Tests from acceptance criteria** — each API-level acceptance criterion becomes a test in `apps/api/src/__tests__/`; UI-only criteria become manual checks listed in `tasks.md`.
6. **Implement** until the tests and manual checks pass.
7. **Reconcile before merging to `dev`** — if what was built differs from the spec, update the spec (and say why in its "Decisions" section). Set `Status: built`.

If a spec contradicts `plan_project.md` or `scope_project.md`, the spec must say so explicitly and why — the same convention `plan_project.md` already uses for its deviations from the scope.

## Project-specific checklist for every spec

- **RLS** — does a new table or column need policies in a hand-written migration (`npx drizzle-kit generate --custom`)? Does every new query run through `withAuth`?
- **Audit log** — does a new mutating table need the audit trigger?
- **Roles** — which of volunteer / lead / admin can do this, and is it enforced at the DB layer, not just `requireRole`?
- **Stage boundary** — does this build toward Stage 2 (donations, donors, stock movements)? If so, it's out of scope.
- **Device** — primary device is an iPad at the door: touch-sized targets, works on a shared, always-signed-in device.
