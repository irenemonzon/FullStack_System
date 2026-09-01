import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createUserSchema, updateUserSchema, userSchema } from "@support-hub/shared";
import { withAuth, schema } from "../lib/db.js";
import { registry } from "../lib/openapi.js";
import { requireRole } from "../middleware/requireRole.js";
import { createAuthUser, deleteAuthUser, SupabaseAdminError } from "../lib/supabaseAdmin.js";

const { users } = schema;
const router = Router();

registry.registerPath({
  method: "get",
  path: "/users/me",
  description: "The signed-in user's own profile, including their role — the frontend uses this to decide whether to show the Admin screen",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Own profile", content: { "application/json": { schema: userSchema } } } },
});

// Must come before GET /:id-shaped routes below — there are none here,
// but keep /me first regardless so it never risks being shadowed later.
router.get("/me", async (req, res) => {
  const [row] = await withAuth(req.auth!, (tx) => tx.select().from(users).where(eq(users.id, req.auth!.userId)));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

registry.registerPath({
  method: "get",
  path: "/users",
  description: "List every provisioned account (admin only)",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Users", content: { "application/json": { schema: z.array(userSchema) } } },
    403: { description: "Forbidden — admin only" },
  },
});

router.get("/", requireRole("admin"), async (req, res) => {
  const rows = await withAuth(req.auth!, (tx) => tx.select().from(users).orderBy(users.fullName));
  res.json(rows);
});

registry.registerPath({
  method: "post",
  path: "/users",
  description: "Provision a new account: creates the Supabase Auth login and the matching public.users row in one step (admin only)",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createUserSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: userSchema } } },
    403: { description: "Forbidden — admin only" },
    409: { description: "Email already in use" },
  },
});

router.post("/", requireRole("admin"), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }
  const { email, password, fullName, role } = parsed.data;

  try {
    const authUser = await createAuthUser(email, password);
    const [row] = await withAuth(req.auth!, (tx) =>
      tx.insert(users).values({ id: authUser.id, email, fullName, role }).returning(),
    );
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof SupabaseAdminError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
});

registry.registerPath({
  method: "patch",
  path: "/users/{id}",
  description: "Edit a user's name, reassign their role, or reactivate a deactivated account (admin only)",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateUserSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: userSchema } } },
    403: { description: "Forbidden — admin only" },
    404: { description: "Not found" },
  },
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const [row] = await withAuth(req.auth!, (tx) =>
    tx.update(users).set(parsed.data).where(eq(users.id, req.params.id)).returning(),
  );
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

registry.registerPath({
  method: "delete",
  path: "/users/{id}",
  description:
    "Revoke a user's login. If they have no guests/visits/services/audit history the row is deleted outright; otherwise it's deactivated (active=false) to preserve the audit trail (admin only, can't target yourself)",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Deleted or deactivated", content: { "application/json": { schema: userSchema } } },
    400: { description: "Cannot delete your own account" },
    403: { description: "Forbidden — admin only" },
    404: { description: "Not found" },
  },
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  if (req.params.id === req.auth!.userId) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }

  await deleteAuthUser(req.params.id);

  try {
    const [row] = await withAuth(req.auth!, (tx) => tx.delete(users).where(eq(users.id, req.params.id)).returning());
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    // FK violation (23503): this user created guests/visits/services or
    // has audit_log rows — those relations have no ON DELETE CASCADE by
    // design (the audit trail must never silently lose its actor), so
    // deactivate instead of hard-deleting.
    if ((err as { code?: string }).code === "23503") {
      const [row] = await withAuth(req.auth!, (tx) =>
        tx.update(users).set({ active: false }).where(eq(users.id, req.params.id)).returning(),
      );
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(row);
      return;
    }
    throw err;
  }
});

export default router;
