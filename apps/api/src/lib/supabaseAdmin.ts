import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../env.js";

// Thin wrapper over Supabase Auth's Admin REST API — used only by
// routes/users.ts for the admin user-management screen. Requires the
// service role key, so this must never be imported by anything the
// frontend can influence the inputs of beyond an already-admin-gated route.
const adminHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

export class SupabaseAdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function createAuthUser(email: string, password: string): Promise<{ id: string }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const body = (await res.json()) as { id?: string; msg?: string; error_description?: string };
  if (!res.ok || !body.id) {
    throw new SupabaseAdminError(res.status === 422 ? 409 : 502, body.msg ?? body.error_description ?? "Could not create login");
  }
  return { id: body.id };
}

export async function deleteAuthUser(id: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  // 404 is fine here — the auth user may already be gone; we still want
  // the caller to proceed with cleaning up the public.users row.
  if (!res.ok && res.status !== 404) {
    const body = (await res.json().catch(() => ({}))) as { msg?: string };
    throw new SupabaseAdminError(502, body.msg ?? "Could not delete login");
  }
}
