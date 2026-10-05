import { z } from "zod";

export const listSewingQueueQuerySchema = z
  .object({
    status: z.string().optional(),
    q: z.string().trim().max(64, "Search query cannot exceed 64 characters").optional(),
    startedFilter: z.enum(["awaiting", "started", "all"]).default("all"),
    sort: z.enum(["verifiedAt", "orderNo", "targetQty"]).default("verifiedAt"),
    dir: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
  })
  .strict();
