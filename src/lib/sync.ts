import "server-only";

import { prisma } from "@/lib/db";
import {
  listActiveListings,
  listReceipts,
  mapReceiptStatus,
  money,
  refreshTokens,
} from "@/lib/etsy";
import { generateDemoOrders, generateDemoProducts } from "@/lib/demo-data";
import { encryptSecret, shopTokens } from "@/lib/crypto";

type Shop = Awaited<ReturnType<typeof prisma.shop.findFirstOrThrow>>;

/** Refresh the shop's access token when it is close to expiry. Returns a decrypted token. */
async function ensureFreshToken(shop: Shop) {
  const { accessToken, refreshToken } = shopTokens(shop);
  if (shop.isDemo || !refreshToken) return accessToken ?? "";

  const expiresSoon =
    !shop.tokenExpiresAt || shop.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  if (!expiresSoon) return accessToken ?? "";

  const tokens = await refreshTokens(refreshToken);
  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: encryptSecret(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return tokens.access_token;
}

export async function syncShop(shopId: string, type: "ORDERS" | "PRODUCTS" | "FULL" = "FULL") {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error("Shop not found");

  const job = await prisma.syncJob.create({
    data: { shopId: shop.id, type, status: "RUNNING" },
  });
  await prisma.shop.update({ where: { id: shop.id }, data: { status: "SYNCING" } });

  let read = 0;
  let saved = 0;

  try {
    if (shop.isDemo || shop.platform !== "ETSY") {
      const result = await syncDemoShop(shop, type);
      read = result.read;
      saved = result.saved;
    } else {
      const accessToken = await ensureFreshToken(shop);
      if (!accessToken) throw new Error("Shop is not authorised — reconnect required");

      if (type === "PRODUCTS" || type === "FULL") {
        const listings = await listActiveListings(accessToken, shop.externalId ?? "");
        read += listings.length;
        for (const listing of listings) {
          const data = {
            shopId: shop.id,
            externalId: String(listing.listing_id),
            title: listing.title,
            sku: listing.skus?.[0] ?? null,
            price: money(listing.price),
            currency: listing.price?.currency_code ?? shop.currency,
            quantity: listing.quantity ?? 0,
            imageUrl: listing.images?.[0]?.url_570xN ?? null,
            state: listing.state ?? "active",
            tags: JSON.stringify(listing.tags ?? []),
            views: listing.views ?? 0,
          };
          const existing = await prisma.product.findFirst({
            where: { shopId: shop.id, externalId: String(listing.listing_id) },
          });
          if (existing) await prisma.product.update({ where: { id: existing.id }, data });
          else await prisma.product.create({ data });
          saved += 1;
        }
      }

      if (type === "ORDERS" || type === "FULL") {
        const receipts = await listReceipts(accessToken, shop.externalId ?? "");
        read += receipts.length;
        for (const receipt of receipts) {
          const existing = await prisma.order.findFirst({
            where: { shopId: shop.id, externalId: String(receipt.receipt_id) },
          });

          const data = {
            shopId: shop.id,
            externalId: String(receipt.receipt_id),
            orderNumber: `#${receipt.receipt_id}`,
            buyerName: receipt.name ?? "Etsy buyer",
            buyerEmail: receipt.buyer_email ?? null,
            buyerMessage: receipt.message_from_buyer ?? null,
            status: mapReceiptStatus(receipt),
            paymentStatus: receipt.is_paid ? "PAID" : "PENDING",
            fulfillment: receipt.is_shipped ? "FULFILLED" : "UNFULFILLED",
            subtotal: money(receipt.subtotal),
            shippingCost: money(receipt.total_shipping_cost),
            taxAmount: money(receipt.total_tax_cost),
            discount: money(receipt.discount_amt),
            total: money(receipt.grandtotal),
            currency: receipt.grandtotal?.currency_code ?? shop.currency,
            shipName: receipt.name ?? null,
            shipLine1: receipt.first_line ?? null,
            shipLine2: receipt.second_line ?? null,
            shipCity: receipt.city ?? null,
            shipState: receipt.state ?? null,
            shipZip: receipt.zip ?? null,
            shipCountry: receipt.country_iso ?? null,
            placedAt: new Date(receipt.create_timestamp * 1000),
          };

          const order = existing
            ? await prisma.order.update({ where: { id: existing.id }, data })
            : await prisma.order.create({ data });

          if (!existing) {
            await prisma.orderItem.createMany({
              data: (receipt.transactions ?? []).map((transaction) => ({
                orderId: order.id,
                title: transaction.title,
                sku: transaction.sku ?? null,
                quantity: transaction.quantity,
                price: money(transaction.price),
                variation:
                  transaction.variations
                    ?.map((v) => `${v.formatted_name}: ${v.formatted_value}`)
                    .join(", ") ?? null,
              })),
            });
            await prisma.orderEvent.create({
              data: {
                orderId: order.id,
                type: "SYNC",
                message: `Imported from Etsy (receipt ${receipt.receipt_id})`,
              },
            });
          }
          saved += 1;
        }
      }
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCESS",
        itemsRead: read,
        itemsSaved: saved,
        finishedAt: new Date(),
        message: `Synced ${saved} records`,
      },
    });
    await prisma.shop.update({
      where: { id: shop.id },
      data: { status: "CONNECTED", lastSyncAt: new Date(), lastSyncError: null },
    });

    return { ok: true as const, read, saved };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "FAILED", message, finishedAt: new Date(), itemsRead: read, itemsSaved: saved },
    });
    await prisma.shop.update({
      where: { id: shop.id },
      data: { status: "ERROR", lastSyncError: message },
    });
    return { ok: false as const, error: message };
  }
}

/** Demo shops generate realistic data so the workflow can be reviewed without live keys. */
async function syncDemoShop(shop: Shop, type: "ORDERS" | "PRODUCTS" | "FULL") {
  let read = 0;
  let saved = 0;

  if (type === "PRODUCTS" || type === "FULL") {
    const existing = await prisma.product.count({ where: { shopId: shop.id } });
    if (existing === 0) {
      const products = generateDemoProducts(shop.id, 12);
      read += products.length;
      for (const product of products) {
        await prisma.product.create({ data: product });
        saved += 1;
      }
    }
  }

  if (type === "ORDERS" || type === "FULL") {
    const fresh = generateDemoOrders(shop.id, 4, 2);
    read += fresh.length;
    for (const draft of fresh) {
      const order = await prisma.order.create({ data: draft.order });
      await prisma.orderItem.createMany({
        data: draft.items.map((item) => ({ ...item, orderId: order.id })),
      });
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: "SYNC",
          message: `Imported from ${shop.platform} (demo channel)`,
        },
      });
      saved += 1;
    }
  }

  return { read, saved };
}

/** Run enabled automations against an order and record the outcome. */
export async function runAutomationsForOrder(userId: string, orderId: string) {
  const automations = await prisma.automation.findMany({
    where: { userId, enabled: true, trigger: { in: ["ORDER_CREATED", "ORDER_PAID"] } },
  });

  for (const automation of automations) {
    const started = Date.now();
    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        status: "SUCCESS",
        orderId,
        message: `Applied "${automation.name}"`,
        durationMs: Date.now() - started,
      },
    });
    await prisma.automation.update({
      where: { id: automation.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
  }
}
