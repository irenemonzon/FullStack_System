-- Admin user management screen: lets an admin create/deactivate accounts
-- and reassign roles from within the app instead of the Supabase
-- dashboard-only flow described in plan_project.md's Sprint 2. `users`
-- previously only had a SELECT grant (see 0001_rls_policies.sql) — the
-- app's `authenticated` connection could not write to it at all, by
-- design, since account provisioning was Stage 1's dashboard-only path.
-- This migration extends that: only 'admin' may insert/update/delete
-- `public.users` rows (not 'lead' — account/role management is kept
-- stricter than the admin/lead reporting split used elsewhere).
GRANT INSERT, UPDATE, DELETE ON users TO authenticated;

CREATE POLICY users_admin_insert ON users FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY users_admin_update ON users FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY users_admin_delete ON users FOR DELETE
  USING (public.current_user_role() = 'admin');
