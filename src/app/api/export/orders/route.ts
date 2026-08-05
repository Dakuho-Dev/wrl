import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function escape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

/** CSV export of the signed-in seller's orders (GDPR data portability). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const orders = await prisma.order.findMany({
    where: { shop: { userId: user.id } },
    include: { shop: true, items: true, shipments: true },
    orderBy: { placedAt: "desc" },
  });

  const header = [
    "order_number",
    "marketplace_id",
    "platform",
    "shop",
    "placed_at",
    "status",
    "payment_status",
    "fulfillment",
    "buyer_name",
    "buyer_email",
    "ship_city",
    "ship_state",
    "ship_zip",
    "ship_country",
    "items",
    "quantity",
    "subtotal",
    "shipping",
    "tax",
    "discount",
    "total",
    "currency",
    "carrier",
    "tracking_number",
  ];

  const rows = orders.map((order) =>
    [
      order.orderNumber,
      order.externalId,
      order.shop.platform,
      order.shop.name,
      order.placedAt.toISOString(),
      order.status,
      order.paymentStatus,
      order.fulfillment,
      order.buyerName,
      order.buyerEmail,
      order.shipCity,
      order.shipState,
      order.shipZip,
      order.shipCountry,
      order.items.map((item) => `${item.quantity}× ${item.title}`).join(" | "),
      order.items.reduce((sum, item) => sum + item.quantity, 0),
      order.subtotal.toFixed(2),
      order.shippingCost.toFixed(2),
      order.taxAmount.toFixed(2),
      order.discount.toFixed(2),
      order.total.toFixed(2),
      order.currency,
      order.shipments[0]?.carrier ?? "",
      order.shipments[0]?.trackingNumber ?? "",
    ]
      .map(escape)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\r\n");
  const filename = `owlflow-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
