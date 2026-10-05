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

// In-memory user lookup cache with 30s TTL to eliminate redundant DB queries on every request
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

  // Fast path: Extract claims directly from cryptographically verified token (0ms DB latency)
  if (payload.email && payload.fullName && payload.role) {
    return {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
  }

  // Fallback for legacy tokens without embedded claims
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
