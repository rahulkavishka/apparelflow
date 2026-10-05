import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { rejectVerificationOrder } from "@/services/verification.service";
import { rejectOrderSchema } from "@/validators/verification.schema";

export const dynamic = "force-dynamic";

export const POST = withAuth<{ id: string }>([Role.cutting_verifier], async ({ actor, params, req }) => {
  const body = await req.json();
  const parsed = rejectOrderSchema.parse(body);
  const result = await rejectVerificationOrder(params.id, parsed.note, actor);
  return jsonOk(result);
});
