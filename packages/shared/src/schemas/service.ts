import { z } from "zod";

export const serviceStationEnum = z.enum(["kitchen", "material_aid", "information"]);

// Kitchen/material_aid rows carry an inventory item + quantity (stock is
// decremented atomically alongside the insert — see routes/services.ts).
// Information rows carry supportCategoryIds + an optional note instead,
// and leave inventoryItemId/quantity unset.
export const createServiceSchema = z.discriminatedUnion("station", [
  z.object({
    station: z.literal("kitchen"),
    inventoryItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  }),
  z.object({
    station: z.literal("material_aid"),
    inventoryItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  }),
  z.object({
    station: z.literal("information"),
    supportCategoryIds: z.array(z.string().uuid()).min(1, "Select at least one support"),
    notes: z.string().min(1).optional(),
  }),
]);
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const serviceSchema = z.object({
  id: z.string().uuid(),
  visitId: z.string().uuid(),
  station: serviceStationEnum,
  inventoryItemId: z.string().uuid().nullable(),
  quantity: z.number().int().nullable(),
  details: z.object({ notes: z.string() }).nullable(),
  createdAt: z.string(),
  createdBy: z.string().uuid().nullable(),
});
export type Service = z.infer<typeof serviceSchema>;
