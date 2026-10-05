import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST() {
  const isSecure = process.env.NODE_ENV === "production";
  const clearCookieHeader = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
    isSecure ? "; Secure" : ""
  }`;

  const response = NextResponse.json({ data: { success: true } }, { status: 200 });
  response.headers.set("Set-Cookie", clearCookieHeader);

  return response;
}
