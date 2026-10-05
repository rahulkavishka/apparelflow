import { z } from "zod";
import { OrderStatus } from "@prisma/client";

const twoDp = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-9;

export const createOrderSchema = z
  .object({
    recipeId: z.string().uuid("Invalid recipe ID format"),
    targetQty: z
      .number({ message: "Target quantity must be a number" })
      .int("Target quantity must be a whole number with no decimals")
      .min(1, "Target quantity must be at least 1")
      .max(100000, "Target quantity cannot exceed 100,000 units"),
    fabricRollId: z
      .string()
      .trim()
      .min(3, "Fabric roll ID must be at least 3 characters")
      .max(40, "Fabric roll ID cannot exceed 40 characters")
      .regex(
        /^[A-Z0-9-]+$/,
        "Fabric roll ID must contain uppercase letters, numbers, or hyphens only (e.g. FAB-ROLL-882)"
      ),
    actualFabricYds: z
      .number({ message: "Actual fabric used must be a number" })
      .positive("Actual fabric used must be a positive number")
      .max(99999.99, "Actual fabric cannot exceed 99,999.99 yards")
      .refine(twoDp, "Actual fabric yards can have at most 2 decimal places"),
  })
  .strict();

export const patchOrderSchema = z
  .object({
    targetQty: z
      .number({ message: "Target quantity must be a number" })
      .int("Target quantity must be a whole number with no decimals")
      .min(1, "Target quantity must be at least 1")
      .max(100000, "Target quantity cannot exceed 100,000 units")
      .optional(),
    fabricRollId: z
      .string()
      .trim()
      .min(3, "Fabric roll ID must be at least 3 characters")
      .max(40, "Fabric roll ID cannot exceed 40 characters")
      .regex(
        /^[A-Z0-9-]+$/,
        "Fabric roll ID must contain uppercase letters, numbers, or hyphens only (e.g. FAB-ROLL-882)"
      )
      .optional(),
    actualFabricYds: z
      .number({ message: "Actual fabric used must be a number" })
      .positive("Actual fabric used must be a positive number")
      .max(99999.99, "Actual fabric cannot exceed 99,999.99 yards")
      .refine(twoDp, "Actual fabric yards can have at most 2 decimal places")
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided to update the cutting order"
  );

export const listOrdersQuerySchema = z
  .object({
    status: z.nativeEnum(OrderStatus).optional(),
    recipeId: z.string().uuid("Invalid recipe ID format").optional(),
    q: z
      .string()
      .trim()
      .max(64, "Search query cannot exceed 64 characters")
      .optional(),
    sort: z
      .enum(["createdAt", "orderNo", "targetQty", "actualFabricYds", "wastagePct", "status"])
      .default("createdAt"),
    dir: z.enum(["asc", "desc"]).default("desc"),
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type PatchOrderInput = z.infer<typeof patchOrderSchema>;
