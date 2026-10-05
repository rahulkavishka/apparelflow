import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;
// Pre-computed dummy hash to equalize timing on non-existent email login attempts
const DUMMY_HASH = "$2a$10$e8h1Y7C1Qz8uF5yGq4uK.eX3wE9gG8R5m2b1v0z9x8c7v6b5n4m3a";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function dummyPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}
