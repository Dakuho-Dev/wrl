import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, Package, Receipt, Truck, User } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  PlatformIcon,
  Select,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, ORDER_STATUSES, PLATFORM_LABEL } from "@/lib/utils";
import { createShipment, updateOrderMeta, updateOrderStatus } from "../actions";

export const metadata: Metadata = { title: "Order detail" };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, shop: { userId: user.id } },
    include: {
      shop: true,
      items: true,
      shipments: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  return (
    <>
      <Link
        href="/dashboard/orders"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${formatDateTime(order.placedAt)} · ${PLATFORM_LABEL[order.shop.platform] ?? order.shop.platform} · ${order.shop.name}`}
      >
        <StatusBadge status={order.status} />
        <Badge tone={order.paymentStatus}>{order.paymentStatus.toLowerCase()}</Badge>
        {order.priority !== "NORMAL" ? <Badge>{order.priority.toLowerCase()} priority</Badge> : null}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Items */}
          <Card>
            <CardHeader
              title="Items"
              description={`${order.items.length} line item${order.items.length === 1 ? "" : "s"}`}
            />
            <div className="divide-y divide-line">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 px-5 py-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-paper-2 text-muted-2">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-2">
                      SKU {item.sku ?? "—"} · Qty {item.quantity}
                    </p>
                    {item.variation ? (
                      <p className="mt-1 text-xs text-muted">{item.variation}</p>
                    ) : null}
                    {item.personalization ? (
                      <p className="mt-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700">
                        Personalization: {item.personalization}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink">
                      {formatMoney(item.price * item.quantity, order.currency)}
                    </p>
                    <p className="text-xs text-muted-2">
                      {formatMoney(item.price, order.currency)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
              {[
                ["Subtotal", order.subtotal],
                ["Shipping", order.shippingCost],
                ["Tax", order.taxAmount],
                ...(order.discount ? ([["Discount", -order.discount]] as Array<[string, number]>) : []),
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between text-muted">
                  <span>{label as string}</span>
                  <span>{formatMoney(value as number, order.currency)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
                <span>Total</span>
                <span>{formatMoney(order.total, order.currency)}</span>
              </div>
            </div>
          </Card>

          {/* Shipments */}
          <Card>
            <CardHeader title="Shipments" description="Labels and tracking pushed to the marketplace" />
            {order.shipments.length ? (
              <div className="divide-y divide-line">
                {order.shipments.map((shipment) => (
                  <div key={shipment.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-700">
                      <Truck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {shipment.carrier} · {shipment.service ?? "Standard"}
                      </p>
                      <a
                        href={shipment.trackingUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent"
                      >
                        {shipment.trackingNumber} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={shipment.status} />
                      <p className="mt-1 text-xs text-muted-2">
                        {shipment.pushedToShop ? "Tracking sent to marketplace" : "Not yet uploaded"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <form action={createShipment} className="space-y-3 p-5">
                <input type="hidden" name="orderId" value={order.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Carrier">
                    <Select name="carrier" defaultValue="USPS">
                      {["USPS", "UPS", "FedEx", "DHL Express", "Royal Mail"].map((carrier) => (
                        <option key={carrier} value={carrier}>
                          {carrier}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Service">
                    <Input name="service" defaultValue="Standard" />
                  </Field>
                  <Field label="Tracking number" hint="Leave blank to generate one.">
                    <Input name="trackingNumber" placeholder="1Z999AA10123456784" />
                  </Field>
                  <Field label="Label cost">
                    <Input name="cost" type="number" step="0.01" defaultValue="0" />
                  </Field>
                </div>
                <Button type="submit" className="w-full">
                  <Truck className="h-4 w-4" /> Create shipment & push tracking
                </Button>
              </form>
            )}
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader title="Timeline" description="Everything that happened to this order" />
            <ol className="space-y-0 p-5">
              {order.events.map((event, index) => (
                <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {index < order.events.length - 1 ? (
                    <span className="absolute left-[7px] top-4 h-full w-px bg-paper-3" />
                  ) : null}
                  <span className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-accent bg-paper" />
                  <div className="min-w-0">
                    <p className="text-sm text-ink-2">{event.message}</p>
                    <p className="mt-0.5 text-xs text-muted-2">
                      {formatDateTime(event.createdAt)} · {event.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Update status" />
            <form action={updateOrderStatus} className="space-y-3 p-5">
              <input type="hidden" name="orderId" value={order.id} />
              <Select name="status" defaultValue={order.status}>
                {ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
              <Button type="submit" className="w-full">
                Save status
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Buyer" />
            <div className="space-y-3 p-5 text-sm">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />
                <div>
                  <p className="text-ink">{order.buyerName}</p>
                  <p className="text-xs text-muted-2">{order.buyerEmail ?? "Email not shared"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />
                <address className="not-italic text-xs leading-relaxed text-muted">
                  {order.shipName}
                  <br />
                  {order.shipLine1}
                  {order.shipLine2 ? (
                    <>
                      <br />
                      {order.shipLine2}
                    </>
                  ) : null}
                  <br />
                  {order.shipCity}, {order.shipState} {order.shipZip}
                  <br />
                  {order.shipCountry}
                </address>
              </div>
              {order.buyerMessage ? (
                <div className="rounded-xl border border-line bg-paper-2 p-3 text-xs italic text-ink-2">
                  “{order.buyerMessage}”
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Channel" />
            <div className="flex items-center gap-3 p-5">
              <PlatformIcon platform={order.shop.platform} className="h-9 w-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{order.shop.name}</p>
                <p className="text-xs text-muted-2">
                  Marketplace id {order.externalId ?? "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Internal details" />
            <form action={updateOrderMeta} className="space-y-3 p-5">
              <input type="hidden" name="orderId" value={order.id} />
              <Field label="Priority">
                <Select name="priority" defaultValue={order.priority}>
                  {["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Notes">
                <Textarea name="notes" defaultValue={order.notes ?? ""} placeholder="Internal note…" />
              </Field>
              <Button type="submit" variant="secondary" className="w-full">
                Save
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Payment" />
            <div className="space-y-2 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted">
                  <Receipt className="h-4 w-4" /> Status
                </span>
                <Badge tone={order.paymentStatus}>{order.paymentStatus.toLowerCase()}</Badge>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Paid at</span>
                <span className="text-ink-2">{formatDateTime(order.paidAt)}</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Fulfillment</span>
                <span className="text-ink-2">{order.fulfillment.toLowerCase()}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
