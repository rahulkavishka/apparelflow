import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/guards";
import { SESSION_COOKIE_NAME, getCookieFromRequest, invalidateSessionCache } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/jwt";
import { toErrorResponse } from "@/lib/http";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);

    // Invalidate user session cache if token is present
    const token = getCookieFromRequest(req, SESSION_COOKIE_NAME);
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.sub) {
        invalidateSessionCache(payload.sub);
      }
    }

    const isSecure = process.env.NODE_ENV === "production";
    const clearCookieHeader = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
      isSecure ? "; Secure" : ""
    }`;

    const response = NextResponse.json({ data: { success: true } }, { status: 200 });
    response.headers.set("Set-Cookie", clearCookieHeader);

    return response;
  } catch (err) {
    return toErrorResponse(err);
  }
}
