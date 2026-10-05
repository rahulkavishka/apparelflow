import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { startSewingAssembly } from "@/services/sewing.service";

export const dynamic = "force-dynamic";

export const POST = withAuth<{ id: string }>([Role.sewing_supervisor], async ({ actor, params }) => {
  const result = await startSewingAssembly(params.id, actor);
  return jsonOk(result);
});
