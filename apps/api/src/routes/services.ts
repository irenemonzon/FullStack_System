import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createServiceSchema, serviceSchema } from "@support-hub/shared";
import { withAuth, schema } from "../lib/db.js";
import { registry } from "../lib/openapi.js";

const { services, serviceSupports, inventoryItems } = schema;
const router = Router();

// Thrown inside a withAuth transaction to short-circuit with a specific
// HTTP status (e.g. 409 for insufficient stock) instead of a generic 500.
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

registry.registerPath({
  method: "post",
  path: "/visits/{id}/services",
  description:
    "Log one station action for a visit. Kitchen/material_aid decrement quantity_on_hand transactionally and are rejected with 409 if not enough stock remains; information logs supportCategoryIds + an optional note.",
  tags: ["Services"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: createServiceSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: serviceSchema } } },
    404: { description: "Inventory item not found" },
    409: { description: "Insufficient stock" },
  },
});

router.post("/visits/:id/services", async (req, res) => {
  const parsed = createServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }
  const input = parsed.data;
  const visitId = req.params.id;

  try {
    const row = await withAuth(req.auth!, async (tx) => {
      if (input.station === "information") {
        const [service] = await tx
          .insert(services)
          .values({
            visitId,
            station: "information",
            details: input.notes ? { notes: input.notes } : null,
            createdBy: req.auth!.userId,
          })
          .returning();

        await tx
          .insert(serviceSupports)
          .values(input.supportCategoryIds.map((supportCategoryId) => ({ serviceId: service.id, supportCategoryId })));

        return service;
      }

      // Kitchen/material_aid: lock the row so two concurrent requests
      // can't both pass the stock check against the same starting count.
      const [item] = await tx
        .select({ quantityOnHand: inventoryItems.quantityOnHand })
        .from(inventoryItems)
        .where(eq(inventoryItems.id, input.inventoryItemId))
        .for("update");
      if (!item) {
        throw new HttpError(404, "Inventory item not found");
      }
      if (item.quantityOnHand !== null && item.quantityOnHand < input.quantity) {
        throw new HttpError(409, `Only ${item.quantityOnHand} left in stock`);
      }

      const [service] = await tx
        .insert(services)
        .values({
          visitId,
          station: input.station,
          inventoryItemId: input.inventoryItemId,
          quantity: input.quantity,
          createdBy: req.auth!.userId,
        })
        .returning();

      if (item.quantityOnHand !== null) {
        await tx
          .update(inventoryItems)
          .set({ quantityOnHand: item.quantityOnHand - input.quantity })
          .where(eq(inventoryItems.id, input.inventoryItemId));
      }

      return service;
    });
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
});

registry.registerPath({
  method: "delete",
  path: "/services/{id}",
  description: "Undo a mis-logged service; restores quantity_on_hand if it was a kitchen/material_aid entry",
  tags: ["Services"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 204: { description: "Deleted" }, 404: { description: "Not found" } },
});

router.delete("/services/:id", async (req, res) => {
  const found = await withAuth(req.auth!, async (tx) => {
    // service_supports has no ON DELETE CASCADE to services, so an
    // information-station row's children must go first or the delete
    // below fails on the FK constraint.
    await tx.delete(serviceSupports).where(eq(serviceSupports.serviceId, req.params.id));

    const [service] = await tx.delete(services).where(eq(services.id, req.params.id)).returning();
    if (!service) return false;

    if (service.inventoryItemId && service.quantity !== null) {
      const [item] = await tx
        .select({ quantityOnHand: inventoryItems.quantityOnHand })
        .from(inventoryItems)
        .where(eq(inventoryItems.id, service.inventoryItemId))
        .for("update");
      if (item?.quantityOnHand !== null && item?.quantityOnHand !== undefined) {
        await tx
          .update(inventoryItems)
          .set({ quantityOnHand: item.quantityOnHand + service.quantity })
          .where(eq(inventoryItems.id, service.inventoryItemId));
      }
    }
    return true;
  });

  if (!found) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});

export default router;
