import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME, Actor } from "./session";
import { verifySessionToken } from "./jwt";

/**
 * Server-component session lookup (cookies() based). The role is re-read from the
 * database on every request (D-10); the JWT only proves identity. Returns null when
 * there is no valid session. Deduplicated per request via React cache().
 */
export const getCurrentUser = cache(async (): Promise<Actor | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, fullName: true, role: true },
  });
  return user ?? null;
});
