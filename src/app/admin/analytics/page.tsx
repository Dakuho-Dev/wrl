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
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, PLATFORM_LABEL } from "@/lib/utils";

export const metadata: Metadata = { title: "Platform analytics · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  const from = new Date(Date.now() - 90 * 86400000);

  const [orders, shops, users, plans, topSellers] = await Promise.all([
    prisma.order.findMany({
      where: { placedAt: { gte: from } },
      select: { total: true, placedAt: true, status: true, shopId: true },
    }),
    prisma.shop.findMany({ select: { id: true, platform: true, userId: true } }),
    prisma.user.findMany({ select: { createdAt: true, planId: true } }),
    prisma.plan.findMany({ include: { _count: { select: { users: true } } } }),
    prisma.shop.findMany({
      include: { user: true, _count: { select: { orders: true } } },
      orderBy: { orders: { _count: "desc" } },
      take: 10,
    }),
  ]);

  const gmv = orders.reduce((sum, order) => sum + order.total, 0);
  const mrr = plans.reduce((sum, plan) => sum + plan.priceMonthly * plan._count.users, 0);

  const weeks = Array.from({ length: 12 }, (_, index) => {
    const end = new Date(Date.now() - (11 - index) * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    return {
      label: end.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      value: Number(
        orders
          .filter((order) => order.placedAt >= start && order.placedAt < end)
          .reduce((sum, order) => sum + order.total, 0)
          .toFixed(2),
      ),
    };
  });

  const signups = Array.from({ length: 12 }, (_, index) => {
    const end = new Date(Date.now() - (11 - index) * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    return {
      label: end.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      value: users.filter((user) => user.createdAt >= start && user.createdAt < end).length,
    };
  });

  const byPlatform = Object.values(
    orders.reduce<Record<string, { label: string; value: number }>>((acc, order) => {
      const shop = shops.find((entry) => entry.id === order.shopId);
      const key = shop?.platform ?? "OTHER";
      acc[key] = {
        label: PLATFORM_LABEL[key] ?? key,
        value: (acc[key]?.value ?? 0) + order.total,
      };
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);

  const planColors = ["#38bdf8", "#34d399", "#a78bfa", "#fbbf24"];
  const planDistribution = plans.map((plan, index) => ({
    label: plan.name,
    value: plan._count.users,
    color: planColors[index % planColors.length],
  }));

  return (
    <>
      <PageHeader title="Platform analytics" description="Aggregate performance across all accounts." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="GMV (90d)" value={formatMoney(gmv)} />
        <StatCard label="Orders (90d)" value={formatNumber(orders.length)} />
        <StatCard label="Estimated MRR" value={formatMoney(mrr)} hint="plan price × subscribers" />
        <StatCard label="Total accounts" value={formatNumber(users.length)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="GMV — 12 weeks" />
          <div className="p-5">
            <AreaChart data={weeks} currency="USD" height={220} />
          </div>
        </Card>
        <Card>
          <CardHeader title="New accounts — 12 weeks" />
          <div className="p-5">
            <AreaChart data={signups} height={220} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="GMV by channel" />
          <div className="p-5">
            {byPlatform.length ? <BarList data={byPlatform} currency="USD" /> : <EmptyState title="No data" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Accounts by plan" />
          <div className="p-5">
            {planDistribution.length ? <Donut data={planDistribution} /> : <EmptyState title="No plans" />}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Busiest shops" description="By total orders imported" />
        <Table>
          <thead>
            <tr>
              <Th>Shop</Th>
              <Th>Channel</Th>
              <Th>Owner</Th>
              <Th className="text-right">Orders</Th>
            </tr>
          </thead>
          <tbody>
            {topSellers.map((shop) => (
              <tr key={shop.id}>
                <Td className="font-medium text-white">{shop.name}</Td>
                <Td className="text-xs text-slate-400">{PLATFORM_LABEL[shop.platform]}</Td>
                <Td className="text-xs text-slate-400">{shop.user.email}</Td>
                <Td className="text-right">{formatNumber(shop._count.orders)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
