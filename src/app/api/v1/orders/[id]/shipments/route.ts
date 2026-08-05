import { authenticateApiRequest, forbidden, json, notFound, unauthorized } from "@/lib/api-auth";
import { shopTokens } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { demoTracking, trackingUrlFor } from "@/lib/demo-data";
import { etsyConfig, submitTracking } from "@/lib/etsy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await authenticateApiRequest(request);
  if (!actor) return unauthorized();
  if (!actor.scopes.includes("write")) return forbidden("write");

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, shop: { userId: actor.userId } },
    include: { shop: true },
  });
  if (!order) return notFound();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const carrier = typeof body.carrier === "string" ? body.carrier : "USPS";
  const trackingNumber =
    typeof body.tracking_number === "string" && body.tracking_number ? body.tracking_number : demoTracking();

  const shipment = await prisma.shipment.create({
    data: {
      orderId: order.id,
      carrier,
      service: typeof body.service === "string" ? body.service : "Standard",
      trackingNumber,
      trackingUrl: trackingUrlFor(carrier, trackingNumber),
      cost: typeof body.cost === "number" ? body.cost : 0,
      status: "LABEL_CREATED",
      shippedAt: new Date(),
    },
  });

  const accessToken = shopTokens(order.shop).accessToken;

  let pushed = true;
  if (!order.shop.isDemo && order.shop.platform === "ETSY" && accessToken && etsyConfig().isLive) {
    try {
      await submitTracking(
        accessToken,
        order.shop.externalId ?? "",
        order.externalId ?? "",
        trackingNumber,
        carrier,
      );
    } catch {
      pushed = false;
    }
  }

  await prisma.shipment.update({ where: { id: shipment.id }, data: { pushedToShop: pushed } });
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "SHIPPED", fulfillment: "FULFILLED", shippedAt: new Date() },
  });
  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      type: "SHIPPED",
      actor: "api",
      message: `Shipment created via REST API — ${carrier} ${trackingNumber}`,
    },
  });

  return json({ ...shipment, pushed_to_marketplace: pushed }, 201);
}
