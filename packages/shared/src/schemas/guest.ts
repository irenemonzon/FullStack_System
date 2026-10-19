import { z } from "zod";

export const genderEnum = z.enum(["woman", "man", "non_binary", "prefer_not_to_say"]);

export const createGuestSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  gender: genderEnum,
  // Sent as ISO YYYY-MM-DD; the web app converts from the DD/MM/YYYY it shows.
  birthDate: z.string().date("Birth date must be a valid date").optional(),
  postcode: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  preferredLanguage: z.string().min(1).optional(),
  dietary: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});
export type CreateGuestInput = z.infer<typeof createGuestSchema>;

// POST /api/guests?allowDuplicate=true skips the duplicate check, once the
// volunteer has confirmed the possible match is a different person.
export const createGuestQuerySchema = z.object({
  allowDuplicate: z.enum(["true", "false"]).optional(),
});

// Edits can send null for an optional field to clear it (e.g. a phone
// number that no longer works); name and gender can be changed but not removed.
export const updateGuestSchema = createGuestSchema.partial().extend({
  birthDate: createGuestSchema.shape.birthDate.unwrap().nullable().optional(),
  postcode: createGuestSchema.shape.postcode.unwrap().nullable().optional(),
  phone: createGuestSchema.shape.phone.unwrap().nullable().optional(),
  preferredLanguage: createGuestSchema.shape.preferredLanguage.unwrap().nullable().optional(),
  dietary: createGuestSchema.shape.dietary.unwrap().nullable().optional(),
  notes: createGuestSchema.shape.notes.unwrap().nullable().optional(),
});
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

// A possible existing record returned (409) when registering a guest, with
// the fields it matched the new guest on.
export const duplicateGuestSchema = guestSchema.extend({
  matchedOn: z.array(z.enum(["phone", "name", "birthDate", "postcode"])),
});
export type DuplicateGuest = z.infer<typeof duplicateGuestSchema>;

export const duplicateGuestsResponseSchema = z.object({
  error: z.string(),
  duplicates: z.array(duplicateGuestSchema),
});

// PATCH /api/guests/:id saves even if the new phone number belongs to other
// guests, and lists them (up to 5) so the volunteer can be told. Empty when
// the phone wasn't changed.
export const updateGuestResponseSchema = guestSchema.extend({
  phoneSharedWith: z.array(guestSchema),
});
export type UpdateGuestResponse = z.infer<typeof updateGuestResponseSchema>;
