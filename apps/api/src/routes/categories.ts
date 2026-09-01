import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { categoryQuerySchema, categorySchema } from "@support-hub/shared";
import { withAuth, schema } from "../lib/db.js";
import { registry } from "../lib/openapi.js";

const { categories } = schema;
const router = Router();

registry.registerPath({
  method: "get",
  path: "/categories",
  description: "Item categories, optionally filtered by station",
  tags: ["Categories"],
  security: [{ bearerAuth: [] }],
  request: { query: categoryQuerySchema },
  responses: {
    200: { description: "Categories", content: { "application/json": { schema: z.array(categorySchema) } } },
  },
});

router.get("/", async (req, res) => {
  const parsed = categoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }
  const { station } = parsed.data;

  const rows = await withAuth(req.auth!, (tx) => {
    const query = tx.select().from(categories).$dynamic();
    return station ? query.where(eq(categories.station, station)) : query;
  });
  res.json(rows);
});

export default router;
