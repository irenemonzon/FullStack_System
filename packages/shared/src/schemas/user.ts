import { z } from "zod";

export const userRoleEnum = z.enum(["volunteer", "admin", "lead"]);

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1),
  role: userRoleEnum.default("volunteer"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: userRoleEnum.optional(),
  active: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  role: userRoleEnum,
  active: z.boolean(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;
