/**
 * Environment values can pick up stray whitespace, quotes or a UTF-8 BOM
 * depending on the shell that set them. Normalise before use — a BOM in front
 * of a URL is enough to throw `TypeError: Invalid URL` at build time.
 */
export function cleanEnv(value: string | undefined, fallback = ""): string {
  if (!value) return fallback;
  const cleaned = value
    .replace(/^﻿/, "")
    .trim()
    .replace(/^["'](.*)["']$/s, "$1")
    .trim();
  return cleaned || fallback;
}

/** Public base URL of this deployment, without a trailing slash. */
export function appUrl(): string {
  return cleanEnv(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000").replace(/\/$/, "");
}
