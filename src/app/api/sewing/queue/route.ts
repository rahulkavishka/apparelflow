import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { listSewingQueue } from "@/services/sewing.service";
import { listSewingQueueQuerySchema } from "@/validators/sewing.schema";

export const dynamic = "force-dynamic";

export const GET = withAuth([Role.sewing_supervisor], async ({ req }) => {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const query = listSewingQueueQuerySchema.parse(searchParams);

  // Security Invariant (SR-03 / T5): Even if ?status=PENDING_VERIFICATION is passed, it is strictly rejected by schema or ignored
  const result = await listSewingQueue(query);
  return jsonOk(result);
});
