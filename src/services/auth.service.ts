import { prisma } from "@/lib/db";
import { RateLimitError, UnauthenticatedError } from "@/lib/errors";
import { signSessionToken } from "@/lib/auth/jwt";
import { dummyPasswordCheck, verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { LoginInput } from "@/validators/auth.schema";

export async function loginUser(input: LoginInput, clientIp = "127.0.0.1") {
  // Rate limit: 6 attempts per IP + email per minute
  const rateLimitKey = `login:${clientIp}:${input.email}`;
  const rateLimit = checkRateLimit(rateLimitKey, 6, 60 * 1000);
  if (!rateLimit.success) {
    throw new RateLimitError("Too many login attempts. Please wait a minute and try again.");
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    // Equalize timing to prevent user enumeration
    await dummyPasswordCheck(input.password);
    throw new UnauthenticatedError("Invalid email or password");
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const token = await signSessionToken({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    token,
  };
}
