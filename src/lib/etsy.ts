import "server-only";

import crypto from "node:crypto";

import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
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

/**
 * The app a call goes out as: its keystring (OAuth client_id) and shared secret.
 *
 * Normally the platform app from ETSY_CLIENT_ID. A shop can instead bring its
 * own Etsy app (a Personal app the owner registered) — Etsy's Preferred Partner
 * Program refuses tracking writes from a commercial seller-tools app, but lets
 * a shop's own app write to that shop.
 */
export type EtsyApp = { clientId: string; clientSecret: string };

function platformApp(): EtsyApp {
  const { clientId, clientSecret } = etsyConfig();
  return { clientId, clientSecret };
}

/** A shop row's own app, whether or not it has been authorised yet. */
export function shopOwnApp(shop: { etsyAppKey: string | null; etsyAppSecret: string | null }): EtsyApp | null {
  const clientId = shop.etsyAppKey?.trim();
  if (!clientId) return null;
  return { clientId, clientSecret: decryptSecret(shop.etsyAppSecret) ?? "" };
}

/**
 * Which app issued an access token, looked up by the Etsy user id the token
 * starts with.
 *
 * Etsy only accepts a token together with the key of the app that issued it,
 * so every call has to send the right one. Keying on the token rather than
 * passing the app through every function keeps all the callers — sync, the CMS
 * order feed, tracking — unchanged. Only shops re-authorised through their own
 * app count (etsyAppActive); before that their tokens are the platform app's.
 */
const APP_CACHE_MS = 60 * 1000;
const appByUser = new Map<string, { app: EtsyApp | null; at: number }>();

async function appForToken(accessToken: string): Promise<EtsyApp> {
  const userId = userIdFromToken(accessToken);
  if (!userId) return platformApp();

  const cached = appByUser.get(userId);
  if (cached && Date.now() - cached.at < APP_CACHE_MS) return cached.app ?? platformApp();

  const shop = await prisma.shop.findFirst({
    where: { externalUserId: userId, platform: "ETSY", etsyAppActive: true },
    select: { etsyAppKey: true, etsyAppSecret: true },
  });
  const app = shop ? shopOwnApp(shop) : null;
  appByUser.set(userId, { app, at: Date.now() });
  return app ?? platformApp();
}

/** Forget cached app choices — after a shop's own app is saved or authorised. */
export function forgetEtsyAppCache() {
  appByUser.clear();
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
  app?: EtsyApp;
}) {
  const { redirectUri, scopes } = etsyConfig();
  const { clientId } = params.app ?? platformApp();
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

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  app?: EtsyApp,
): Promise<EtsyTokens> {
  const { redirectUri } = etsyConfig();
  const { clientId } = app ?? platformApp();
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

export async function refreshTokens(refreshToken: string, app?: EtsyApp): Promise<EtsyTokens> {
  const { clientId } = app ?? platformApp();
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
function apiKeyForms({ clientId, clientSecret }: EtsyApp) {
  return clientSecret ? [`${clientId}:${clientSecret}`, clientId] : [clientId];
}

/** True when Etsy is objecting to the shape of the key rather than the request. */
function isKeyFormComplaint(status: number, body: string) {
  return status === 403 && /shared secret/i.test(body);
}

async function etsyFetch<T>(path: string, accessToken: string, init?: RequestInit, app?: EtsyApp): Promise<T> {
  let lastError: Error | null = null;

  for (const apiKey of apiKeyForms(app ?? (await appForToken(accessToken)))) {
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
export async function getMyShop(accessToken: string, app?: EtsyApp): Promise<EtsyShop | null> {
  const attempts: string[] = [];
  const note = (path: string, error: unknown) =>
    attempts.push(`${path} → ${error instanceof Error ? error.message : String(error)}`);

  const me = await etsyFetch<{ user_id: number; shop_id?: number | null }>(
    "/users/me",
    accessToken,
    undefined,
    app,
  ).catch((error) => {
    note("/users/me", error);
    return null;
  });

  if (me?.shop_id) {
    const shop = await etsyFetch<EtsyShop>(`/shops/${me.shop_id}`, accessToken, undefined, app).catch((error) => {
      note(`/shops/${me.shop_id}`, error);
      return null;
    });
    if (shop && "shop_id" in shop) return shop;
  }

  const userId = me?.user_id ?? userIdFromToken(accessToken);
  const owned = await etsyFetch<{ count?: number; results?: EtsyShop[] } & Partial<EtsyShop>>(
    `/users/${userId}/shops`,
    accessToken,
    undefined,
    app,
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
  /** Epoch seconds of the last change — the resume cursor for order sync. */
  updated_timestamp?: number;
  update_timestamp?: number;
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
  /**
   * Etsy exposes only these four fields per shipment — there is no transit
   * state here. Resolving "pre-transit / in-transit" is the tracking
   * provider's job; see src/lib/tracking-sync.ts.
   */
  shipments?: Array<{
    receipt_shipping_id?: number | null;
    shipment_notification_timestamp?: number;
    carrier_name?: string;
    tracking_code?: string;
  }>;
  transactions?: Array<{
    transaction_id: number;
    title: string;
    quantity: number;
    listing_id: number;
    sku?: string;
    price?: { amount: number; divisor: number; currency_code: string };
    shipped_timestamp?: number | null;
    /** Buyer-chosen options; personalisation arrives here as one of the entries. */
    variations?: Array<{ formatted_name: string; formatted_value: string }>;
    listing_image_id?: number | null;
    buyer_coupon?: number;
  }>;
};

/**
 * Split a transaction's variations into the personalisation the buyer typed and
 * the ordinary product options, which we store in different columns.
 */
/**
 * Which buyer-entered field is the personalisation the maker has to read.
 *
 * There is no flag for this in the API — it arrives as just another variation —
 * and the label is whatever the seller typed when they set the listing up. Two
 * are already in use across one shop ("Personalization" and "Please enter"), so
 * matching only the obvious one silently loses orders: it was why 13 of 48
 * personalised orders reached the production list.
 *
 * The second round of losses came from the same cause and was quieter still: 62
 * orders were classed as plain and dropped before any push, so they never
 * appeared on the list and nothing recorded their absence. Their labels were
 * "Custom Name (FREE)", "Custom Title", "Name", "Pet Name", "Upload Pet Photo"
 * — buyer-typed text by any reading, and none of them matched.
 *
 * Every pattern below is a label seen in production, which is what the `labels`
 * tally on the push result is for. "Custom" is matched on its own because every
 * label that starts with it is a field the seller added for the buyer to fill
 * in — "Custom Name", "Custom Title", "Custom Character"; and `photo` and
 * `note` because "Child's Photo for Custom Character" and "NOTE" are both the
 * buyer handing something over. Option labels the buyer picks from a list
 * ("Size", "Color", "Style", "Printing Option") stay out on purpose: a
 * configured product is not a personalised one.
 */
export const PERSONALIZATION_LABEL =
  /personali[sz]|please enter|custom text|your text|add your|enter your|engrav|\bcustom\b|\bnames?\b|monogram|initial|upload|photo|\bnotes?\b/i;

/** Etsy's placeholder when the buyer left an optional personalisation blank. */
export const NOT_REQUESTED = /not requested on this item/i;

/**
 * Etsy hands these strings back HTML-escaped.
 *
 * A buyer who personalises a basket with "Eileen's Reading Nook" arrives from
 * the API as "Eileen&#39;s Reading Nook", and every consumer downstream renders
 * it as plain text, so the CMS showed the escape to the maker who has to read
 * the name off it. Measured across production: 101 occurrences of &#39; and 29
 * of &quot; in order items, plus a handful in buyer names and messages.
 *
 * One pass, so an escaped escape stays escaped: "&amp;#39;" is text that means
 * "&#39;", and decoding it twice would turn it into an apostrophe that the
 * buyer never typed.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities<T extends string | null | undefined>(value: T): T {
  if (typeof value !== "string" || !value.includes("&")) return value;

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (!body.startsWith("#")) {
      return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
    }
    const hex = body[1] === "x" || body[1] === "X";
    const code = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
    // An out-of-range code point would throw; leaving the text as written is
    // always better than losing it.
    if (!Number.isInteger(code) || code <= 0 || code > 0x10ffff) return whole;
    try {
      return String.fromCodePoint(code);
    } catch {
      return whole;
    }
  }) as T;
}

export function splitVariations(
  variations?: Array<{ formatted_name: string; formatted_value: string }>,
) {
  const personalization: string[] = [];
  const options: string[] = [];

  for (const variation of variations ?? []) {
    const name = decodeEntities(variation.formatted_name);
    const value = decodeEntities(variation.formatted_value);
    if (PERSONALIZATION_LABEL.test(name)) {
      personalization.push(value);
    } else {
      options.push(`${name}: ${value}`);
    }
  }

  return {
    personalization: personalization.join(" | ") || null,
    variation: options.join(", ") || null,
  };
}

/** One personalisation field per line, the way the CMS order list shows them. */
const NEWLINE = "\n";

/**
 * Every buyer-chosen field as one "Label: value" line.
 *
 * This is the shape the order list in the CMS has always shown, because the
 * Chrome extension built it by reading each label/value pair off Etsy's order
 * row — size, colour, the personalisation prompt, everything except Quantity
 * and SKU, which have columns of their own. Reproducing it exactly is what lets
 * the API take the extension's place without the page changing.
 */
export function personalizationLines(
  variations?: Array<{ formatted_name: string; formatted_value: string }>,
) {
  return (variations ?? [])
    .map(
      (variation) =>
        `${decodeEntities(variation.formatted_name)}: ${decodeEntities(variation.formatted_value)}`,
    )
    .join(NEWLINE);
}

/**
 * Etsy's own "Personalization" tab holds the orders a maker still has to read
 * something off before they can make the item. In the API that is a transaction
 * carrying a personalisation variation with real content — the prompt is still
 * listed when the buyer skipped it, but with Etsy's "Not requested" placeholder.
 */
export function hasPersonalization(receipt: EtsyReceipt): boolean {
  for (const transaction of receipt.transactions ?? []) {
    for (const variation of transaction.variations ?? []) {
      if (!PERSONALIZATION_LABEL.test(variation.formatted_name)) continue;
      const value = (variation.formatted_value ?? "").trim();
      if (!value) continue;
      if (NOT_REQUESTED.test(value)) continue;
      return true;
    }
  }
  return false;
}

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

/** Etsy caps this endpoint at 100 receipts per page. */
const RECEIPTS_PAGE_SIZE = 100;

/**
 * Walk every page of a shop's receipts.
 *
 * `minLastModified` is the incremental hook: on a scheduled run we only want
 * the receipts that changed since the last successful sync, otherwise a busy
 * shop re-reads its whole history every hour and burns the daily rate limit.
 * `maxPages` is a safety stop so one run cannot loop forever.
 *
 * Oldest change first: the caller processes receipts in this order and saves
 * the last one it finished as a cursor, so a run cut short by its time budget
 * resumes exactly where it stopped without skipping anything.
 */
export async function listAllReceipts(
  accessToken: string,
  shopId: string,
  options: {
    minLastModified?: Date | null;
    maxPages?: number;
    /** Extra getShopReceipts filters, e.g. { was_shipped: "false" }. */
    filters?: Record<string, string>;
  } = {},
): Promise<EtsyReceipt[]> {
  const { minLastModified = null, maxPages = 20, filters = {} } = options;
  const receipts: EtsyReceipt[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({
      limit: String(RECEIPTS_PAGE_SIZE),
      offset: String(page * RECEIPTS_PAGE_SIZE),
      sort_on: "updated",
      sort_order: "asc",
      ...filters,
    });
    if (minLastModified) {
      params.set("min_last_modified", String(Math.floor(minLastModified.getTime() / 1000)));
    }

    const data = await etsyFetch<{ count: number; results: EtsyReceipt[] }>(
      `/shops/${shopId}/receipts?${params.toString()}`,
      accessToken,
    );

    const results = data.results ?? [];
    receipts.push(...results);
    if (results.length < RECEIPTS_PAGE_SIZE) break;
  }

  return receipts;
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

/**
 * A shop's active listings.
 *
 * Note what is missing: `includes=Images`. This endpoint is
 * findAllActiveListingsByShop, whose parameters are limit, offset, keywords,
 * sort_on, sort_order, the price bounds and the section — `includes` is not
 * among them, so Etsy accepts the request and quietly ignores it. Asking for it
 * here is why every Product row carried a null imageUrl while the sync
 * otherwise looked healthy. Callers that want photos use fetchListingImages.
 */
export async function listActiveListings(
  accessToken: string,
  shopId: string,
  limit = 50,
): Promise<EtsyListing[]> {
  const data = await etsyFetch<{ count: number; results: EtsyListing[] }>(
    `/shops/${shopId}/listings/active?limit=${limit}`,
    accessToken,
  );
  return data.results ?? [];
}

/**
 * Listing photos for specific listings, keyed by listing id.
 *
 * The order list in the CMS shows a thumbnail per item, which the Chrome
 * extension read straight off Etsy's page. From the API it takes a second
 * lookup: a receipt's transaction carries `listing_id` but no image URL. This
 * is the batch endpoint, so a whole page of orders costs one or two calls
 * rather than one per item.
 *
 * Listings the seller has since deleted simply do not come back, which is why
 * the caller treats a missing entry as "no photo" rather than an error.
 */
export async function fetchListingImages(
  accessToken: string,
  listingIds: string[],
): Promise<Map<string, string>> {
  const images = new Map<string, string>();
  const unique = [...new Set(listingIds.filter(Boolean))];
  if (!unique.length) return images;

  // Etsy caps the batch endpoint at 100 ids per call.
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    const data = await etsyFetch<{ results?: EtsyListing[] }>(
      `/listings/batch?listing_ids=${batch.join(",")}&includes=Images`,
      accessToken,
    );
    for (const listing of data.results ?? []) {
      const url = listing.images?.[0]?.url_570xN;
      if (url) images.set(String(listing.listing_id), url);
    }
  }

  return images;
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

/** One receipt, read fresh — used to check what Etsy already holds before writing to it. */
export async function getReceipt(accessToken: string, shopId: string, receiptId: string) {
  return etsyFetch<EtsyReceipt>(`/shops/${shopId}/receipts/${receiptId}`, accessToken);
}

/**
 * createReceiptShipment, as the current OpenAPI spec describes it (JSON body).
 *
 * Kept apart from submitTracking above, which the dashboard still uses with the
 * older form encoding. Etsy emails the buyer on every successful call, and a
 * shipment cannot be taken back off a receipt — callers check first.
 *
 * The spec also notes a Preferred Partner Program restriction: where it is
 * enforced, an app that is not a fulfillment partner gets 403 here even though
 * every other receipt endpoint works. That surfaces as the thrown error.
 */
export async function createReceiptShipment(
  accessToken: string,
  shopId: string,
  receiptId: string,
  trackingCode: string,
  carrierName: string,
) {
  return etsyFetch<EtsyReceipt>(`/shops/${shopId}/receipts/${receiptId}/tracking`, accessToken, {
    method: "POST",
    body: JSON.stringify({ tracking_code: trackingCode, carrier_name: carrierName, send_bcc: false }),
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
  const app = accessToken ? await appForToken(accessToken) : platformApp();
  for (const apiKey of apiKeyForms(app)) {
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
