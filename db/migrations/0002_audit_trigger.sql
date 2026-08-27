-- Generic audit trigger, per plan_project.md Sprint 2. Written only by
-- this trigger, never by app code. SECURITY DEFINER so it can insert
-- into audit_log even though `authenticated` only has SELECT there.

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action public.audit_action;
  v_row_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_row_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_row_id := NEW.id;
  ELSE
    v_action := 'delete';
    v_row_id := OLD.id;
  END IF;

  INSERT INTO public.audit_log (table_name, row_id, action, actor_id, before, after)
  VALUES (
    TG_TABLE_NAME,
    v_row_id,
    v_action,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_guests AFTER INSERT OR UPDATE OR DELETE ON guests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_visits AFTER INSERT OR UPDATE OR DELETE ON visits
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_services AFTER INSERT OR UPDATE OR DELETE ON services
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_service_supports AFTER INSERT OR UPDATE OR DELETE ON service_supports
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_inventory_items AFTER INSERT OR UPDATE OR DELETE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_categories AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_support_categories AFTER INSERT OR UPDATE OR DELETE ON support_categories
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
