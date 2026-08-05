import type { Metadata } from "next";
import Link from "next/link";
import { Filter, Search } from "lucide-react";

import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Input,
  PageHeader,
  PlatformIcon,
  Select,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, formatNumber, ORDER_STATUSES } from "@/lib/utils";
import { bulkUpdateOrders } from "./actions";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const status = params.status ?? "";
  const shopId = params.shop ?? "";
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? 1));

  const where = {
    shop: { userId: user.id },
    ...(status ? { status } : {}),
    ...(shopId ? { shopId } : {}),
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" as const } },
            { buyerName: { contains: query, mode: "insensitive" as const } },
            { buyerEmail: { contains: query, mode: "insensitive" as const } },
            { externalId: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [orders, total, shops, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { shop: true, items: true, shipments: true },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.shop.findMany({ where: { userId: user.id } }),
    prisma.order.groupBy({
      by: ["status"],
      where: { shop: { userId: user.id } },
      _count: { status: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countFor = (value: string) =>
    statusCounts.find((entry) => entry.status === value)?._count.status ?? 0;

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { status, shop: shopId, q: query, page: String(page), ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== "1") next.set(key, value);
    }
    const qs = next.toString();
    return `/dashboard/orders${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Orders" description={`${formatNumber(total)} orders match your filters.`}>
        <ButtonLink href="/api/export/orders" variant="outline">
          Export CSV
        </ButtonLink>
      </PageHeader>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={buildHref({ status: "", page: "1" })}>
          <Badge
            className={!status ? "bg-brand-600/20 text-brand-200 ring-brand-500/40" : ""}
          >
            All
            <span className="text-slate-500">{formatNumber(statusCounts.reduce((s, e) => s + e._count.status, 0))}</span>
          </Badge>
        </Link>
        {ORDER_STATUSES.map((value) => (
          <Link key={value} href={buildHref({ status: value, page: "1" })}>
            <Badge
              tone={status === value ? value : undefined}
              className={status === value ? "" : "opacity-70 hover:opacity-100"}
            >
              {value.replaceAll("_", " ").toLowerCase()}
              <span className="text-slate-500">{formatNumber(countFor(value))}</span>
            </Badge>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4 p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_200px_auto]" action="/dashboard/orders">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search order number, buyer or marketplace id…"
              className="pl-9"
            />
          </div>
          <Select name="shop" defaultValue={shopId}>
            <option value="">All shops</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </Select>
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <Button type="submit" variant="secondary">
            <Filter className="h-4 w-4" /> Apply
          </Button>
        </form>
      </Card>

      {/* Table + bulk actions */}
      <form action={bulkUpdateOrders}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-600/40 px-5 py-3">
            <p className="text-xs text-slate-500">
              Select orders to update them in bulk.
            </p>
            <div className="flex items-center gap-2">
              <Select name="bulkStatus" defaultValue="" className="w-44 py-1.5 text-xs">
                <option value="">Bulk action…</option>
                {ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    Mark as {value.replaceAll("_", " ").toLowerCase()}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="secondary" className="py-1.5 text-xs">
                Apply
              </Button>
            </div>
          </div>

          {orders.length ? (
            <Table>
              <thead>
                <tr>
                  <Th className="w-10" />
                  <Th>Order</Th>
                  <Th>Channel</Th>
                  <Th>Buyer</Th>
                  <Th>Placed</Th>
                  <Th>Status</Th>
                  <Th>Tracking</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-ink-800/40">
                    <Td>
                      <input
                        type="checkbox"
                        name="orderIds"
                        value={order.id}
                        className="h-4 w-4 rounded border-ink-600 bg-ink-900"
                      />
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-medium text-white hover:text-brand-300"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {order.items.length} item{order.items.length === 1 ? "" : "s"}
                        {order.priority === "HIGH" || order.priority === "URGENT" ? (
                          <span className="ml-2 text-amber-400">● {order.priority.toLowerCase()}</span>
                        ) : null}
                      </p>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={order.shop.platform} />
                        <span className="text-xs text-slate-400">{order.shop.name}</span>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-sm">{order.buyerName}</p>
                      <p className="text-xs text-slate-500">
                        {order.shipCity}, {order.shipCountry}
                      </p>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-slate-400">
                      {formatDateTime(order.placedAt)}
                    </Td>
                    <Td>
                      <StatusBadge status={order.status} />
                    </Td>
                    <Td className="text-xs">
                      {order.shipments[0] ? (
                        <a
                          href={order.shipments[0].trackingUrl ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-400 hover:text-brand-300"
                        >
                          {order.shipments[0].carrier} ↗
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-right font-medium">
                      {formatMoney(order.total, order.currency)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              title="No orders found"
              description="Try clearing the filters, or connect a shop to import orders."
              action={<ButtonLink href="/dashboard/shops">Connect a shop</ButtonLink>}
            />
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-ink-600/40 px-5 py-3">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <ButtonLink
                    href={buildHref({ page: String(page - 1) })}
                    variant="outline"
                    className="px-3 py-1.5 text-xs"
                  >
                    ← Previous
                  </ButtonLink>
                ) : null}
                {page < totalPages ? (
                  <ButtonLink
                    href={buildHref({ page: String(page + 1) })}
                    variant="outline"
                    className="px-3 py-1.5 text-xs"
                  >
                    Next →
                  </ButtonLink>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </form>
    </>
  );
}
