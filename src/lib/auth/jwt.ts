import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

const SECRET_BYTES = new TextEncoder().encode(env.JWT_SECRET);
const ALGORITHM = "HS256";

export interface SessionPayload {
  sub: string; // user id
  iat?: number;
  exp?: number;
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
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
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
