import { authenticateApiRequest, json, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/utils";

export async function GET(request: Request) {
  const actor = await authenticateApiRequest(request);
  if (!actor) return unauthorized();

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const shopId = url.searchParams.get("shop_id") ?? undefined;

  const where = { shop: { userId: actor.userId }, ...(shopId ? { shopId } : {}) };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { shop: true },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return json({
    count: total,
    limit,
    offset,
    results: products.map((product) => ({
      id: product.id,
      marketplace_id: product.externalId,
      platform: product.shop.platform,
      shop_id: product.shopId,
      title: product.title,
      sku: product.sku,
      price: product.price,
      currency: product.currency,
      quantity: product.quantity,
      state: product.state,
      tags: parseJson<string[]>(product.tags, []),
      image_url: product.imageUrl,
    })),
  });
}
