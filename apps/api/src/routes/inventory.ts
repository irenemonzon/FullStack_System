import { Router } from "express";
import { eq, and, asc, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  inventoryQuerySchema,
  inventoryItemSchema,
  createInventoryItemSchema,
  updateInventoryItemSchema,
} from "@support-hub/shared";
import { withAuth, schema } from "../lib/db.js";
import { registry } from "../lib/openapi.js";
import { requireRole } from "../middleware/requireRole.js";

const { inventoryItems, categories } = schema;
const router = Router();

registry.registerPath({
  method: "get",
  path: "/inventory",
  description: "Item catalogue for the picklist, including mock stock counts (quantity_on_hand/low_stock_threshold)",
  tags: ["Inventory"],
  security: [{ bearerAuth: [] }],
  request: { query: inventoryQuerySchema },
  responses: {
    200: { description: "Inventory items", content: { "application/json": { schema: z.array(inventoryItemSchema) } } },
  },
});

router.get("/", async (req, res) => {
  const parsed = inventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }
  const { station, categoryId } = parsed.data;

  const conditions: SQL[] = [];
  if (categoryId) conditions.push(eq(inventoryItems.categoryId, categoryId));
  if (station) conditions.push(eq(categories.station, station));

  const rows = await withAuth(req.auth!, (tx) => {
    const query = tx
      .select({
        id: inventoryItems.id,
        categoryId: inventoryItems.categoryId,
        name: inventoryItems.name,
        size: inventoryItems.size,
        genderFit: inventoryItems.genderFit,
        unit: inventoryItems.unit,
        perGuestLimit: inventoryItems.perGuestLimit,
        active: inventoryItems.active,
        quantityOnHand: inventoryItems.quantityOnHand,
        lowStockThreshold: inventoryItems.lowStockThreshold,
      })
      .from(inventoryItems)
      .innerJoin(categories, eq(inventoryItems.categoryId, categories.id))
      .$dynamic();
    const filtered = conditions.length ? query.where(and(...conditions)) : query;
    // Stable ordering so the picklist doesn't reshuffle after a stock update
    // (Postgres makes no ordering guarantee without ORDER BY).
    return filtered.orderBy(asc(inventoryItems.name));
  });
  res.json(rows);
});

registry.registerPath({
  method: "post",
  path: "/inventory",
  description: "Create a catalogue item (admin/lead only)",
  tags: ["Inventory"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createInventoryItemSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: inventoryItemSchema } } },
    403: { description: "Forbidden — admin/lead only" },
  },
});

router.post("/", requireRole("admin", "lead"), async (req, res) => {
  const parsed = createInventoryItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const [row] = await withAuth(req.auth!, (tx) => tx.insert(inventoryItems).values(parsed.data).returning());
  res.status(201).json(row);
});

registry.registerPath({
  method: "patch",
  path: "/inventory/{id}",
  description: "Update a catalogue item (admin/lead only)",
  tags: ["Inventory"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateInventoryItemSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: inventoryItemSchema } } },
    403: { description: "Forbidden — admin/lead only" },
    404: { description: "Not found" },
  },
});

router.patch("/:id", requireRole("admin", "lead"), async (req, res) => {
  const parsed = updateInventoryItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const [row] = await withAuth(req.auth!, (tx) =>
    tx.update(inventoryItems).set(parsed.data).where(eq(inventoryItems.id, req.params.id)).returning(),
  );
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

export default router;
