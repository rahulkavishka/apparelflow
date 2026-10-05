import { Role } from "@prisma/client";
import { ForbiddenError } from "../errors";
import { toErrorResponse } from "../http";
import { Actor, getSession } from "./session";

export const PERMISSIONS = {
  "orders:write": [Role.cutting_supervisor],
  "orders:read": [Role.cutting_supervisor],
  "recipes:read": [Role.cutting_supervisor, Role.cutting_verifier],
  "verification:*": [Role.cutting_verifier],
  "sewing:*": [Role.sewing_supervisor],
} as const;

export function assertSameOrigin(req: Request) {
  const method = req.method.toUpperCase();
  // Only check mutating requests
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return;

  const origin = req.headers.get("origin");
  if (!origin) return; // Non-browser clients (like cURL, Postman)

  const host = req.headers.get("host");
  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host !== host) {
      throw new ForbiddenError("Cross-origin mutation request blocked");
    }
  } catch {
    throw new ForbiddenError("Invalid origin header");
  }
}

export type AuthenticatedRouteContext<T = Record<string, string>> = {
  req: Request;
  actor: Actor;
  params: T;
};

export function withAuth<T = Record<string, string>>(
  allowedRoles: readonly Role[],
  handler: (ctx: AuthenticatedRouteContext<T>) => Promise<Response>
) {
  return async (req: Request, routeCtx?: { params?: Promise<T> | T }) => {
    try {
      assertSameOrigin(req);
      const actor = await getSession(req);

      if (!allowedRoles.includes(actor.role)) {
        throw new ForbiddenError(
          `Access denied for role ${actor.role}. Required one of: [${allowedRoles.join(", ")}]`
        );
      }

      let resolvedParams = {} as T;
      if (routeCtx?.params) {
        resolvedParams = await Promise.resolve(routeCtx.params);
      }

      return await handler({ req, actor, params: resolvedParams });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
