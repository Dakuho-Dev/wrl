import { authenticateApiRequest, json, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const actor = await authenticateApiRequest(request);
  if (!actor) return unauthorized();

  const shops = await prisma.shop.findMany({
    where: { userId: actor.userId },
    include: { _count: { select: { orders: true, products: true } } },
    orderBy: { createdAt: "asc" },
  });

  return json({
    count: shops.length,
    results: shops.map((shop) => ({
      id: shop.id,
      platform: shop.platform,
      name: shop.name,
      url: shop.url,
      marketplace_id: shop.externalId,
      status: shop.status,
      currency: shop.currency,
      auto_sync: shop.autoSync,
      last_sync_at: shop.lastSyncAt,
      last_sync_error: shop.lastSyncError,
      order_count: shop._count.orders,
      product_count: shop._count.products,
    })),
  });
}
