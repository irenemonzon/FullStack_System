import { z } from "zod";

export const catalogueStationEnum = z.enum(["kitchen", "material_aid"]);
export const genderFitEnum = z.enum(["mens", "womens", "unisex", "kids"]);

export const categorySchema = z.object({
  id: z.string().uuid(),
  station: catalogueStationEnum,
  name: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const categoryQuerySchema = z.object({
  station: catalogueStationEnum.optional(),
});
export type CategoryQuery = z.infer<typeof categoryQuerySchema>;

export const createInventoryItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  size: z.string().min(1).optional(),
  genderFit: genderFitEnum.optional(),
  unit: z.string().min(1, "Unit is required"),
  perGuestLimit: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  // Stage 1 mock stock — see plan_project.md Sprint 4.
  quantityOnHand: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = createInventoryItemSchema.partial();
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

export const inventoryItemSchema = createInventoryItemSchema.extend({
  id: z.string().uuid(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export const inventoryQuerySchema = z.object({
  station: catalogueStationEnum.optional(),
  categoryId: z.string().uuid().optional(),
});
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;

export const supportCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
export type SupportCategory = z.infer<typeof supportCategorySchema>;
