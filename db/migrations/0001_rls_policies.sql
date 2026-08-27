-- Row Level Security for Stage 1. Enforced at the DB layer per role
-- (volunteer < admin < lead), per plan_project.md Sprint 2.
--
-- The API connects using the `postgres` (owner) role but switches the
-- session to `authenticated` per-request (see apps/api/src/lib/db.ts),
-- setting request.jwt.claims so auth.uid() resolves correctly. RLS is
-- NOT enforced against the `postgres`/service_role connections (they
-- bypass it, as expected — e.g. drizzle-kit migrations, admin scripts).

-- Helper: current signed-in user's role, or NULL if no matching/active
-- users row. SECURITY DEFINER so policies on `users` itself don't
-- recurse into RLS when this function reads from `users`.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND active = true;
$$;

GRANT USAGE ON SCHEMA public TO authenticated;

-- ---------- users ----------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON users TO authenticated;

CREATE POLICY users_select ON users FOR SELECT
  USING (id = auth.uid() OR public.current_user_role() IN ('admin', 'lead'));

-- ---------- guests / visits / services / service_supports ----------
-- Any active volunteer/admin/lead can read and write these.
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON guests TO authenticated;
CREATE POLICY guests_all ON guests FOR ALL
  USING (public.current_user_role() IS NOT NULL)
  WITH CHECK (public.current_user_role() IS NOT NULL);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON visits TO authenticated;
CREATE POLICY visits_all ON visits FOR ALL
  USING (public.current_user_role() IS NOT NULL)
  WITH CHECK (public.current_user_role() IS NOT NULL);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON services TO authenticated;
CREATE POLICY services_all ON services FOR ALL
  USING (public.current_user_role() IS NOT NULL)
  WITH CHECK (public.current_user_role() IS NOT NULL);

ALTER TABLE service_supports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON service_supports TO authenticated;
CREATE POLICY service_supports_all ON service_supports FOR ALL
  USING (public.current_user_role() IS NOT NULL)
  WITH CHECK (public.current_user_role() IS NOT NULL);

-- ---------- categories / inventory_items / support_categories ----------
-- Read-only for volunteers; admin/lead can also manage (write).
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
CREATE POLICY categories_read ON categories FOR SELECT
  USING (public.current_user_role() IS NOT NULL);
CREATE POLICY categories_write ON categories FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'lead'));
CREATE POLICY categories_update ON categories FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'lead'))
  WITH CHECK (public.current_user_role() IN ('admin', 'lead'));
CREATE POLICY categories_delete ON categories FOR DELETE
  USING (public.current_user_role() IN ('admin', 'lead'));

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_items TO authenticated;
CREATE POLICY inventory_items_read ON inventory_items FOR SELECT
  USING (public.current_user_role() IS NOT NULL);
CREATE POLICY inventory_items_write ON inventory_items FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'lead'));
CREATE POLICY inventory_items_delete ON inventory_items FOR DELETE
  USING (public.current_user_role() IN ('admin', 'lead'));

-- UPDATE is allowed row-wise for any active user (volunteers need to be
-- able to decrement/restore quantity_on_hand while logging/undoing a
-- service), but RLS policies can't restrict which *columns* change —
-- that's enforced below by a trigger: non-admin/lead sessions may only
-- ever change quantity_on_hand, nothing else on the catalogue row.
CREATE POLICY inventory_items_update ON inventory_items FOR UPDATE
  USING (public.current_user_role() IS NOT NULL)
  WITH CHECK (public.current_user_role() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.enforce_inventory_items_column_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.current_user_role() NOT IN ('admin', 'lead') THEN
    IF (to_jsonb(OLD) - 'quantity_on_hand') IS DISTINCT FROM (to_jsonb(NEW) - 'quantity_on_hand') THEN
      RAISE EXCEPTION 'Only admin/lead may modify inventory_items catalogue fields; other roles may only adjust quantity_on_hand via service logging';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_items_column_guard
BEFORE UPDATE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_inventory_items_column_guard();

ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON support_categories TO authenticated;
CREATE POLICY support_categories_read ON support_categories FOR SELECT
  USING (public.current_user_role() IS NOT NULL);
CREATE POLICY support_categories_write ON support_categories FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'lead'));
CREATE POLICY support_categories_update ON support_categories FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'lead'))
  WITH CHECK (public.current_user_role() IN ('admin', 'lead'));
CREATE POLICY support_categories_delete ON support_categories FOR DELETE
  USING (public.current_user_role() IN ('admin', 'lead'));

-- ---------- audit_log ----------
-- Read-only for admin/lead; never written by app code (see 0002).
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON audit_log TO authenticated;
CREATE POLICY audit_log_read ON audit_log FOR SELECT
  USING (public.current_user_role() IN ('admin', 'lead'));
