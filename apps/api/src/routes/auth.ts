import { Router } from "express";
import { z } from "zod";
import { loginSchema } from "@support-hub/shared";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../env.js";
import { registry } from "../lib/openapi.js";

const router = Router();

registry.registerPath({
  method: "post",
  path: "/auth/login",
  description:
    "Dev/testing convenience: exchange email+password for a Supabase access token. Not used by the real frontend, which calls Supabase directly.",
  tags: ["Auth"],
  request: { body: { content: { "application/json": { schema: loginSchema } } } },
  responses: {
    200: {
      description: "Access token",
      content: { "application/json": { schema: z.object({ accessToken: z.string(), expiresIn: z.number() }) } },
    },
    401: { description: "Incorrect email or password" },
  },
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const supabaseRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  const body = (await supabaseRes.json()) as { access_token?: string; expires_in?: number };

  if (!supabaseRes.ok || !body.access_token) {
    res.status(401).json({ error: "Incorrect email or password" });
    return;
  }

  res.json({ accessToken: body.access_token, expiresIn: body.expires_in });
});

export default router;
