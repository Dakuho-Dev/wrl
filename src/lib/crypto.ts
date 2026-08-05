import "server-only";

import crypto from "node:crypto";

import { cleanEnv } from "@/lib/env";

/**
 * Envelope encryption for marketplace OAuth tokens stored in the database.
 *
 * Format: enc:v1:<iv>:<authTag>:<ciphertext>   (all base64)
 *
 * The key comes from ENCRYPTION_KEY, falling back to AUTH_SECRET so an existing
 * deployment keeps working. Values that are not in the enc: format are returned
 * unchanged, which makes the migration from plaintext rows transparent.
 */

const PREFIX = "enc:v1:";

function key() {
  const material = cleanEnv(process.env.ENCRYPTION_KEY) || cleanEnv(process.env.AUTH_SECRET);
  if (!material) {
    throw new Error("ENCRYPTION_KEY or AUTH_SECRET must be set to encrypt marketplace tokens");
  }
  // Derive a stable 32-byte key regardless of the secret's length.
  return crypto.createHash("sha256").update(material).digest();
}

export function encryptSecret(plain: string | null | undefined): string | null {
  if (!plain) return null;
  if (plain.startsWith(PREFIX)) return plain; // already encrypted

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext row

  const [ivPart, tagPart, dataPart] = stored.slice(PREFIX.length).split(":");
  if (!ivPart || !tagPart || !dataPart) return null;

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(ivPart, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key or tampered ciphertext — treat as "no token available".
    return null;
  }
}

/** Convenience accessor for a shop row. */
export function shopTokens(shop: { accessToken: string | null; refreshToken: string | null }) {
  return {
    accessToken: decryptSecret(shop.accessToken),
    refreshToken: decryptSecret(shop.refreshToken),
  };
}
