"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requireUser, shopLimitFor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncShop } from "@/lib/sync";

const DEMO_NAMES: Record<string, string> = {
  ETSY: "DemoEtsyStudio",
  SHOPIFY: "demo-store.myshopify.com",
  AMAZON: "Demo Seller Central",
  TIKTOK: "Demo TikTok Shop",
};

const DEMO_URLS: Record<string, string> = {
  ETSY: "https://www.etsy.com/shop/DemoEtsyStudio",
  SHOPIFY: "https://demo-store.myshopify.com",
  AMAZON: "https://sellercentral.amazon.com",
  TIKTOK: "https://shop.tiktok.com/demo",
};

/** Creates a simulated channel so the whole workflow can be exercised without live API keys. */
export async function connectDemoShop(formData: FormData) {
  const user = await requireUser();
  const platform = String(formData.get("platform") ?? "ETSY");
  const name = String(formData.get("name") ?? "").trim() || DEMO_NAMES[platform] || "Demo shop";

  // A disconnected shop holds no tokens and syncs nothing, so it must not
  // consume a slot — otherwise disconnecting leaves the seller with no way out.
  const planShopLimit = shopLimitFor(user);
  const current = await prisma.shop.count({
    where: { userId: user.id, status: { not: "DISCONNECTED" } },
  });
  if (current >= planShopLimit) {
    await logActivity({
      userId: user.id,
      level: "WARN",
      category: "SYNC",
      message: `Shop limit reached (${planShopLimit}) — connection blocked`,
    });
    revalidatePath("/dashboard/shops");
    return;
  }

  const shop = await prisma.shop.create({
    data: {
      userId: user.id,
      platform,
      name,
      url: DEMO_URLS[platform] ?? null,
      externalId: String(20000000 + Math.floor(Math.random() * 9999999)),
      isDemo: true,
      status: "CONNECTED",
      scopes: "shops_r listings_r transactions_r transactions_w",
    },
  });

  await syncShop(shop.id, "FULL");

  await logActivity({
    userId: user.id,
    category: "SYNC",
    message: `Connected ${platform} shop "${name}" (demo mode)`,
  });

  revalidatePath("/dashboard/shops");
  revalidatePath("/dashboard");
}

export async function syncShopNow(formData: FormData) {
  const user = await requireUser();
  const shopId = String(formData.get("shopId"));

  const shop = await prisma.shop.findFirst({ where: { id: shopId, userId: user.id } });
  if (!shop) return;

  const result = await syncShop(shop.id, "FULL");

  await logActivity({
    userId: user.id,
    category: "SYNC",
    level: result.ok ? "INFO" : "ERROR",
    message: result.ok
      ? `Manual sync of "${shop.name}" saved ${result.saved} records`
      : `Manual sync of "${shop.name}" failed: ${result.error}`,
  });

  revalidatePath("/dashboard/shops");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
}

export async function disconnectShop(formData: FormData) {
  const user = await requireUser();
  const shopId = String(formData.get("shopId"));
  const purge = formData.get("purge") === "on";

  const shop = await prisma.shop.findFirst({ where: { id: shopId, userId: user.id } });
  if (!shop) return;

  if (purge) {
    // Removing the shop cascades to its orders, items, shipments and products.
    await prisma.shop.delete({ where: { id: shop.id } });
    await logActivity({
      userId: user.id,
      category: "SYNC",
      message: `Disconnected and deleted all data for "${shop.name}"`,
    });
  } else {
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        status: "DISCONNECTED",
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        autoSync: false,
      },
    });
    await logActivity({
      userId: user.id,
      category: "SYNC",
      message: `Disconnected "${shop.name}" — access tokens deleted`,
    });
  }

  revalidatePath("/dashboard/shops");
  revalidatePath("/dashboard");
}

export async function toggleAutoSync(formData: FormData) {
  const user = await requireUser();
  const shopId = String(formData.get("shopId"));

  const shop = await prisma.shop.findFirst({ where: { id: shopId, userId: user.id } });
  if (!shop) return;

  await prisma.shop.update({ where: { id: shop.id }, data: { autoSync: !shop.autoSync } });
  revalidatePath("/dashboard/shops");
}
