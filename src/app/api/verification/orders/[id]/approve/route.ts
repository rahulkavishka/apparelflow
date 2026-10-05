import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { approveVerificationOrder } from "@/services/verification.service";
import { approveOrderSchema } from "@/validators/verification.schema";

export const dynamic = "force-dynamic";

export const POST = withAuth<{ id: string }>([Role.cutting_verifier], async ({ actor, params, req }) => {
  const text = await req.text();
  if (text.trim().length > 0) {
    const body = JSON.parse(text);
    approveOrderSchema.parse(body);
  }
  const result = await approveVerificationOrder(params.id, actor);
  return jsonOk(result);
});
