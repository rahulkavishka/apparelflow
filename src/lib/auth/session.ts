import { Role } from "@prisma/client";
import { prisma } from "../db";
import { UnauthenticatedError } from "../errors";
import { verifySessionToken } from "./jwt";

export const SESSION_COOKIE_NAME = "af_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

export interface Actor {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

/**
 * Extracts cookie value from raw Request headers string.
 * This decoupled extraction allows tests to call route handlers directly.
 */
export function getCookieFromRequest(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.substring(name.length + 1));
    }
  }
  return null;
}

export async function getSession(req: Request): Promise<Actor> {
  const token = getCookieFromRequest(req, SESSION_COOKIE_NAME);
  if (!token) {
    throw new UnauthenticatedError("Authentication required: missing session cookie");
  }

  const payload = await verifySessionToken(token);
  if (!payload || !payload.sub) {
    throw new UnauthenticatedError("Authentication failed: invalid or expired session token");
  }

  // Reload user from database on every request (Design Decision D-10)
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  if (!user) {
    throw new UnauthenticatedError("User associated with session no longer exists");
  }

  return user;
}
