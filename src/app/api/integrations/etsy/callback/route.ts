import { after, NextResponse } from "next/server";

import { logActivity } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import {
  etsyConfig,
  exchangeCodeForTokens,
  forgetEtsyAppCache,
  getMyShop,
  shopOwnApp,
  userIdFromToken,
} from "@/lib/etsy";
import { syncShop } from "@/lib/sync";

// Room for the background first sync scheduled below with after().
export const maxDuration = 300;

function fail(request: Request, message: string) {
  return NextResponse.redirect(
    new URL(`/dashboard/shops?error=${encodeURIComponent(message)}`, request.url),
  );
}

/**
 * Step 2 of the Etsy OAuth 2.0 flow.
 * Etsy redirects here with ?code and ?state. We verify the state, exchange the
 * code for tokens using the stored PKCE verifier, create the shop record and
 * kick off the first sync.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return fail(request, `Etsy returned an error: ${url.searchParams.get("error_description") ?? error}`);
  }
  if (!code || !state) {
    return fail(request, "Missing authorization code or state from Etsy.");
  }

  const stored = await prisma.oAuthState.findUnique({ where: { state } });
  if (!stored) return fail(request, "Invalid or already-used authorization state.");

  await prisma.oAuthState.delete({ where: { id: stored.id } });

  if (stored.expiresAt < new Date()) {
    return fail(request, "The authorization request expired. Please try connecting again.");
  }

  if (stored.shopId) return finishShopApp(stored.shopId, stored.userId, code, stored.codeVerifier);

  try {
    const tokens = await exchangeCodeForTokens(code, stored.codeVerifier);
    const etsyUserId = userIdFromToken(tokens.access_token);
    const shopInfo = await getMyShop(tokens.access_token);

    if (!shopInfo) {
      return fail(
        request,
        `Etsy authorised the account with user id ${etsyUserId}, but reports no shop on it. If your shop lives on a different Etsy login, sign out of Etsy and authorise again with that account.`,
      );
    }

    const existing = await prisma.shop.findFirst({
      where: { userId: stored.userId, platform: "ETSY", externalId: String(shopInfo.shop_id) },
    });

    const data = {
      userId: stored.userId,
      platform: "ETSY",
      externalId: String(shopInfo.shop_id),
      externalUserId: etsyUserId,
      name: shopInfo.shop_name,
      url: shopInfo.url,
      currency: shopInfo.currency_code ?? "USD",
      status: "CONNECTED",
      isDemo: false,
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: encryptSecret(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: etsyConfig().scopes.join(" "),
      lastSyncError: null,
    };

    const shop = existing
      ? await prisma.shop.update({ where: { id: existing.id }, data })
      : await prisma.shop.create({ data });

    await logActivity({
      userId: stored.userId,
      category: "SYNC",
      message: `Connected Etsy shop "${shopInfo.shop_name}" (shop_id ${shopInfo.shop_id})`,
    });

    await prisma.notification.create({
      data: {
        userId: stored.userId,
        title: "Etsy shop connected",
        body: `${shopInfo.shop_name} is linked. The first sync is running now.`,
        type: "SUCCESS",
        link: "/dashboard/shops",
      },
    });

    // First import runs after the redirect has been sent. Running it inline made
    // the seller wait on the whole import and, on a busy shop, outlived the
    // function timeout: the browser got a 504, retried the callback, and the
    // already-consumed state produced a misleading "connection failed". The
    // sync is time-budgeted and resumable, so the cron finishes whatever this
    // first pass does not; failures are recorded on the sync job.
    after(() => syncShop(shop.id, "FULL"));

    return NextResponse.redirect(
      new URL(
        `/dashboard/shops?connected=${encodeURIComponent(shopInfo.shop_name)}`,
        request.url,
      ),
    );
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown error during Etsy connection";
    await logActivity({
      userId: stored.userId,
      level: "ERROR",
      category: "SYNC",
      message: `Etsy OAuth callback failed: ${message}`,
    });
    return fail(request, message);
  }
}

function plainPage(title: string, message: string, status = 200) {
  const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${escape(title)}</title>` +
      `<body style="font:15px/1.5 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px">` +
      `<h1 style="font-size:20px">${escape(title)}</h1><p>${escape(message)}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

/**
 * The end of a re-authorisation through the shop's own app (see the connect
 * route). It runs in the shop's Hidemyacc profile, which has no WrL session,
 * so it answers with a plain page instead of redirecting into the dashboard.
 *
 * The new tokens only replace the shop's current ones when Etsy confirms they
 * are for that same shop — granting while signed in to another shop's Etsy
 * account must not cross the two over.
 */
async function finishShopApp(shopId: string, userId: string, code: string, codeVerifier: string) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const app = shop ? shopOwnApp(shop) : null;
  if (!shop || !app) return plainPage("Không kết nối được", "Shop hoặc app riêng của shop không còn trên WrL.", 400);

  try {
    const tokens = await exchangeCodeForTokens(code, codeVerifier, app);
    const shopInfo = await getMyShop(tokens.access_token, app);

    if (!shopInfo || String(shopInfo.shop_id) !== shop.externalId) {
      throw new Error(
        `Tài khoản Etsy vừa cấp quyền là shop ${shopInfo ? `"${shopInfo.shop_name}" (${shopInfo.shop_id})` : "không xác định"}, ` +
          `không phải ${shop.name} (${shop.externalId}). Mở link trong đúng profile của shop rồi thử lại.`,
      );
    }

    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        externalUserId: userIdFromToken(tokens.access_token),
        accessToken: encryptSecret(tokens.access_token),
        refreshToken: encryptSecret(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scopes: etsyConfig().scopes.join(" "),
        etsyAppActive: true,
        status: "CONNECTED",
        lastSyncError: null,
      },
    });
    forgetEtsyAppCache();

    await logActivity({
      userId,
      category: "SYNC",
      message: `Shop "${shop.name}" now uses its own Etsy app (${app.clientId.slice(0, 6)}…)`,
    });
    return plainPage("Đã kết nối", `${shop.name} giờ dùng app Etsy riêng của shop. Có thể đóng tab này.`);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    await logActivity({
      userId,
      level: "ERROR",
      category: "SYNC",
      message: `Own-app authorisation for shop "${shop.name}" failed: ${message}`,
    });
    return plainPage("Không kết nối được", message, 400);
  }
}
