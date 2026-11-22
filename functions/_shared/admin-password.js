import { scrypt } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);
export const passwordHashScheme = "scrypt:32768-8-3";

export async function hashAdminPassword(password, salt) {
  const key = await deriveKey(password, salt, 32, {
    N: 32768,
    r: 8,
    p: 3,
    maxmem: 64 * 1024 * 1024,
  });
  return key.toString("hex");
}
