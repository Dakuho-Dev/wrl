import type { Metadata } from "next";
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  PlatformIcon,
  Select,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNumber, PLATFORM_LABEL, timeAgo } from "@/lib/utils";
import { adminDeleteShop, adminSyncShop } from "../actions";

export const metadata: Metadata = { title: "Shops · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminShopsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const platform = params.platform ?? "";
  const status = params.status ?? "";
  const query = params.q?.trim() ?? "";

  const where = {
    ...(platform ? { platform } : {}),
    ...(status ? { status } : {}),
    ...(query
      ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { user: { email: { contains: query, mode: "insensitive" as const } } }] }
      : {}),
  };

  const [shops, total, connected, errored, live] = await Promise.all([
    prisma.shop.findMany({
      where,
      include: {
        user: true,
        _count: { select: { orders: true, products: true } },
        syncJobs: { orderBy: { startedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.shop.count(),
    prisma.shop.count({ where: { status: "CONNECTED" } }),
    prisma.shop.count({ where: { status: "ERROR" } }),
    prisma.shop.count({ where: { isDemo: false } }),
  ]);

  return (
    <>
      <PageHeader title="Shops" description="Every connected sales channel across the platform." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total shops" value={formatNumber(total)} />
        <StatCard label="Connected" value={formatNumber(connected)} />
        <StatCard label="In error" value={formatNumber(errored)} />
        <StatCard label="Live API connections" value={formatNumber(live)} hint="non-demo" />
      </div>

      <Card className="my-4 p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_160px_160px_auto]" action="/admin/shops">
          <Input name="q" defaultValue={query} placeholder="Search shop name or owner email…" />
          <Select name="platform" defaultValue={platform}>
            <option value="">Any channel</option>
            {Object.entries(PLATFORM_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={status}>
            <option value="">Any status</option>
            {["CONNECTED", "DISCONNECTED", "ERROR", "SYNCING"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Connected shops" description={`Showing ${shops.length} shops`} />
        {shops.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Shop</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th>Mode</Th>
                <Th>Last sync</Th>
                <Th className="text-right">Orders</Th>
                <Th className="text-right">Listings</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {shops.map((shop) => (
                <tr key={shop.id} className="transition hover:bg-ink-800/30">
                  <Td>
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={shop.platform} />
                      <div className="min-w-0">
                        <p className="font-medium text-white">{shop.name}</p>
                        <p className="text-xs text-slate-500">
                          {PLATFORM_LABEL[shop.platform] ?? shop.platform} · {shop.externalId}
                        </p>
                      </div>
                      {shop.url ? (
                        <a href={shop.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-brand-300">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <p className="text-sm text-slate-200">{shop.user.name}</p>
                    <p className="text-xs text-slate-500">{shop.user.email}</p>
                  </Td>
                  <Td>
                    <Badge tone={shop.status}>{shop.status.toLowerCase()}</Badge>
                    {shop.lastSyncError ? (
                      <p className="mt-1 max-w-48 truncate text-xs text-rose-400" title={shop.lastSyncError}>
                        {shop.lastSyncError}
                      </p>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge>{shop.isDemo ? "demo" : "live"}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    {timeAgo(shop.lastSyncAt)}
                    {shop.syncJobs[0] ? (
                      <p className="text-slate-600">{shop.syncJobs[0].status.toLowerCase()}</p>
                    ) : null}
                  </Td>
                  <Td className="text-right">{formatNumber(shop._count.orders)}</Td>
                  <Td className="text-right">{formatNumber(shop._count.products)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      <form action={adminSyncShop}>
                        <input type="hidden" name="shopId" value={shop.id} />
                        <Button type="submit" variant="outline" className="px-2 py-1 text-xs">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                      <form action={adminDeleteShop}>
                        <input type="hidden" name="shopId" value={shop.id} />
                        <Button type="submit" variant="ghost" className="px-2 py-1 text-xs text-rose-300">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No shops found" />
        )}
      </Card>
    </>
  );
}
