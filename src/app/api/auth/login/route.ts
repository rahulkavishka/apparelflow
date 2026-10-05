import { NextResponse } from "next/server";
import { loginUser } from "@/services/auth.service";
import { loginSchema } from "@/validators/auth.schema";
import { toErrorResponse } from "@/lib/http";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const input = loginSchema.parse(rawBody);

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const { user, token } = await loginUser(input, clientIp);

    const isSecure = process.env.NODE_ENV === "production";
    const cookieHeader = `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${
      isSecure ? "; Secure" : ""
    }`;

    const response = NextResponse.json({ data: user }, { status: 200 });
    response.headers.set("Set-Cookie", cookieHeader);

    return response;
  } catch (err) {
    return toErrorResponse(err);
  }
}
