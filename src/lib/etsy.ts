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

/**
 * Exactly the scopes the code uses, and nothing more. Etsy's API Terms prohibit
 * requesting "more than the minimum amount of data needed", so every entry here
 * must map to a call this application actually makes:
 *
 *   shops_r        getMyShop
 *   listings_r     listActiveListings
 *   transactions_r listReceipts
 *   transactions_w submitTracking
 */
export const DEFAULT_SCOPES = ["shops_r", "listings_r", "transactions_r", "transactions_w"];

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

/**
 * The forms Etsy accepts in the `x-api-key` header, best guess first.
 *
 * Some app registrations require "keystring:shared_secret" and reject a bare
 * keystring with 403 "Shared secret is required in x-api-key header."; others
 * want the keystring alone. Which one applies is a property of the app, not of
 * the endpoint, so try the richer form first and fall back once.
 */
function apiKeyForms() {
  const { clientId, clientSecret } = etsyConfig();
  return clientSecret ? [`${clientId}:${clientSecret}`, clientId] : [clientId];
}

/** True when Etsy is objecting to the shape of the key rather than the request. */
function isKeyFormComplaint(status: number, body: string) {
  return status === 403 && /shared secret/i.test(body);
}

async function etsyFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  let lastError: Error | null = null;

  for (const apiKey of apiKeyForms()) {
    const res = await fetch(`${ETSY_API_BASE}${path}`, {
      ...init,
      headers: {
        "x-api-key": apiKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (res.ok) return (await res.json()) as T;

    const body = await res.text();
    lastError = new Error(`Etsy API ${path} failed (${res.status}): ${body}`);
    if (!isKeyFormComplaint(res.status, body)) break;
  }

  throw lastError ?? new Error(`Etsy API ${path} failed`);
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

/**
 * Resolve the shop belonging to the authorised account.
 *
 * Two routes, because Etsy has changed this over time: `/users/me` carries the
 * shop_id for the token holder, and the older owner-id lookup returns either a
 * paginated list or a bare shop object depending on the account.
 *
 * Every failure is collected and rethrown. Swallowing them here is what turns a
 * 403 or an expired scope into a misleading "no shop was found on it".
 */
export async function getMyShop(accessToken: string): Promise<EtsyShop | null> {
  const attempts: string[] = [];
  const note = (path: string, error: unknown) =>
    attempts.push(`${path} → ${error instanceof Error ? error.message : String(error)}`);

  const me = await etsyFetch<{ user_id: number; shop_id?: number | null }>(
    "/users/me",
    accessToken,
  ).catch((error) => {
    note("/users/me", error);
    return null;
  });

  if (me?.shop_id) {
    const shop = await etsyFetch<EtsyShop>(`/shops/${me.shop_id}`, accessToken).catch((error) => {
      note(`/shops/${me.shop_id}`, error);
      return null;
    });
    if (shop && "shop_id" in shop) return shop;
  }

  const userId = me?.user_id ?? userIdFromToken(accessToken);
  const owned = await etsyFetch<{ count?: number; results?: EtsyShop[] } & Partial<EtsyShop>>(
    `/users/${userId}/shops`,
    accessToken,
  ).catch((error) => {
    note(`/users/${userId}/shops`, error);
    return null;
  });

  if (owned) {
    if (Array.isArray(owned.results) && owned.results.length) return owned.results[0];
    if (typeof owned.shop_id === "number") return owned as EtsyShop;
  }

  if (attempts.length) {
    throw new Error(`Etsy did not return a shop for this account. ${attempts.join(" | ")}`);
  }
  return null;
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

/**
 * Raw passthrough for the admin API explorer: performs the request and returns
 * the untouched status and body so you can see exactly what Etsy sends back.
 *
 * Only relative paths under the v3 application base are allowed — this must not
 * become a way to make the server fetch arbitrary URLs.
 */
export async function rawEtsyRequest(path: string, accessToken?: string) {
  if (!path.startsWith("/") || path.includes("://")) {
    throw new Error("Path must be relative, e.g. /shops/12345/receipts?limit=5");
  }

  const { clientId } = etsyConfig();
  if (!clientId) throw new Error("ETSY_CLIENT_ID is not configured on this deployment");

  const url = `${ETSY_API_BASE}${path}`;
  const started = Date.now();

  // Same key-form fallback as etsyFetch, so the explorer sees what the app sees.
  let res!: Response;
  let text = "";
  for (const apiKey of apiKeyForms()) {
    res = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      cache: "no-store",
    });
    text = await res.text();
    if (res.ok || !isKeyFormComplaint(res.status, text)) break;
  }

  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Non-JSON error pages come back as plain text.
  }

  return {
    url,
    status: res.status,
    ok: res.ok,
    durationMs: Date.now() - started,
    rateLimit: {
      limit: res.headers.get("x-limit-per-day"),
      remaining: res.headers.get("x-remaining-today"),
      perSecond: res.headers.get("x-limit-per-second"),
      remainingPerSecond: res.headers.get("x-remaining-this-second"),
    },
    body,
  };
}

/** Map an Etsy receipt status onto our internal order status. */
export function mapReceiptStatus(receipt: EtsyReceipt) {
  if (receipt.status === "Canceled") return "CANCELLED";
  if (receipt.is_shipped) return "SHIPPED";
  if (receipt.is_paid) return "PROCESSING";
  return "NEW";
}
