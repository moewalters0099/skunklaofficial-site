import { pbkdf2 } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(pbkdf2);

export async function hashAdminPassword(password, salt) {
  const key = await deriveKey(password, salt, 310000, 32, "sha256");
  return key.toString("hex");
}
