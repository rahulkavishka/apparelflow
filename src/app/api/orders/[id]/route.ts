import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { patchOrderSchema } from "@/validators/order.schema";
import { getCuttingOrderById, updateCuttingOrder } from "@/services/orders.service";

export const GET = withAuth<{ id: string }>([Role.cutting_supervisor], async ({ actor, params }) => {
  const order = await getCuttingOrderById(actor, params.id);
  return jsonOk(order);
});

export const PATCH = withAuth<{ id: string }>([Role.cutting_supervisor], async ({ actor, params, req }) => {
  const body = await req.json();
  const input = patchOrderSchema.parse(body);
  const updated = await updateCuttingOrder(actor, params.id, input);
  return jsonOk(updated);
});
