import { z } from "zod";

export const putCountsSchema = z
  .object({
    counts: z
      .array(
        z.object({
          componentId: z.string().uuid({ message: "Invalid component UUID." }),
          actualQty: z
            .number({ message: "Count must be a number." })
            .int({ message: "Count must be a whole integer." })
            .min(0, { message: "Count cannot be negative." })
            .max(1_000_000, { message: "Count exceeds maximum threshold." }),
        })
      )
      .min(1, { message: "At least one count must be provided." })
      .refine(
        (items) => {
          const ids = items.map((i) => i.componentId);
          return new Set(ids).size === ids.length;
        },
        { message: "Duplicate component IDs in counts payload." }
      ),
  })
  .strict();

export type PutCountsInput = z.infer<typeof putCountsSchema>;

export const rejectOrderSchema = z
  .object({
    note: z
      .string({ message: "Rejection note is required." })
      .trim()
      .min(5, { message: "Rejection reason must be at least 5 characters." })
      .max(500, { message: "Rejection reason cannot exceed 500 characters." }),
  })
  .strict();

export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;

export const approveOrderSchema = z.object({}).strict();
