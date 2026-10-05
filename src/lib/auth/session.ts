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
      const raw = cookie.substring(name.length + 1);
      try {
        return decodeURIComponent(raw);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// In-memory user lookup cache with 10s TTL to eliminate redundant DB queries on hot paths
const userSessionCache = new Map<string, { user: Actor; expiresAt: number }>();

export function invalidateSessionCache(userId?: string) {
  if (userId) {
    userSessionCache.delete(userId);
  } else {
    userSessionCache.clear();
  }
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

  // Check in-memory cache to reduce redundant DB queries while keeping TTL short (10s)
  const cached = userSessionCache.get(payload.sub);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  // Always verify role against database (D-10 requirement: token role claims are never trusted)
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

  userSessionCache.set(payload.sub, {
    user,
    expiresAt: Date.now() + 10_000,
  });

  return user;
}
