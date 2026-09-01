import { z } from "zod";

export const reportQuerySchema = z.object({
  from: z.string().date("from must be YYYY-MM-DD").optional(),
  to: z.string().date("to must be YYYY-MM-DD").optional(),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const reachReportItemSchema = z.object({
  inventoryItemId: z.string().uuid(),
  name: z.string(),
  station: z.enum(["kitchen", "material_aid"]),
  quantity: z.number(),
});

export const reachReportSupportSchema = z.object({
  supportCategoryId: z.string().uuid(),
  name: z.string(),
  count: z.number(),
});

export const reachReportSchema = z.object({
  from: z.string().nullable(),
  to: z.string().nullable(),
  uniqueGuests: z.number(),
  visits: z.number(),
  newGuests: z.number(),
  returningGuests: z.number(),
  items: z.array(reachReportItemSchema),
  supportsSignposted: z.array(reachReportSupportSchema),
  supportsSignpostedTotal: z.number(),
});
export type ReachReport = z.infer<typeof reachReportSchema>;
