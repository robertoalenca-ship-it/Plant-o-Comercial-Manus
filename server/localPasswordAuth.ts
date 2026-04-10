import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const LOCAL_OPEN_ID_PREFIX = "local:";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildLocalOpenId(email: string) {
  return `${LOCAL_OPEN_ID_PREFIX}${normalizeEmail(email)}`;
}

export function isManagedLocalOpenId(openId: string) {
  return openId.startsWith(LOCAL_OPEN_ID_PREFIX);
}

export function hashLocalPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyLocalPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const derivedBuffer = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (derivedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedBuffer, storedBuffer);
}
