import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { listVerificationQueue } from "@/services/verification.service";

export const dynamic = "force-dynamic";

export const GET = withAuth([Role.cutting_verifier], async () => {
  const queue = await listVerificationQueue();
  return jsonOk({ queue, total: queue.length });
});
