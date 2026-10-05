import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { getVerificationOrder } from "@/services/verification.service";

export const dynamic = "force-dynamic";

export const GET = withAuth<{ id: string }>([Role.cutting_verifier], async ({ params }) => {
  const orderData = await getVerificationOrder(params.id);
  return jsonOk(orderData);
});
