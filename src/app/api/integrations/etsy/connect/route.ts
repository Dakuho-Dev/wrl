import { NextResponse } from "next/server";

import { getCurrentUser, logActivity } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildAuthorizeUrl, createPkcePair, etsyConfig, shopOwnApp } from "@/lib/etsy";

/**
 * Step 1 of the Etsy OAuth 2.0 flow.
 * Generates a PKCE verifier/challenge, stores it against a random state value,
 * then redirects the seller to Etsy's authorization screen.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const shopId = new URL(request.url).searchParams.get("shop");
  if (shopId) return connectThroughShopApp(user, shopId);

  const config = etsyConfig();
  if (!config.isLive) {
    const message = encodeURIComponent(
      "Etsy API credentials are not configured on this deployment. Set ETSY_CLIENT_ID and ETSY_CLIENT_SECRET, or connect a demo channel.",
    );
    return NextResponse.redirect(new URL(`/dashboard/shops?error=${message}`, request.url));
  }

  const { codeVerifier, codeChallenge, state } = createPkcePair();

  await prisma.oAuthState.create({
    data: {
      state,
      codeVerifier,
      userId: user.id,
      platform: "ETSY",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await logActivity({
    userId: user.id,
    category: "SYNC",
    message: "Started Etsy OAuth authorization",
  });

  return NextResponse.redirect(buildAuthorizeUrl({ state, codeChallenge }));
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${escapeHtml(title)}</title>` +
      `<body style="font:15px/1.5 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px">` +
      `<h1 style="font-size:20px">${escapeHtml(title)}</h1>${body}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

/**
 * Re-authorise one existing shop through its own Etsy app (admin only).
 *
 * The grant has to be clicked by the shop owner's Etsy login, which lives in
 * that shop's Hidemyacc profile — not in the admin's browser. So instead of
 * redirecting, this hands back the Etsy link to open there. The callback needs
 * no WrL session, only the state, so the link works from any browser.
 */
async function connectThroughShopApp(user: { id: string; role: string }, shopId: string) {
  if (user.role !== "ADMIN") return page("Không có quyền", "<p>Chỉ admin mới tạo được link này.</p>", 403);

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const app = shop ? shopOwnApp(shop) : null;
  if (!shop || shop.platform !== "ETSY" || !app) {
    return page("Chưa có app riêng", "<p>Shop này chưa lưu keystring app Etsy riêng ở trang Admin → Shops.</p>", 400);
  }

  const { codeVerifier, codeChallenge, state } = createPkcePair();
  await prisma.oAuthState.create({
    data: {
      state,
      codeVerifier,
      userId: shop.userId,
      platform: "ETSY",
      shopId: shop.id,
      // Long enough to carry the link over to the shop's profile and sign in.
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await logActivity({
    userId: user.id,
    category: "ADMIN",
    message: `Created an Etsy own-app authorisation link for shop "${shop.name}"`,
  });

  const link = buildAuthorizeUrl({ state, codeChallenge, app });
  return page(
    `Kết nối ${shop.name} qua app riêng`,
    `<p>Mở link dưới đây trong <b>profile Hidemyacc của shop ${escapeHtml(shop.name)}</b> ` +
      `(trình duyệt đang đăng nhập Etsy bằng tài khoản chủ shop), rồi bấm <b>Grant access</b>. ` +
      `Link dùng được một lần, trong 60 phút.</p>` +
      `<p>Callback URL của app trên Etsy phải có đúng: <code>${escapeHtml(etsyConfig().redirectUri)}</code></p>` +
      `<textarea readonly rows="7" style="width:100%;font:13px monospace" onclick="this.select()">${escapeHtml(link)}</textarea>`,
  );
}
