import { authenticateApiRequest, json, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const actor = await authenticateApiRequest(request);
  if (!actor) return unauthorized();

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const shopId = url.searchParams.get("shop_id") ?? undefined;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 25)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

  const where = {
    shop: { userId: actor.userId },
    ...(status ? { status } : {}),
    ...(shopId ? { shopId } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true, shipments: true, shop: true },
      orderBy: { placedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return json({
    count: total,
    limit,
    offset,
    results: orders.map((order) => ({
      id: order.id,
      order_number: order.orderNumber,
      marketplace_id: order.externalId,
      platform: order.shop.platform,
      shop: { id: order.shop.id, name: order.shop.name },
      status: order.status,
      payment_status: order.paymentStatus,
      fulfillment: order.fulfillment,
      priority: order.priority,
      buyer: { name: order.buyerName, email: order.buyerEmail },
      shipping_address: {
        name: order.shipName,
        line1: order.shipLine1,
        line2: order.shipLine2,
        city: order.shipCity,
        state: order.shipState,
        zip: order.shipZip,
        country: order.shipCountry,
      },
      totals: {
        subtotal: order.subtotal,
        shipping: order.shippingCost,
        tax: order.taxAmount,
        discount: order.discount,
        total: order.total,
        currency: order.currency,
      },
      items: order.items.map((item) => ({
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        variation: item.variation,
        personalization: item.personalization,
      })),
      shipments: order.shipments.map((shipment) => ({
        carrier: shipment.carrier,
        tracking_number: shipment.trackingNumber,
        tracking_url: shipment.trackingUrl,
        status: shipment.status,
      })),
      placed_at: order.placedAt,
      shipped_at: order.shippedAt,
    })),
  });
}
