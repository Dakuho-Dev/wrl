#!/usr/bin/env node
/**
 * Etsy Open API v3 probe.
 *
 * Runs the whole OAuth 2.0 + PKCE dance locally, then calls a battery of
 * endpoints and writes every raw response to disk so you can read exactly what
 * Etsy returns for your account.
 *
 * No dependencies — Node 18+ built-ins only.
 *
 *   node scripts/etsy-probe.mjs --key <KEYSTRING>
 *   node scripts/etsy-probe.mjs --key <KEYSTRING> --path "/shops/{shopId}/receipts?limit=2"
 *   node scripts/etsy-probe.mjs --key <KEYSTRING> --reauth
 *
 * The keystring can also come from ETSY_CLIENT_ID instead of --key.
 * Tokens are cached in scripts/.etsy-token.json so you only authorise once.
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

// Read-only by default — a probe should not be able to change anything.
const SCOPES = (process.env.ETSY_PROBE_SCOPES ?? "shops_r listings_r transactions_r").split(/\s+/);

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

/**
 * Etsy normally wants the bare keystring in x-api-key, but some endpoints reject
 * it asking for "keystring:shared_secret". Start with the bare form and upgrade
 * on that specific complaint.
 */
let apiKeyHeader = KEYSTRING;

// ---------------------------------------------------------------- helpers

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

const b64url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function die(message) {
  console.error(`\n${c.red("✖")} ${message}\n`);
  process.exit(1);
}

function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === "win32") spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    else if (platform === "darwin") spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    else spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    // Falls back to the printed URL below.
  }
}

// ---------------------------------------------------------------- OAuth

async function authorise() {
  const codeVerifier = b64url(crypto.randomBytes(32));
  const codeChallenge = b64url(crypto.createHash("sha256").update(codeVerifier).digest());
  const state = b64url(crypto.randomBytes(16));

  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", KEYSTRING);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  console.log(`\n${c.bold("Authorisation needed")}`);
  console.log(`Scopes requested: ${c.cyan(SCOPES.join(" "))}`);
  console.log(`\nOpening your browser. If nothing happens, paste this URL yourself:\n`);
  console.log(c.dim(url.toString()));
  console.log(`\n${c.yellow("!")} ${REDIRECT_URI} must be listed in your Etsy app's callback URLs.\n`);

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const incoming = new URL(req.url, `http://localhost:${PORT}`);
      if (incoming.pathname !== "/callback") {
        res.writeHead(404).end("Not found");
        return;
      }

      const error = incoming.searchParams.get("error");
      const returnedState = incoming.searchParams.get("state");
      const returnedCode = incoming.searchParams.get("code");

      const reply = (title, body) =>
        res
          .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
          .end(
            `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
              `<body style="font:16px system-ui;padding:3rem;max-width:34rem;margin:auto">` +
              `<h1 style="font-size:1.3rem">${title}</h1><p>${body}</p></body>`,
          );

      if (error) {
        reply("Authorisation failed", `Etsy returned: <code>${error}</code>`);
        server.close();
        reject(new Error(`Etsy returned ${error}`));
        return;
      }
      if (returnedState !== state) {
        reply("State mismatch", "The request did not come from this script. Nothing was saved.");
        server.close();
        reject(new Error("State mismatch — possible CSRF, aborting"));
        return;
      }

      reply("Authorised", "You can close this tab and return to the terminal.");
      server.close();
      resolve(returnedCode);
    });

    server.on("error", (err) =>
      reject(
        err.code === "EADDRINUSE"
          ? new Error(`Port ${PORT} is busy. Set ETSY_PROBE_PORT to a free port and retry.`)
          : err,
      ),
    );

    server.listen(PORT, () => openBrowser(url.toString()));
    setTimeout(() => {
      server.close();
      reject(new Error("Timed out after 5 minutes waiting for the Etsy redirect"));
    }, 300_000);
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KEYSTRING,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: codeVerifier,
    }),
  });

  const text = await res.text();
  if (!res.ok) die(`Token exchange failed (${res.status}):\n${text}`);

  const tokens = JSON.parse(text);
  tokens.obtained_at = Date.now();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log(`${c.green("✔")} Token saved to ${c.dim(path.relative(process.cwd(), TOKEN_FILE))}\n`);
  return tokens;
}

async function refresh(tokens) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: KEYSTRING,
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!res.ok) return null;
  const fresh = await res.json();
  fresh.obtained_at = Date.now();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(fresh, null, 2));
  console.log(`${c.green("✔")} Access token refreshed\n`);
  return fresh;
}

async function getTokens() {
  if (!FORCE_REAUTH && fs.existsSync(TOKEN_FILE)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    const ageSeconds = (Date.now() - (tokens.obtained_at ?? 0)) / 1000;
    if (ageSeconds < (tokens.expires_in ?? 3600) - 120) return tokens;
    const refreshed = await refresh(tokens);
    if (refreshed) return refreshed;
    console.log(c.yellow("Refresh failed — re-authorising.\n"));
  }
  return authorise();
}

// ---------------------------------------------------------------- requests

async function call(label, endpoint, accessToken) {
  const started = Date.now();
  const res = await fetch(`${API}${endpoint}`, {
    headers: {
      "x-api-key": apiKeyHeader,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
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

/** One-line description of what came back, so the console stays readable. */
function summarise(body) {
  if (body && typeof body === "object") {
    if (typeof body.count === "number") return `count=${body.count}`;
    const keys = Object.keys(body).slice(0, 4).join(", ");
    return keys ? `{ ${keys}${Object.keys(body).length > 4 ? ", …" : ""} }` : "{}";
  }
  return String(body).slice(0, 60);
}

function save(index, result) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const slug = result.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const file = path.join(OUT_DIR, `${String(index).padStart(2, "0")}-${slug}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
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

  // 1. Ping needs only the keystring — the fastest way to know the key is valid.
  let ping = await call("ping", "/openapi-ping");

  if (!ping.ok && SECRET && JSON.stringify(ping.body).includes("keystring:shared_secret")) {
    console.log(c.dim("  Etsy asked for keystring:shared_secret — retrying with that form."));
    apiKeyHeader = `${KEYSTRING}:${SECRET}`;
    ping = await call("ping", "/openapi-ping");
  }

  if (!ping.ok) {
    console.log(`${c.red("✖")} ping → ${ping.status}`);
    console.log(JSON.stringify(ping.body, null, 2));
    die(
      ping.status === 403 && !SECRET
        ? "Keystring rejected. Etsy may want the shared secret too — rerun with --secret <SHARED_SECRET>."
        : "The keystring was rejected. Check for stray spaces, or regenerate it on Etsy.",
    );
  }
  console.log(`${c.green("✔")} ping → ${ping.status}  ${c.dim(summarise(ping.body))}\n`);

  // 2. Everything else needs a seller's authorisation.
  const tokens = await getTokens();
  const accessToken = tokens.access_token;
  const userId = accessToken.split(".")[0];

  const shopsRes = await call("my shops", `/users/${userId}/shops`, accessToken);
  const shop = shopsRes.body?.results?.[0] ?? (shopsRes.body?.shop_id ? shopsRes.body : null);

  if (!shop) {
    console.log(`${c.yellow("!")} No shop found on this Etsy account.`);
    console.log(`  Endpoints that need a shop_id will be skipped.\n`);
  } else {
    console.log(`${c.bold("Shop:")} ${shop.shop_name}  ${c.dim(`shop_id ${shop.shop_id}`)}\n`);
  }

  const shopId = shop?.shop_id;

  const plan = CUSTOM_PATH
    ? [["custom", CUSTOM_PATH.replaceAll("{shopId}", shopId ?? "").replaceAll("{userId}", userId)]]
    : [
        ["ping", "/openapi-ping"],
        ["me", `/users/${userId}`],
        ["my shops", `/users/${userId}/shops`],
        ...(shopId
          ? [
              ["shop profile", `/shops/${shopId}`],
              ["receipts", `/shops/${shopId}/receipts?limit=5`],
              ["active listings", `/shops/${shopId}/listings/active?limit=5&includes=Images`],
              ["shop sections", `/shops/${shopId}/sections`],
              ["shipping profiles", `/shops/${shopId}/shipping-profiles`],
              ["shop return policies", `/shops/${shopId}/policies/return`],
            ]
          : []),
      ];

  console.log(c.bold("Endpoint".padEnd(24) + "Status".padEnd(9) + "Time".padEnd(9) + "Returned"));
  console.log(c.dim("─".repeat(74)));

  const written = [];
  let index = 1;

  for (const [label, endpoint] of plan) {
    const result = await call(label, endpoint, accessToken);
    written.push(save(index, result));

    const mark = result.ok ? c.green("✔") : c.red("✖");
    const status = result.ok ? String(result.status) : c.red(String(result.status));
    console.log(
      `${mark} ${label.padEnd(22)}${status.padEnd(9)}${`${result.ms}ms`.padEnd(9)}${c.dim(summarise(result.body))}`,
    );

    if (!result.ok) {
      const detail =
        typeof result.body === "object" ? JSON.stringify(result.body) : String(result.body);
      console.log(`  ${c.dim(detail.slice(0, 160))}`);
    }

    index += 1;
    // Stay well inside Etsy's 10 requests/second ceiling.
    await new Promise((r) => setTimeout(r, 250));
  }

  const last = written.length ? JSON.parse(fs.readFileSync(written[written.length - 1], "utf8")) : null;
  if (last?.rateLimit?.remainingToday) {
    console.log(
      `\n${c.dim(`Rate limit: ${last.rateLimit.remainingToday} of ${last.rateLimit.perDay} requests left today`)}`,
    );
  }

  console.log(`\n${c.green("✔")} ${written.length} responses written to ${c.cyan(path.relative(process.cwd(), OUT_DIR))}`);
  console.log(c.dim("   Open any of those .json files to read the full payload.\n"));
}

main().catch((error) => die(error instanceof Error ? error.message : String(error)));
