import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;
// Pre-computed dummy hash (12 rounds) to equalize timing on non-existent email login attempts
const DUMMY_HASH = "$2b$12$K1EIlEQsD2g7pNARrCc8Nu1MmQN.009aNf5IC.6v2wi0kMtQrHYEq";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function dummyPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}
