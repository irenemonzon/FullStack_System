import { z } from "zod";

export const genderEnum = z.enum(["woman", "man", "non_binary", "prefer_not_to_say"]);

export const createGuestSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  gender: genderEnum,
  birthDate: z.string().date("Birth date must be YYYY-MM-DD").optional(),
  postcode: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  preferredLanguage: z.string().min(1).optional(),
  dietary: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});
export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const updateGuestSchema = createGuestSchema.partial();
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

// All fields optional: a ranked search when any are given, or the most
// recently registered guests (a plain list) when none are.
export const guestSearchQuerySchema = z.object({
  firstName: z.string().min(1).optional(),
  birthDate: z.string().date().optional(),
  postcode: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
});
export type GuestSearchQuery = z.infer<typeof guestSearchQuerySchema>;

export const guestSchema = createGuestSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Guest = z.infer<typeof guestSchema>;
