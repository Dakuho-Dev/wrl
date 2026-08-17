#!/usr/bin/env node
/**
 * Etsy Open API v3 surface probe.
 *
 * Runs the OAuth 2.0 + PKCE dance locally, discovers the ids on your account,
 * then walks a catalogue of read endpoints and writes every raw response to
 * disk. The point is to answer one question honestly: given the key and scopes
 * you actually hold, what does Etsy return, and what does it refuse?
 *
 * No dependencies — Node 18+ built-ins only.
 *
 *   node scripts/etsy-probe.mjs --key <KEYSTRING> --secret <SHARED_SECRET>
 *   node scripts/etsy-probe.mjs --all-scopes        # ask for every read scope
 *   node scripts/etsy-probe.mjs --path "/shops/{shopId}/receipts?limit=2"
 *   node scripts/etsy-probe.mjs --reauth            # forget the cached token
 *
 * Key and secret also come from ETSY_CLIENT_ID / ETSY_CLIENT_SECRET.
 * Tokens are cached in scripts/.etsy-token.json so you authorise once.
 *
 * Output: scripts/etsy-probe-output/*.json plus REPORT.md, a table of every
 * endpoint with its status and — where Etsy refused — the reason.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(HERE, ".etsy-token.json");
const OUT_DIR = path.join(HERE, "etsy-probe-output");

const API = "https://openapi.etsy.com/v3/application";
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const AUTH_URL = "https://www.etsy.com/oauth/connect";

const PORT = Number(process.env.ETSY_PROBE_PORT ?? 3003);
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

/**
 * The four scopes the production application requests, and the only ones it is
 * allowed to request: Etsy's API Terms §5 prohibit asking for "more than the
 * minimum amount of data needed".
 */
const MINIMAL_SCOPES = ["shops_r", "listings_r", "transactions_r", "transactions_w"];

/**
 * Every read scope Etsy publishes, for local exploration only. Authorising with
 * these tells you what the wider API exposes — it must NOT change what the
 * deployed app asks for.
 */
const ALL_READ_SCOPES = [
  "address_r",
  "billing_r",
  "cart_r",
  "email_r",
  "favorites_r",
  "feedback_r",
  "listings_r",
  "profile_r",
  "recommend_r",
  "shops_r",
  "transactions_r",
];

// ---------------------------------------------------------------- CLI args

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const KEYSTRING = (argValue("--key") ?? process.env.ETSY_CLIENT_ID ?? "").trim();
const SECRET = (argValue("--secret") ?? process.env.ETSY_CLIENT_SECRET ?? "").trim();
const CUSTOM_PATH = argValue("--path");
const FORCE_REAUTH = hasFlag("--reauth");
const ALL_SCOPES = hasFlag("--all-scopes");

const SCOPES = process.env.ETSY_PROBE_SCOPES
  ? process.env.ETSY_PROBE_SCOPES.split(/\s+/)
  : ALL_SCOPES
    ? ALL_READ_SCOPES
    : MINIMAL_SCOPES;

/**
 * Etsy accepts either the bare keystring or "keystring:shared_secret" in
 * x-api-key, depending on how the app is registered. Start with the richer form
 * when a secret is available — that is what the production app learned to do.
 */
let apiKeyHeader = SECRET ? `${KEYSTRING}:${SECRET}` : KEYSTRING;

/** True when Etsy is objecting to the shape of the key, not to the request. */
const isKeyFormComplaint = (result) =>
  result.status === 403 && /shared secret/i.test(JSON.stringify(result.body ?? ""));

// ---------------------------------------------------------------- console

const tty = process.stdout.isTTY;
const paint = (code) => (s) => (tty ? `[${code}m${s}[0m` : String(s));
const c = {
  bold: paint(1),
  dim: paint(2),
  red: paint(31),
  green: paint(32),
  yellow: paint(33),
  cyan: paint(36),
};

function die(message) {
  console.error(`\n${c.red("✖")} ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------- OAuth

const base64url = (buf) => buf.toString("base64url");

function openBrowser(url) {
  const cmd =
    process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const argv = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, argv, { detached: true, stdio: "ignore" }).unref();
  } catch {
    // Opening a browser is a convenience; the URL is printed either way.
  }
}

async function authorise() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", KEYSTRING);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  console.log(`\n${c.bold("Authorise this probe on Etsy")}`);
  console.log(`Scopes requested: ${c.cyan(SCOPES.join(" "))}`);
  console.log(
    c.dim(`Add ${REDIRECT_URI} to your app's callback URLs first, or Etsy will refuse.\n`),
  );
  console.log(`${c.dim(url.toString())}\n`);
  openBrowser(url.toString());

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const incoming = new URL(req.url, `http://localhost:${PORT}`);
      if (incoming.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const returned = incoming.searchParams.get("state");
      const error = incoming.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<body style="font:16px system-ui;padding:40px">${
          error ? `Etsy returned: ${error}` : "Authorised. You can close this tab."
        }</body>`,
      );
      server.close();
      if (error) reject(new Error(`Etsy returned ${error}`));
      else if (returned !== state) reject(new Error("State mismatch — aborting."));
      else resolve(incoming.searchParams.get("code"));
    });
    server.listen(PORT, () => console.log(c.dim(`Waiting on ${REDIRECT_URI} …`)));
    setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for the Etsy redirect."));
    }, 300_000);
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: KEYSTRING,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) die(`Token exchange failed (${res.status}): ${await res.text()}`);

  const tokens = await res.json();
  tokens.obtained_at = Date.now();
  tokens.scopes = SCOPES;
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log(`${c.green("✔")} Token saved to ${c.cyan(path.relative(process.cwd(), TOKEN_FILE))}\n`);
  return tokens;
}

async function refresh(tokens) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: KEYSTRING,
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!res.ok) return null;

  const fresh = await res.json();
  fresh.obtained_at = Date.now();
  fresh.scopes = tokens.scopes ?? SCOPES;
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(fresh, null, 2));
  console.log(`${c.green("✔")} Access token refreshed\n`);
  return fresh;
}

async function getTokens() {
  if (!FORCE_REAUTH && fs.existsSync(TOKEN_FILE)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    const held = tokens.scopes ?? [];
    const missing = SCOPES.filter((s) => !held.includes(s));

    if (missing.length) {
      console.log(c.yellow(`Cached token lacks: ${missing.join(" ")} — re-authorising.\n`));
    } else {
      const ageSeconds = (Date.now() - (tokens.obtained_at ?? 0)) / 1000;
      if (ageSeconds < (tokens.expires_in ?? 3600) - 120) return tokens;
      const refreshed = await refresh(tokens);
      if (refreshed) return refreshed;
      console.log(c.yellow("Refresh failed — re-authorising.\n"));
    }
  }
  return authorise();
}

// ---------------------------------------------------------------- requests

async function call(label, endpoint, accessToken) {
  const started = Date.now();
  const send = async () =>
    fetch(`${API}${endpoint}`, {
      headers: {
        "x-api-key": apiKeyHeader,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

  let res = await send();
  let text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  // Fall back to the other key form once, and only when Etsy asks for it.
  if (!res.ok && isKeyFormComplaint({ status: res.status, body })) {
    apiKeyHeader = apiKeyHeader.includes(":") ? KEYSTRING : `${KEYSTRING}:${SECRET}`;
    res = await send();
    text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return {
    label,
    endpoint,
    status: res.status,
    ok: res.ok,
    ms: Date.now() - started,
    rateLimit: {
      perDay: res.headers.get("x-limit-per-day"),
      remainingToday: res.headers.get("x-remaining-today"),
      perSecond: res.headers.get("x-limit-per-second"),
      remainingThisSecond: res.headers.get("x-remaining-this-second"),
    },
    body,
  };
}

/** One-line description of a payload, so the console stays readable. */
function summarise(body) {
  if (body && typeof body === "object") {
    if (Array.isArray(body)) return `[${body.length}]`;
    if (typeof body.count === "number") {
      const n = Array.isArray(body.results) ? body.results.length : 0;
      return `count=${body.count}${n ? `, ${n} returned` : ""}`;
    }
    const keys = Object.keys(body);
    return keys.length ? `{ ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", …" : ""} }` : "{}";
  }
  return String(body).slice(0, 60);
}

/** Why Etsy refused, in a few words, pulled out of whatever shape it sent. */
function refusal(result) {
  const raw = typeof result.body === "object" ? JSON.stringify(result.body) : String(result.body);
  const match = raw.match(/"error(?:_description)?"\s*:\s*"([^"]+)"/);
  const text = (match ? match[1] : raw).replace(/\s+/g, " ").trim();
  return text.slice(0, 150);
}

function save(index, result) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const slug = result.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const file = path.join(OUT_DIR, `${String(index).padStart(2, "0")}-${slug}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  return file;
}

// ---------------------------------------------------------------- catalogue

/**
 * The read surface, grouped the way Etsy groups its scopes. `scope` records
 * which grant the endpoint is documented to need, so a 403 can be read as
 * "missing scope" rather than "broken".
 *
 * Placeholders are filled from the discovery pass; entries whose ids never
 * turned up are skipped rather than called with a blank path.
 */
const CATALOGUE = [
  // Public — the api key alone is enough.
  { group: "Public", label: "ping", path: "/openapi-ping", scope: "—" },
  { group: "Public", label: "seller taxonomy", path: "/seller-taxonomy/nodes", scope: "—" },
  { group: "Public", label: "buyer taxonomy", path: "/buyer-taxonomy/nodes", scope: "—" },

  // Account.
  { group: "Account", label: "me", path: "/users/me", scope: "any token" },
  { group: "Account", label: "user profile", path: "/users/{userId}", scope: "profile_r" },
  { group: "Account", label: "addresses", path: "/user/addresses", scope: "address_r" },

  // Shop.
  { group: "Shop", label: "my shops", path: "/users/{userId}/shops", scope: "shops_r" },
  { group: "Shop", label: "shop", path: "/shops/{shopId}", scope: "shops_r" },
  { group: "Shop", label: "shop sections", path: "/shops/{shopId}/sections", scope: "shops_r" },
  { group: "Shop", label: "shipping profiles", path: "/shops/{shopId}/shipping-profiles", scope: "shops_r" },
  { group: "Shop", label: "return policies", path: "/shops/{shopId}/policies/return", scope: "shops_r" },
  { group: "Shop", label: "production partners", path: "/shops/{shopId}/production-partners", scope: "shops_r" },
  { group: "Shop", label: "holiday preferences", path: "/shops/{shopId}/holiday-preferences", scope: "shops_r" },

  // Listings.
  { group: "Listings", label: "active listings", path: "/shops/{shopId}/listings/active?limit=5", scope: "—" },
  { group: "Listings", label: "featured listings", path: "/shops/{shopId}/listings/featured?limit=5", scope: "—" },
  { group: "Listings", label: "listings draft", path: "/shops/{shopId}/listings?state=draft&limit=5", scope: "listings_r" },
  { group: "Listings", label: "listings inactive", path: "/shops/{shopId}/listings?state=inactive&limit=5", scope: "listings_r" },
  { group: "Listings", label: "listings expired", path: "/shops/{shopId}/listings?state=expired&limit=5", scope: "listings_r" },
  { group: "Listings", label: "listing", path: "/listings/{listingId}", scope: "—" },
  { group: "Listings", label: "listing inventory", path: "/listings/{listingId}/inventory", scope: "listings_r" },
  { group: "Listings", label: "listing images", path: "/shops/{shopId}/listings/{listingId}/images", scope: "—" },
  { group: "Listings", label: "listing videos", path: "/shops/{shopId}/listings/{listingId}/videos", scope: "—" },
  { group: "Listings", label: "listing properties", path: "/shops/{shopId}/listings/{listingId}/properties", scope: "listings_r" },
  { group: "Listings", label: "listing translations", path: "/shops/{shopId}/listings/{listingId}/translations/en", scope: "listings_r" },

  // Orders.
  { group: "Orders", label: "receipts", path: "/shops/{shopId}/receipts?limit=5", scope: "transactions_r" },
  { group: "Orders", label: "receipt", path: "/shops/{shopId}/receipts/{receiptId}", scope: "transactions_r" },
  { group: "Orders", label: "receipt transactions", path: "/shops/{shopId}/receipts/{receiptId}/transactions", scope: "transactions_r" },
  { group: "Orders", label: "receipt payments", path: "/shops/{shopId}/receipts/{receiptId}/payments", scope: "transactions_r" },
  { group: "Orders", label: "shop transactions", path: "/shops/{shopId}/transactions?limit=5", scope: "transactions_r" },

  // Money.
  { group: "Money", label: "payments", path: "/shops/{shopId}/payments?payment_ids=", scope: "transactions_r" },
  { group: "Money", label: "ledger entries", path: "/shops/{shopId}/payment-account/ledger-entries?limit=5", scope: "billing_r" },

  // Feedback.
  { group: "Feedback", label: "shop reviews", path: "/shops/{shopId}/reviews?limit=5", scope: "feedback_r" },
  { group: "Feedback", label: "listing reviews", path: "/listings/{listingId}/reviews?limit=5", scope: "feedback_r" },
];

// ---------------------------------------------------------------- report

function writeReport(rows, meta) {
  const byGroup = new Map();
  for (const row of rows) {
    if (!byGroup.has(row.group)) byGroup.set(row.group, []);
    byGroup.get(row.group).push(row);
  }

  const lines = [
    "# Etsy API surface — what this key can actually read",
    "",
    `Run at ${new Date().toISOString()}`,
    "",
    `- Keystring: \`${meta.keystring.slice(0, 6)}…\``,
    `- Scopes authorised: \`${meta.scopes.join(" ")}\``,
    `- Shop: ${meta.shop ? `${meta.shop.shop_name} (shop_id ${meta.shop.shop_id})` : "none on this account"}`,
    `- Rate limit left today: ${meta.remainingToday ?? "unknown"} of ${meta.perDay ?? "unknown"}`,
    "",
    `**${rows.filter((r) => r.ok).length} of ${rows.length} endpoints returned data.**`,
    "",
  ];

  for (const [group, items] of byGroup) {
    lines.push(`## ${group}`, "", "| Endpoint | Scope | Status | Result |", "|---|---|---|---|");
    for (const r of items) {
      const result = r.ok ? r.summary : `❌ ${r.reason}`;
      lines.push(`| \`${r.endpoint}\` | ${r.scope} | ${r.status} | ${result} |`);
    }
    lines.push("");
  }

  lines.push(
    "## Reading this",
    "",
    "- **403 with a scope message** — the endpoint exists, your token just was not granted it.",
    "- **404** — either the path is wrong for this API version, or the record does not exist on this account.",
    "- **200 with `count=0`** — the endpoint works and your shop simply has none of that record yet.",
    "",
    "Anything unlocked by re-running with `--all-scopes` is available to *a* key, not to this",
    "application. The deployed app requests four scopes and must keep requesting four: Etsy's",
    "API Terms §5 prohibit asking for more than the minimum the features need.",
    "",
  );

  const file = path.join(OUT_DIR, "REPORT.md");
  fs.writeFileSync(file, lines.join("\n"));
  return file;
}

// ---------------------------------------------------------------- main

async function main() {
  if (!KEYSTRING) {
    die(
      "No keystring. Pass it with --key <KEYSTRING>, or set ETSY_CLIENT_ID.\n" +
        "  Find it at https://www.etsy.com/developers → your app → Keystring",
    );
  }

  console.log(`\n${c.bold("Etsy API probe")}  ${c.dim(`key ${KEYSTRING.slice(0, 6)}…`)}`);
  if (ALL_SCOPES) {
    console.log(
      c.yellow("  --all-scopes: exploring the wider API. Do not copy this list into the app.\n"),
    );
  }

  const ping = await call("ping", "/openapi-ping");
  if (!ping.ok) {
    console.log(`${c.red("✖")} ping → ${ping.status}  ${refusal(ping)}`);
    die(
      /shared secret/i.test(refusal(ping)) && !SECRET
        ? "This app wants keystring:shared_secret. Rerun with --secret <SHARED_SECRET>."
        : "The keystring was rejected. Check for stray spaces, or regenerate it on Etsy.",
    );
  }
  console.log(`${c.green("✔")} ping → ${ping.status}  ${c.dim(summarise(ping.body))}\n`);

  const tokens = await getTokens();
  const accessToken = tokens.access_token;
  const userId = accessToken.split(".")[0];

  // Discovery: find the ids the catalogue needs before walking it.
  const shopsRes = await call("discover shops", `/users/${userId}/shops`, accessToken);
  const shop = shopsRes.body?.results?.[0] ?? (shopsRes.body?.shop_id ? shopsRes.body : null);
  const shopId = shop?.shop_id;

  if (!shop) {
    console.log(`${c.yellow("!")} No shop on this account — shop endpoints will be skipped.`);
    console.log(c.dim(`  ${refusal(shopsRes)}\n`));
  } else {
    console.log(`${c.bold("Shop:")} ${shop.shop_name}  ${c.dim(`shop_id ${shopId}`)}`);
  }

  let listingId = null;
  let receiptId = null;

  if (shopId) {
    const listings = await call("discover listings", `/shops/${shopId}/listings/active?limit=1`, accessToken);
    listingId = listings.body?.results?.[0]?.listing_id ?? null;

    const receipts = await call("discover receipts", `/shops/${shopId}/receipts?limit=1`, accessToken);
    receiptId = receipts.body?.results?.[0]?.receipt_id ?? null;

    console.log(
      c.dim(`Discovered: listing_id ${listingId ?? "none"}, receipt_id ${receiptId ?? "none"}\n`),
    );
  }

  const fill = (p) =>
    p
      .replaceAll("{userId}", String(userId))
      .replaceAll("{shopId}", String(shopId))
      .replaceAll("{listingId}", String(listingId))
      .replaceAll("{receiptId}", String(receiptId));

  const plan = CUSTOM_PATH
    ? [{ group: "Custom", label: "custom", path: CUSTOM_PATH, scope: "—" }]
    : CATALOGUE.filter((e) => {
        if (e.path.includes("{shopId}") && !shopId) return false;
        if (e.path.includes("{listingId}") && !listingId) return false;
        if (e.path.includes("{receiptId}") && !receiptId) return false;
        return true;
      });

  console.log(c.bold("Endpoint".padEnd(30) + "Status".padEnd(9) + "Time".padEnd(8) + "Returned"));
  console.log(c.dim("─".repeat(78)));

  const rows = [];
  let index = 1;
  let lastResult = null;

  for (const entry of plan) {
    const endpoint = fill(entry.path);
    const result = await call(entry.label, endpoint, accessToken);
    save(index, result);
    lastResult = result;

    const mark = result.ok ? c.green("✔") : c.red("✖");
    const status = result.ok ? c.green(String(result.status)) : c.red(String(result.status));
    const tail = result.ok ? c.dim(summarise(result.body)) : c.dim(refusal(result));
    console.log(
      `${mark} ${entry.label.padEnd(28)}${status.padEnd(9)}${`${result.ms}ms`.padEnd(8)}${tail}`,
    );

    rows.push({
      group: entry.group,
      label: entry.label,
      endpoint,
      scope: entry.scope,
      status: result.status,
      ok: result.ok,
      summary: summarise(result.body),
      reason: result.ok ? "" : refusal(result),
    });

    index += 1;
    // This app is capped at 5 requests/second; 250ms keeps a wide margin.
    await new Promise((r) => setTimeout(r, 250));
  }

  const report = writeReport(rows, {
    keystring: KEYSTRING,
    scopes: tokens.scopes ?? SCOPES,
    shop,
    remainingToday: lastResult?.rateLimit?.remainingToday,
    perDay: lastResult?.rateLimit?.perDay,
  });

  const okCount = rows.filter((r) => r.ok).length;
  console.log(c.dim("─".repeat(78)));
  console.log(`${c.green("✔")} ${okCount} of ${rows.length} endpoints returned data`);

  const blocked = rows.filter((r) => !r.ok && r.status === 403);
  if (blocked.length) {
    console.log(
      `${c.yellow("!")} ${blocked.length} refused — scopes: ${c.cyan([...new Set(blocked.map((r) => r.scope))].join(" "))}`,
    );
    if (!ALL_SCOPES) console.log(c.dim("  Rerun with --all-scopes to see what those would return."));
  }

  if (lastResult?.rateLimit?.remainingToday) {
    console.log(
      c.dim(
        `  Rate limit: ${lastResult.rateLimit.remainingToday} of ${lastResult.rateLimit.perDay} requests left today`,
      ),
    );
  }

  console.log(`\n  Report:   ${c.cyan(path.relative(process.cwd(), report))}`);
  console.log(`  Raw JSON: ${c.cyan(path.relative(process.cwd(), OUT_DIR))}\n`);
}

main().catch((error) => die(error instanceof Error ? error.message : String(error)));
