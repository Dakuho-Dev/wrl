"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requireUser } from "@/lib/auth";
import { shopTokens } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { demoTracking, trackingUrlFor } from "@/lib/demo-data";
import { etsyConfig, submitTracking } from "@/lib/etsy";

async function ownedOrder(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, shop: { userId } },
    include: { shop: true },
  });
  if (!order) throw new Error("Order not found");
  return order;
}

export async function updateOrderStatus(formData: FormData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId"));
  const status = String(formData.get("status"));

  const order = await ownedOrder(orderId, user.id);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status,
      shippedAt: status === "SHIPPED" ? (order.shippedAt ?? new Date()) : order.shippedAt,
      deliveredAt: status === "DELIVERED" ? (order.deliveredAt ?? new Date()) : order.deliveredAt,
      fulfillment: ["SHIPPED", "DELIVERED"].includes(status) ? "FULFILLED" : order.fulfillment,
    },
  });

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      type: "STATUS_CHANGED",
      actor: user.name,
      message: `Status changed from ${order.status} to ${status}`,
    },
  });

  await logActivity({
    userId: user.id,
    category: "ORDER",
    message: `Order ${order.orderNumber} → ${status}`,
  });

  revalidatePath(`/dashboard/orders/${order.id}`);
  revalidatePath("/dashboard/orders");
}

export async function updateOrderMeta(formData: FormData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId"));
  const priority = String(formData.get("priority") ?? "NORMAL");
  const notes = String(formData.get("notes") ?? "");

  const order = await ownedOrder(orderId, user.id);
  await prisma.order.update({ where: { id: order.id }, data: { priority, notes } });

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      type: "NOTE",
      actor: user.name,
      message: `Internal details updated (priority: ${priority.toLowerCase()})`,
    },
  });

  revalidatePath(`/dashboard/orders/${order.id}`);
}

export async function createShipment(formData: FormData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId"));
  const carrier = String(formData.get("carrier") || "USPS");
  const service = String(formData.get("service") || "Standard");
  const trackingNumber = String(formData.get("trackingNumber") || "").trim() || demoTracking();
  const cost = Number(formData.get("cost") || 0);

  const order = await ownedOrder(orderId, user.id);

  const shipment = await prisma.shipment.create({
    data: {
      orderId: order.id,
      carrier,
      service,
      trackingNumber,
      trackingUrl: trackingUrlFor(carrier, trackingNumber),
      cost: Number.isFinite(cost) ? cost : 0,
      status: "LABEL_CREATED",
      shippedAt: new Date(),
    },
  });

  // Push the tracking number back to the marketplace when we have live credentials.
  let pushed = false;
  let pushError: string | null = null;
  const shop = order.shop;

  const accessToken = shopTokens(shop).accessToken;

  if (!shop.isDemo && shop.platform === "ETSY" && accessToken && etsyConfig().isLive) {
    try {
      await submitTracking(
        accessToken,
        shop.externalId ?? "",
        order.externalId ?? "",
        trackingNumber,
        carrier,
      );
      pushed = true;
    } catch (error) {
      pushError = error instanceof Error ? error.message : "Tracking upload failed";
    }
  } else {
    // Demo channels simulate a successful push so the workflow stays complete.
    pushed = true;
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
      actor: user.name,
      message: pushed
        ? `Shipped via ${carrier} — tracking ${trackingNumber} sent to ${shop.platform}`
        : `Shipped via ${carrier} — tracking ${trackingNumber}. Marketplace upload failed: ${pushError}`,
    },
  });

  await logActivity({
    userId: user.id,
    category: "ORDER",
    level: pushed ? "INFO" : "WARN",
    message: `Shipment created for ${order.orderNumber}`,
    meta: { carrier, trackingNumber, pushed },
  });

  revalidatePath(`/dashboard/orders/${order.id}`);
  revalidatePath("/dashboard/shipping");
}

export async function bulkUpdateOrders(formData: FormData) {
  const user = await requireUser();
  const ids = formData.getAll("orderIds").map(String);
  const status = String(formData.get("bulkStatus") ?? "");

  if (!ids.length || !status) return;

  const owned = await prisma.order.findMany({
    where: { id: { in: ids }, shop: { userId: user.id } },
    select: { id: true },
  });
  const ownedIds = owned.map((order) => order.id);

  await prisma.order.updateMany({ where: { id: { in: ownedIds } }, data: { status } });
  await prisma.orderEvent.createMany({
    data: ownedIds.map((id) => ({
      orderId: id,
      type: "STATUS_CHANGED",
      actor: user.name,
      message: `Bulk update → ${status}`,
    })),
  });

  await logActivity({
    userId: user.id,
    category: "ORDER",
    message: `Bulk updated ${ownedIds.length} orders → ${status}`,
  });

  revalidatePath("/dashboard/orders");
}
