import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { submitCuttingOrder } from "@/services/orders.service";

export const POST = withAuth<{ id: string }>([Role.cutting_supervisor], async ({ actor, params }) => {
  const result = await submitCuttingOrder(actor, params.id);
  return jsonOk(result);
});
