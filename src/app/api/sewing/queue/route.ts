import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { listSewingQueue } from "@/services/sewing.service";

export const dynamic = "force-dynamic";

export const GET = withAuth([Role.sewing_supervisor], async ({ req }) => {
  const url = new URL(req.url);
  const startedFilterParam = url.searchParams.get("startedFilter");

  let startedFilter: "all" | "awaiting" | "started" = "all";
  if (startedFilterParam === "awaiting" || startedFilterParam === "started") {
    startedFilter = startedFilterParam;
  }

  // Notice: even if ?status=PENDING_VERIFICATION is passed, it is completely ignored
  const orders = await listSewingQueue({ startedFilter });
  return jsonOk({ orders, total: orders.length });
});
