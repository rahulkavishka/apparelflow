import { z } from "zod";

export const loginSchema = z
  .object({
    email: z
      .string()
      .email("A valid email address is required")
      .max(100, "Email cannot exceed 100 characters")
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(1, "Password is required")
      .max(128, "Password cannot exceed 128 characters"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
