// src/lib/encryption.ts — AES-256-GCM encryption for sensitive credentials

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derive a 32-byte encryption key from the app secret.
 * Uses SHA-256 hash of the secret to ensure consistent key length.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.APP_SECRET ||
    "calllog-saas-default-encryption-key-2024";

  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: "iv:authTag:encryptedData" (all hex encoded)
 */
export function encrypt(plainText: string): string {
  if (!plainText) return "";

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Expects format: "iv:authTag:encryptedData" (all hex encoded)
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return encryptedText; // Not encrypted, return as-is

    const [ivHex, authTagHex, encrypted] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    // If decryption fails, return empty string
    console.error("[encryption] Failed to decrypt value");
    return "";
  }
}

/**
 * Mask a sensitive string for display purposes.
 * Example: "rzp_live_S1xjQjPIueHsiY" → "rzp_****siY"
 */
export function maskSecret(value: string): string {
  if (!value || value.length < 8) return "••••••••";
  return `${value.substring(0, 4)}****${value.substring(value.length - 3)}`;
}
