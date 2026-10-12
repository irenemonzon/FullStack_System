import { z } from "zod";

export const visitStatusEnum = z.enum(["open", "finished"]);

export const createVisitSchema = z.object({
  guestId: z.string().uuid(),
  notes: z.string().min(1).optional(),
});
export type CreateVisitInput = z.infer<typeof createVisitSchema>;

export const updateVisitSchema = z.object({
  status: visitStatusEnum.optional(),
  notes: z.string().min(1).optional(),
});
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;

export const visitQuerySchema = z.object({
  date: z.string().date("date must be YYYY-MM-DD").optional(),
});
export type VisitQuery = z.infer<typeof visitQuerySchema>;

export const visitSchema = z.object({
  id: z.string().uuid(),
  guestId: z.string().uuid(),
  volunteerId: z.string().uuid().nullable(),
  visitedAt: z.string(),
  status: visitStatusEnum,
  notes: z.string().nullable(),
});
export type Visit = z.infer<typeof visitSchema>;

// Paging for a guest's visit history (GET /api/guests/:id/history).
export const guestHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
  offset: z.coerce.number().int().min(0).default(0),
});
export type GuestHistoryQuery = z.infer<typeof guestHistoryQuerySchema>;
