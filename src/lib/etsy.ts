import "server-only";

import crypto from "node:crypto";

import { appUrl, cleanEnv } from "@/lib/env";

/**
 * Etsy Open API v3 client.
 *
 * Docs: https://developers.etsy.com/documentation/
 * Auth: OAuth 2.0 Authorization Code grant with PKCE (required by Etsy).
 *
 * When ETSY_CLIENT_ID is not configured the platform falls back to DEMO mode so
 * the product can be reviewed end-to-end without live credentials.
 */

export const ETSY_AUTH_URL = "https://www.etsy.com/oauth/connect";
export const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
export const ETSY_API_BASE = "https://openapi.etsy.com/v3/application";

export const DEFAULT_SCOPES = [
  "email_r",
  "shops_r",
  "shops_w",
  "listings_r",
  "listings_w",
  "transactions_r",
  "transactions_w",
];

export function etsyConfig() {
  const clientId = cleanEnv(process.env.ETSY_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.ETSY_CLIENT_SECRET);
  const base = appUrl();
  const redirectUri = cleanEnv(
    process.env.ETSY_REDIRECT_URI,
    `${base}/api/integrations/etsy/callback`,
  );
  const scopes = cleanEnv(process.env.ETSY_SCOPES, DEFAULT_SCOPES.join(" ")).split(/\s+/);

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    /** True when live Etsy credentials are present. */
    isLive: Boolean(clientId),
  };
}

// ------------------------------------------------------------------ PKCE

export function createPkcePair() {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
  const state = base64url(crypto.randomBytes(24));
  return { codeVerifier, codeChallenge, state };
}

function base64url(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
}) {
  const { clientId, redirectUri, scopes } = etsyConfig();
  const url = new URL(ETSY_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

// ------------------------------------------------------------------ Tokens

export type EtsyTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<EtsyTokens> {
  const { clientId, redirectUri } = etsyConfig();
  const res = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Etsy token exchange failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as EtsyTokens;
}

export async function refreshTokens(refreshToken: string): Promise<EtsyTokens> {
  const { clientId } = etsyConfig();
  const res = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Etsy token refresh failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as EtsyTokens;
}

// ------------------------------------------------------------------ API calls

async function etsyFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const { clientId } = etsyConfig();
  const res = await fetch(`${ETSY_API_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": clientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Etsy API ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** The Etsy user id is the prefix of the access token: "12345678.abcdef..." */
export function userIdFromToken(accessToken: string) {
  return accessToken.split(".")[0] ?? "";
}

export type EtsyShop = {
  shop_id: number;
  shop_name: string;
  url: string;
  currency_code: string;
  listing_active_count: number;
};

export async function getMyShop(accessToken: string): Promise<EtsyShop | null> {
  const userId = userIdFromToken(accessToken);
  const data = await etsyFetch<{ count: number; results: EtsyShop[] }>(
    `/users/${userId}/shops`,
    accessToken,
  ).catch(() => null);

  if (data && Array.isArray(data.results) && data.results.length) return data.results[0];
  // Some accounts return the shop object directly.
  const single = await etsyFetch<EtsyShop>(`/users/${userId}/shops`, accessToken).catch(() => null);
  return single && "shop_id" in single ? single : null;
}

export type EtsyReceipt = {
  receipt_id: number;
  receipt_type: number;
  status: string;
  name: string;
  buyer_email?: string;
  message_from_buyer?: string;
  is_paid: boolean;
  is_shipped: boolean;
  create_timestamp: number;
  first_line?: string;
  second_line?: string;
  city?: string;
  state?: string;
  zip?: string;
  country_iso?: string;
  grandtotal?: { amount: number; divisor: number; currency_code: string };
  subtotal?: { amount: number; divisor: number; currency_code: string };
  total_shipping_cost?: { amount: number; divisor: number; currency_code: string };
  total_tax_cost?: { amount: number; divisor: number; currency_code: string };
  discount_amt?: { amount: number; divisor: number; currency_code: string };
  transactions?: Array<{
    transaction_id: number;
    title: string;
    quantity: number;
    listing_id: number;
    sku?: string;
    price?: { amount: number; divisor: number; currency_code: string };
    variations?: Array<{ formatted_name: string; formatted_value: string }>;
    buyer_coupon?: number;
  }>;
};

export function money(value?: { amount: number; divisor: number }) {
  if (!value || !value.divisor) return 0;
  return value.amount / value.divisor;
}

export async function listReceipts(
  accessToken: string,
  shopId: string,
  limit = 50,
  offset = 0,
): Promise<EtsyReceipt[]> {
  const data = await etsyFetch<{ count: number; results: EtsyReceipt[] }>(
    `/shops/${shopId}/receipts?limit=${limit}&offset=${offset}`,
    accessToken,
  );
  return data.results ?? [];
}

export type EtsyListing = {
  listing_id: number;
  title: string;
  state: string;
  quantity: number;
  url: string;
  views?: number;
  tags?: string[];
  skus?: string[];
  price?: { amount: number; divisor: number; currency_code: string };
  images?: Array<{ url_570xN: string }>;
};

export async function listActiveListings(
  accessToken: string,
  shopId: string,
  limit = 50,
): Promise<EtsyListing[]> {
  const data = await etsyFetch<{ count: number; results: EtsyListing[] }>(
    `/shops/${shopId}/listings/active?limit=${limit}&includes=Images`,
    accessToken,
  );
  return data.results ?? [];
}

/** Push a tracking number back to Etsy and mark the receipt as shipped. */
export async function submitTracking(
  accessToken: string,
  shopId: string,
  receiptId: string,
  trackingCode: string,
  carrierName: string,
  sendBccEmail = false,
) {
  return etsyFetch(`/shops/${shopId}/receipts/${receiptId}/tracking`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      tracking_code: trackingCode,
      carrier_name: carrierName,
      send_bcc: String(sendBccEmail),
    }).toString(),
  });
}

/** Map an Etsy receipt status onto our internal order status. */
export function mapReceiptStatus(receipt: EtsyReceipt) {
  if (receipt.status === "Canceled") return "CANCELLED";
  if (receipt.is_shipped) return "SHIPPED";
  if (receipt.is_paid) return "PROCESSING";
  return "NEW";
}
