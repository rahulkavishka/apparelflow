import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { createOrderSchema, listOrdersQuerySchema } from "@/validators/order.schema";
import { createCuttingOrder, listCuttingOrders } from "@/services/orders.service";

export const POST = withAuth([Role.cutting_supervisor], async ({ actor, req }) => {
  const body = await req.json();
  const input = createOrderSchema.parse(body);
  const order = await createCuttingOrder(actor, input);
  return jsonOk(order, 201);
});

export const GET = withAuth([Role.cutting_supervisor], async ({ actor, req }) => {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const query = listOrdersQuerySchema.parse(searchParams);
  const result = await listCuttingOrders(actor, query);
  return jsonOk(result);
});
