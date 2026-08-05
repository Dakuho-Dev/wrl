import type { Metadata } from "next";

import { AreaChart, BarList, Donut } from "@/components/app/charts";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, PLATFORM_LABEL } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const scope = { shop: { userId: user.id } };
  const from = new Date(Date.now() - 90 * 86400000);

  const [orders, shops, items, shipments] = await Promise.all([
    prisma.order.findMany({
      where: { ...scope, placedAt: { gte: from } },
      select: {
        total: true,
        placedAt: true,
        shippedAt: true,
        shopId: true,
        status: true,
        shipCountry: true,
      },
    }),
    prisma.shop.findMany({ where: { userId: user.id } }),
    prisma.orderItem.findMany({
      where: { order: scope },
      select: { title: true, sku: true, quantity: true, price: true },
    }),
    prisma.shipment.findMany({
      where: { order: scope },
      select: { carrier: true, cost: true },
    }),
  ]);

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const avgOrder = orders.length ? revenue / orders.length : 0;

  const fulfilled = orders.filter((order) => order.shippedAt);
  const avgFulfilmentHours = fulfilled.length
    ? fulfilled.reduce(
        (sum, order) =>
          sum + (order.shippedAt!.getTime() - order.placedAt.getTime()) / 3600000,
        0,
      ) / fulfilled.length
    : 0;

  // Weekly revenue for 12 weeks
  const weeks = Array.from({ length: 12 }, (_, index) => {
    const end = new Date(Date.now() - (11 - index) * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    const value = orders
      .filter((order) => order.placedAt >= start && order.placedAt < end)
      .reduce((sum, order) => sum + order.total, 0);
    return {
      label: end.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      value: Number(value.toFixed(2)),
    };
  });

  const byChannel = Object.values(
    orders.reduce<Record<string, { label: string; value: number }>>((acc, order) => {
      const shop = shops.find((entry) => entry.id === order.shopId);
      const key = shop?.platform ?? "OTHER";
      const label = PLATFORM_LABEL[key] ?? key;
      acc[key] = { label, value: (acc[key]?.value ?? 0) + order.total };
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);

  const byCountry = Object.values(
    orders.reduce<Record<string, { label: string; value: number }>>((acc, order) => {
      const key = order.shipCountry ?? "??";
      acc[key] = { label: key, value: (acc[key]?.value ?? 0) + 1 };
      return acc;
    }, {}),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const topProducts = Object.values(
    items.reduce<Record<string, { title: string; sku: string; units: number; revenue: number }>>(
      (acc, item) => {
        const key = item.sku ?? item.title;
        acc[key] = {
          title: item.title,
          sku: item.sku ?? "—",
          units: (acc[key]?.units ?? 0) + item.quantity,
          revenue: (acc[key]?.revenue ?? 0) + item.price * item.quantity,
        };
        return acc;
      },
      {},
    ),
  )
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const carriers = Object.values(
    shipments.reduce<Record<string, { label: string; value: number }>>((acc, shipment) => {
      acc[shipment.carrier] = {
        label: shipment.carrier,
        value: (acc[shipment.carrier]?.value ?? 0) + 1,
      };
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);

  const statusColors: Record<string, string> = {
    NEW: "#38bdf8",
    PROCESSING: "#fbbf24",
    ON_HOLD: "#fb923c",
    SHIPPED: "#a78bfa",
    DELIVERED: "#34d399",
    CANCELLED: "#f43f5e",
    REFUNDED: "#94a3b8",
  };

  const statusData = Object.values(
    orders.reduce<Record<string, { label: string; value: number; color: string }>>((acc, order) => {
      acc[order.status] = {
        label: order.status.replaceAll("_", " ").toLowerCase(),
        value: (acc[order.status]?.value ?? 0) + 1,
        color: statusColors[order.status] ?? "#64748b",
      };
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Analytics" description="Performance across every channel, last 90 days." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (90d)" value={formatMoney(revenue)} />
        <StatCard label="Orders (90d)" value={formatNumber(orders.length)} />
        <StatCard label="Average order" value={formatMoney(avgOrder)} />
        <StatCard
          label="Avg. time to ship"
          value={`${avgFulfilmentHours.toFixed(1)}h`}
          hint="paid → label created"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue — 12 weeks" />
          <div className="p-5">
            <AreaChart data={weeks} currency="USD" height={220} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Order status mix" />
          <div className="p-5">
            {statusData.length ? <Donut data={statusData} /> : <EmptyState title="No data" />}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Revenue by channel" />
          <div className="p-5">
            {byChannel.length ? <BarList data={byChannel} currency="USD" /> : <EmptyState title="No data" />}
          </div>
        </Card>

        <Card>
          <CardHeader title="Orders by destination" />
          <div className="p-5">
            {byCountry.length ? <BarList data={byCountry} /> : <EmptyState title="No data" />}
          </div>
        </Card>

        <Card>
          <CardHeader title="Shipments by carrier" />
          <div className="p-5">
            {carriers.length ? <BarList data={carriers} /> : <EmptyState title="No shipments yet" />}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Top products" description="By revenue, all time" />
        {topProducts.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Revenue</Th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product) => (
                <tr key={product.sku + product.title} className="transition hover:bg-ink-800/40">
                  <Td className="font-medium text-white">{product.title}</Td>
                  <Td className="text-xs text-slate-400">{product.sku}</Td>
                  <Td className="text-right">{formatNumber(product.units)}</Td>
                  <Td className="text-right font-medium">{formatMoney(product.revenue)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No product data yet" />
        )}
      </Card>
    </>
  );
}
