import { Router } from "express";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { supportCategorySchema } from "@support-hub/shared";
import { withAuth, schema } from "../lib/db.js";
import { registry } from "../lib/openapi.js";

const { supportCategories } = schema;
const router = Router();

registry.registerPath({
  method: "get",
  path: "/support-categories",
  description: "The fixed list of support categories guests can be signposted to at the information station",
  tags: ["Support Categories"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Support categories",
      content: { "application/json": { schema: z.array(supportCategorySchema) } },
    },
  },
});

router.get("/", async (req, res) => {
  // Stable ordering so the checklist doesn't reshuffle between fetches
  // (Postgres makes no ordering guarantee without ORDER BY).
  const rows = await withAuth(req.auth!, (tx) => tx.select().from(supportCategories).orderBy(asc(supportCategories.name)));
  res.json(rows);
});

export default router;
