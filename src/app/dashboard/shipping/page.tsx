import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Package, Truck } from "lucide-react";

import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  PlatformIcon,
  StatCard,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Shipping" };
export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const user = await requireUser();
  const scope = { order: { shop: { userId: user.id } } };

  const [shipments, counts, spend, unshipped] = await Promise.all([
    prisma.shipment.findMany({
      where: scope,
      include: { order: { include: { shop: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.shipment.groupBy({ by: ["status"], where: scope, _count: { status: true } }),
    prisma.shipment.aggregate({ where: scope, _sum: { cost: true } }),
    prisma.order.findMany({
      where: {
        shop: { userId: user.id },
        status: { in: ["NEW", "PROCESSING", "ON_HOLD"] },
      },
      include: { shop: true, items: true },
      orderBy: { placedAt: "asc" },
      take: 12,
    }),
  ]);

  const countFor = (status: string) =>
    counts.find((entry) => entry.status === status)?._count.status ?? 0;

  return (
    <>
      <PageHeader
        title="Shipping"
        description="Labels, tracking numbers and what still needs to go out the door."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting shipment"
          value={formatNumber(unshipped.length)}
          hint="orders in the queue"
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          label="In transit"
          value={formatNumber(countFor("IN_TRANSIT") + countFor("LABEL_CREATED"))}
          hint="parcels on the way"
          icon={<Truck className="h-4 w-4" />}
        />
        <StatCard
          label="Delivered"
          value={formatNumber(countFor("DELIVERED"))}
          hint="all time"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Label spend"
          value={formatMoney(spend._sum.cost ?? 0)}
          hint="all time"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent shipments" description="Latest 60 labels created" />
          {shipments.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Carrier</Th>
                  <Th>Tracking</Th>
                  <Th>Status</Th>
                  <Th>Marketplace</Th>
                  <Th>Shipped</Th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="transition hover:bg-paper-2">
                    <Td>
                      <Link
                        href={`/dashboard/orders/${shipment.orderId}`}
                        className="font-medium text-ink hover:text-accent"
                      >
                        {shipment.order.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-2">{shipment.order.buyerName}</p>
                    </Td>
                    <Td className="text-sm">{shipment.carrier}</Td>
                    <Td>
                      <a
                        href={shipment.trackingUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:text-accent"
                      >
                        {shipment.trackingNumber} <ExternalLink className="h-3 w-3" />
                      </a>
                    </Td>
                    <Td>
                      <StatusBadge status={shipment.status} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={shipment.order.shop.platform} />
                        <Badge tone={shipment.pushedToShop ? "SUCCESS" : "REFUNDED"}>
                          {shipment.pushedToShop ? "pushed" : "pending"}
                        </Badge>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted">
                      {timeAgo(shipment.shippedAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              title="No shipments yet"
              description="Create a shipment from any order to generate tracking."
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Ready to ship"
            description="Oldest unfulfilled orders first"
            action={
              <Link
                href="/dashboard/orders?status=PROCESSING"
                className="text-xs text-accent hover:text-accent"
              >
                View all →
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {unshipped.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-paper-2"
              >
                <PlatformIcon platform={order.shop.platform} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{order.orderNumber}</p>
                  <p className="text-xs text-muted-2">
                    {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                    {formatDateTime(order.placedAt)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </Link>
            ))}
            {unshipped.length === 0 ? (
              <EmptyState title="Nothing waiting" description="Every order has been shipped." />
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}
