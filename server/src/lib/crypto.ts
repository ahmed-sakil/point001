import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Recommended for GCM

const getKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef";
  // Always ensure a 32-byte buffer
  if (Buffer.byteLength(envKey) === 32) {
    return Buffer.from(envKey, "utf-8");
  }
  return crypto.createHash("sha256").update(envKey).digest();
};

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: <hex_iv>:<hex_tag>:<hex_ciphertext>
 */
export function encryptCredential(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a ciphertext string using AES-256-GCM.
 * Expects format: <hex_iv>:<hex_tag>:<hex_ciphertext>
 */
export function decryptCredential(cipherText: string): string {
  if (!cipherText) return "";
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    // Return as-is if unencrypted legacy
    return cipherText;
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
