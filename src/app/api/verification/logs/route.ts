import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { listVerificationHistory } from "@/services/verification.service";
import { listLogsQuerySchema } from "@/validators/verification.schema";

export const dynamic = "force-dynamic";

export const GET = withAuth([Role.cutting_verifier], async ({ req }) => {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const query = listLogsQuerySchema.parse(searchParams);
  const result = await listVerificationHistory(query);
  return jsonOk(result);
});
