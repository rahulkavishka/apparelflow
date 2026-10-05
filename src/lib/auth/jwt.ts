import { SignJWT, jwtVerify } from "jose";
import { Role } from "@prisma/client";
import { env } from "../env";

const SECRET_BYTES = new TextEncoder().encode(env.JWT_SECRET);
const ALGORITHM = "HS256";

export interface SessionPayload {
  sub: string; // user id
  email?: string;
  fullName?: string;
  role?: Role;
  iat?: number;
  exp?: number;
}

export async function signSessionToken(
  userOrId: string | { id: string; email?: string; fullName?: string; role?: Role }
): Promise<string> {
  const claims =
    typeof userOrId === "string"
      ? { sub: userOrId }
      : {
          sub: userOrId.id,
          ...(userOrId.email ? { email: userOrId.email } : {}),
          ...(userOrId.fullName ? { fullName: userOrId.fullName } : {}),
          ...(userOrId.role ? { role: userOrId.role } : {}),
        };

  return new SignJWT(claims)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(SECRET_BYTES);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_BYTES, {
      algorithms: [ALGORITHM],
    });
    if (!payload.sub) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
