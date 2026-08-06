import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, DollarSign, LifeBuoy, ShoppingBag, Store, Users } from "lucide-react";

import { TrendChart, BarList } from "@/components/app/charts";
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
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, PLATFORM_LABEL, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdmin();

  const from30 = new Date(Date.now() - 30 * 86400000);

  const [
    userCount,
    newUsers,
    shopCount,
    errorShops,
    orderCount,
    orders30,
    openTickets,
    recentUsers,
    recentLogs,
    platformCounts,
    failedJobs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: from30 } } }),
    prisma.shop.count(),
    prisma.shop.count({ where: { status: "ERROR" } }),
    prisma.order.count(),
    prisma.order.findMany({
      where: { placedAt: { gte: from30 } },
      select: { total: true, placedAt: true },
    }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { plan: true, _count: { select: { shops: true } } },
    }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: true } }),
    prisma.shop.groupBy({ by: ["platform"], _count: { platform: true } }),
    prisma.syncJob.findMany({
      where: { status: "FAILED" },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { shop: { include: { user: true } } },
    }),
  ]);

  const gmv = orders30.reduce((sum, order) => sum + order.total, 0);

  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.now() - (13 - index) * 86400000);
    const key = date.toISOString().slice(0, 10);
    return {
      label: date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      value: orders30.filter((order) => order.placedAt.toISOString().slice(0, 10) === key).length,
    };
  });

  const byPlatform = platformCounts
    .map((entry) => ({
      label: PLATFORM_LABEL[entry.platform] ?? entry.platform,
      value: entry._count.platform,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader
        title="Platform dashboard"
        description="Everything happening across every DKH account."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={formatNumber(userCount)}
          delta={`+${newUsers}`}
          hint="new in 30 days"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Connected shops"
          value={formatNumber(shopCount)}
          hint={`${errorShops} in error state`}
          icon={<Store className="h-4 w-4" />}
        />
        <StatCard
          label="Orders processed"
          value={formatNumber(orderCount)}
          hint={`${formatNumber(orders30.length)} in last 30 days`}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <StatCard
          label="GMV (30d)"
          value={formatMoney(gmv)}
          hint="gross merchandise value"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {(errorShops > 0 || openTickets > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {errorShops > 0 ? (
            <Link href="/admin/shops?status=ERROR">
              <Card className="flex items-center gap-3 border-rose-500/30 bg-rose-500/5 p-4 transition hover:border-rose-500/50">
                <AlertTriangle className="h-5 w-5 text-rose-700" />
                <p className="text-sm text-rose-700">
                  <strong>{errorShops}</strong> shop{errorShops === 1 ? "" : "s"} failing to sync
                </p>
              </Card>
            </Link>
          ) : null}
          {openTickets > 0 ? (
            <Link href="/admin/tickets">
              <Card className="flex items-center gap-3 border-amber-500/30 bg-amber-500/5 p-4 transition hover:border-amber-500/50">
                <LifeBuoy className="h-5 w-5 text-amber-700" />
                <p className="text-sm text-amber-700">
                  <strong>{openTickets}</strong> open support ticket{openTickets === 1 ? "" : "s"}
                </p>
              </Card>
            </Link>
          ) : null}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Orders imported — last 14 days" description="Across all accounts" />
          <div className="p-5">
            <TrendChart data={days} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Shops by channel" />
          <div className="p-5">
            {byPlatform.length ? <BarList data={byPlatform} /> : <EmptyState title="No shops" />}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Newest accounts"
            action={
              <Link href="/admin/users" className="text-xs text-accent hover:text-accent">
                All users →
              </Link>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Plan</Th>
                <Th className="text-right">Shops</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} className="transition hover:bg-paper-2">
                  <Td>
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(user.email)}`}
                      className="font-medium text-ink hover:text-accent"
                    >
                      {user.name}
                    </Link>
                    <p className="text-xs text-muted-2">{user.email}</p>
                  </Td>
                  <Td>
                    <Badge>{user.plan?.name ?? "—"}</Badge>
                  </Td>
                  <Td className="text-right">{user._count.shops}</Td>
                  <Td className="text-xs text-muted">{timeAgo(user.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Recent activity"
            action={
              <Link href="/admin/logs" className="text-xs text-accent hover:text-accent">
                Full log →
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {recentLogs.map((log) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink-2">{log.message}</p>
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase ${
                      log.level === "ERROR"
                        ? "text-rose-700"
                        : log.level === "WARN"
                          ? "text-amber-700"
                          : "text-muted-2"
                    }`}
                  >
                    {log.level}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-2">
                  {log.user?.email ?? "system"} · {log.category.toLowerCase()} ·{" "}
                  {timeAgo(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {failedJobs.length ? (
        <Card className="mt-4">
          <CardHeader title="Failed sync jobs" description="Needs investigation" />
          <Table>
            <thead>
              <tr>
                <Th>Shop</Th>
                <Th>Owner</Th>
                <Th>Type</Th>
                <Th>Error</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {failedJobs.map((job) => (
                <tr key={job.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={job.shop.platform} />
                      <span className="text-sm">{job.shop.name}</span>
                    </div>
                  </Td>
                  <Td className="text-xs text-muted">{job.shop.user.email}</Td>
                  <Td>
                    <StatusBadge status={job.status} />
                  </Td>
                  <Td className="max-w-72 truncate text-xs text-rose-700">{job.message}</Td>
                  <Td className="text-xs text-muted">{timeAgo(job.startedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
    </>
  );
}
