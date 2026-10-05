import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { listVerificationHistory } from "@/services/verification.service";

export const dynamic = "force-dynamic";

export const GET = withAuth([Role.cutting_verifier], async () => {
  const logs = await listVerificationHistory();
  return jsonOk({ logs, total: logs.length });
});
