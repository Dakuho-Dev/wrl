import { NextResponse } from "next/server";

import { logActivity } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { etsyConfig, exchangeCodeForTokens, getMyShop, userIdFromToken } from "@/lib/etsy";
import { syncShop } from "@/lib/sync";

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

  try {
    const tokens = await exchangeCodeForTokens(code, stored.codeVerifier);
    const etsyUserId = userIdFromToken(tokens.access_token);
    const shopInfo = await getMyShop(tokens.access_token);

    if (!shopInfo) {
      return fail(
        request,
        "Your Etsy account authorized successfully but no shop was found on it. Open a shop on Etsy first.",
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

    // First import — failures are recorded on the sync job, not thrown at the user.
    await syncShop(shop.id, "FULL");

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
