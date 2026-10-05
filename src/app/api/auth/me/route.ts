import { getSession } from "@/lib/auth/session";
import { jsonOk, toErrorResponse } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const actor = await getSession(req);
    return jsonOk(actor);
  } catch (err) {
    return toErrorResponse(err);
  }
}
