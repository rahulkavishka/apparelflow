import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { getSewingOrder } from "@/services/sewing.service";

export const dynamic = "force-dynamic";

export const GET = withAuth<{ id: string }>([Role.sewing_supervisor], async ({ params }) => {
  const order = await getSewingOrder(params.id);
  return jsonOk(order);
});
