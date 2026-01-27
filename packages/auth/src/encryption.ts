"use server";

import crypto from "crypto";

const algorithm = "aes-256-gcm";

// Get encryption key from environment
const getKey = async (): Promise<Buffer> => {
  const key = process.env.BETTER_AUTH_SECRET;
  if (!key) {
    throw new Error("BETTER_AUTH_SECRET environment variable is required");
  }
  if (key.length !== 64) {
    throw new Error(
      "BETTER_AUTH_SECRET must be 64 characters (32 bytes in hex)"
    );
  }
  return Buffer.from(key, "hex");
};

/**
 * Encrypts a string using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export async function encrypt(text: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with encrypt()
 * @param encryptedText - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 * @throws Error if the encrypted data is invalid or tampered with
 */
export async function decrypt(encryptedText: string): Promise<string> {
  const key = await getKey();
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
