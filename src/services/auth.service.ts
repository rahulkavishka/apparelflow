import { prisma } from "@/lib/db";
import { RateLimitError, UnauthenticatedError } from "@/lib/errors";
import { signSessionToken } from "@/lib/auth/jwt";
import { dummyPasswordCheck, verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { LoginInput } from "@/validators/auth.schema";

export async function loginUser(input: LoginInput, clientIp = "127.0.0.1") {
  const normalizedEmail = input.email.toLowerCase().trim();

  // Tier 1: Per IP + Email rate limit (6 attempts per minute)
  const ipEmailKey = `login:ip-email:${clientIp}:${normalizedEmail}`;
  const ipEmailLimit = checkRateLimit(ipEmailKey, 6, 60 * 1000);
  if (!ipEmailLimit.success) {
    throw new RateLimitError("Too many login attempts from this IP. Please wait a minute and try again.");
  }

  // Tier 2: Account-level email-only rate limit (15 attempts per minute across all IPs to prevent X-Forwarded-For bypass)
  const emailKey = `login:email:${normalizedEmail}`;
  const emailLimit = checkRateLimit(emailKey, 15, 60 * 1000);
  if (!emailLimit.success) {
    throw new RateLimitError("Too many login attempts for this account. Please wait a minute and try again.");
  }

  // Tier 3: Global IP rate limit (30 attempts per minute per IP to prevent credential stuffing)
  const globalIpKey = `login:ip:${clientIp}`;
  const globalIpLimit = checkRateLimit(globalIpKey, 30, 60 * 1000);
  if (!globalIpLimit.success) {
    throw new RateLimitError("Too many login attempts from your network. Please wait a minute and try again.");
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
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
