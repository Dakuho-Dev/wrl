import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, DollarSign, Package, ShoppingBag, Store, Truck } from "lucide-react";

import { AreaChart, BarList, Donut } from "@/components/app/charts";
import {
  Badge,
  ButtonLink,
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
import { formatMoney, formatNumber, PLATFORM_LABEL, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const shopFilter = { shop: { userId: user.id } };

  const now = new Date();
  const from30 = new Date(now.getTime() - 30 * 86400000);
  const from60 = new Date(now.getTime() - 60 * 86400000);

  const [shops, orders30, orders60, statusCounts, recentOrders, openShipments, productCount] =
    await Promise.all([
      prisma.shop.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.order.findMany({
        where: { ...shopFilter, placedAt: { gte: from30 } },
        select: { total: true, placedAt: true, shopId: true, currency: true },
      }),
      prisma.order.findMany({
        where: { ...shopFilter, placedAt: { gte: from60, lt: from30 } },
        select: { total: true },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: shopFilter,
        _count: { status: true },
      }),
      prisma.order.findMany({
        where: shopFilter,
        orderBy: { placedAt: "desc" },
        take: 8,
        include: { shop: true, items: true },
      }),
      prisma.shipment.count({
        where: { order: shopFilter, status: { in: ["LABEL_CREATED", "IN_TRANSIT"] } },
      }),
      prisma.product.count({ where: shopFilter }),
    ]);

  const revenue30 = orders30.reduce((sum, order) => sum + order.total, 0);
  const revenue60 = orders60.reduce((sum, order) => sum + order.total, 0);
  const revenueDelta = revenue60 > 0 ? ((revenue30 - revenue60) / revenue60) * 100 : 0;
  const orderDelta =
    orders60.length > 0 ? ((orders30.length - orders60.length) / orders60.length) * 100 : 0;

  // Daily revenue for the last 14 days
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now.getTime() - (13 - index) * 86400000);
    const key = date.toISOString().slice(0, 10);
    const value = orders30
      .filter((order) => order.placedAt.toISOString().slice(0, 10) === key)
      .reduce((sum, order) => sum + order.total, 0);
    return {
      label: date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      value: Number(value.toFixed(2)),
    };
  });

  const byShop = shops.map((shop) => ({
    label: `${PLATFORM_LABEL[shop.platform] ?? shop.platform} · ${shop.name}`,
    value: Number(
      orders30
        .filter((order) => order.shopId === shop.id)
        .reduce((sum, order) => sum + order.total, 0)
        .toFixed(2),
    ),
  }));

  const statusColors: Record<string, string> = {
    NEW: "#38bdf8",
    PROCESSING: "#fbbf24",
    ON_HOLD: "#fb923c",
    SHIPPED: "#a78bfa",
    DELIVERED: "#34d399",
    CANCELLED: "#f43f5e",
    REFUNDED: "#94a3b8",
  };

  const donut = statusCounts
    .map((entry) => ({
      label: entry.status.replaceAll("_", " ").toLowerCase(),
      value: entry._count.status,
      color: statusColors[entry.status] ?? "#64748b",
    }))
    .sort((a, b) => b.value - a.value);

  const needsAttention = statusCounts.find((entry) => entry.status === "ON_HOLD")?._count.status ?? 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Here is what happened across your connected channels in the last 30 days."
      >
        <ButtonLink href="/dashboard/shops" variant="outline">
          <Store className="h-4 w-4" /> Manage shops
        </ButtonLink>
        <ButtonLink href="/dashboard/orders">
          <ShoppingBag className="h-4 w-4" /> View orders
        </ButtonLink>
      </PageHeader>

      {shops.length === 0 ? (
        <Card className="mb-6">
          <EmptyState
            title="No shops connected yet"
            description="Connect your first Etsy, Shopify, Amazon or TikTok Shop store to start importing orders."
            action={<ButtonLink href="/dashboard/shops">Connect a shop</ButtonLink>}
          />
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (30d)"
          value={formatMoney(revenue30)}
          delta={`${revenueDelta >= 0 ? "+" : ""}${revenueDelta.toFixed(1)}%`}
          hint="vs previous 30 days"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Orders (30d)"
          value={formatNumber(orders30.length)}
          delta={`${orderDelta >= 0 ? "+" : ""}${orderDelta.toFixed(1)}%`}
          hint="vs previous 30 days"
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <StatCard
          label="In transit"
          value={formatNumber(openShipments)}
          hint="shipments awaiting delivery"
          icon={<Truck className="h-4 w-4" />}
        />
        <StatCard
          label="Listings synced"
          value={formatNumber(productCount)}
          hint={`${shops.length} connected shop${shops.length === 1 ? "" : "s"}`}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      {needsAttention > 0 ? (
        <Link href="/dashboard/orders?status=ON_HOLD" className="mt-4 block">
          <Card className="flex items-center justify-between gap-4 border-amber-500/30 bg-amber-500/5 p-4 transition hover:border-amber-500/50">
            <p className="text-sm text-amber-200">
              <strong>{needsAttention}</strong> order{needsAttention === 1 ? " is" : "s are"} on hold
              and need your attention.
            </p>
            <ArrowUpRight className="h-4 w-4 text-amber-300" />
          </Card>
        </Link>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue — last 14 days" description="Across all connected channels" />
          <div className="p-5">
            <AreaChart data={days} currency="USD" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Order status" description="All time" />
          <div className="p-5">
            {donut.length ? (
              <Donut data={donut} />
            ) : (
              <EmptyState title="No orders yet" description="Connect a shop to see the breakdown." />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent orders"
            action={
              <Link href="/dashboard/orders" className="text-xs text-brand-400 hover:text-brand-300">
                View all →
              </Link>
            }
          />
          {recentOrders.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Channel</Th>
                  <Th>Buyer</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-ink-800/40">
                    <Td>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-medium text-white hover:text-brand-300"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                        {timeAgo(order.placedAt)}
                      </p>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={order.shop.platform} />
                        <span className="text-xs text-slate-400">{order.shop.name}</span>
                      </div>
                    </Td>
                    <Td className="text-sm">{order.buyerName}</Td>
                    <Td>
                      <StatusBadge status={order.status} />
                    </Td>
                    <Td className="text-right font-medium">
                      {formatMoney(order.total, order.currency)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState title="No orders yet" />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Revenue by shop" description="Last 30 days" />
            <div className="p-5">
              {byShop.length ? (
                <BarList data={byShop} currency="USD" />
              ) : (
                <EmptyState title="Nothing to show" />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Connected shops"
              action={
                <Link href="/dashboard/shops" className="text-xs text-brand-400 hover:text-brand-300">
                  Manage →
                </Link>
              }
            />
            <div className="divide-y divide-ink-700/40">
              {shops.slice(0, 5).map((shop) => (
                <div key={shop.id} className="flex items-center gap-3 px-5 py-3.5">
                  <PlatformIcon platform={shop.platform} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{shop.name}</p>
                    <p className="text-xs text-slate-500">Synced {timeAgo(shop.lastSyncAt)}</p>
                  </div>
                  <Badge tone={shop.status}>{shop.status.toLowerCase()}</Badge>
                </div>
              ))}
              {shops.length === 0 ? <EmptyState title="No shops connected" /> : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
