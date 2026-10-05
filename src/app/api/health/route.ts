import { prisma } from "@/lib/db";
import { jsonOk, toErrorResponse } from "@/lib/http";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({
      status: "ok",
      db: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
