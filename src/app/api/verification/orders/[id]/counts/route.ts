import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { saveCounts } from "@/services/verification.service";
import { putCountsSchema } from "@/validators/verification.schema";

export const dynamic = "force-dynamic";

export const PUT = withAuth<{ id: string }>([Role.cutting_verifier], async ({ actor, params, req }) => {
  const body = await req.json();
  const parsed = putCountsSchema.parse(body);
  const updated = await saveCounts(params.id, parsed.counts, actor);
  return jsonOk(updated);
});
