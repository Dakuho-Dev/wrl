import type { Metadata } from "next";

import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  PlatformIcon,
  Select,
  StatCard,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, formatNumber, ORDER_STATUSES } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders · Admin" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const status = params.status ?? "";
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? 1));

  const where = {
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" as const } },
            { buyerName: { contains: query, mode: "insensitive" as const } },
            { externalId: { contains: query, mode: "insensitive" as const } },
            { shop: { name: { contains: query, mode: "insensitive" as const } } },
            { shop: { user: { email: { contains: query, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [orders, total, revenue, today] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { shop: { include: { user: true } }, items: true },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ _sum: { total: true } }),
    prisma.order.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (nextPage: number) => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (query) qs.set("q", query);
    if (nextPage > 1) qs.set("page", String(nextPage));
    const value = qs.toString();
    return `/admin/orders${value ? `?${value}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Orders" description="Every order imported by every account." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Matching orders" value={formatNumber(total)} />
        <StatCard label="Imported today" value={formatNumber(today)} />
        <StatCard label="Lifetime GMV" value={formatMoney(revenue._sum.total ?? 0)} />
      </div>

      <Card className="my-4 p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]" action="/admin/orders">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search order number, buyer, shop or owner email…"
          />
          <Select name="status" defaultValue={status}>
            <option value="">Any status</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="All orders" description={`Page ${page} of ${totalPages}`} />
        {orders.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Account</Th>
                <Th>Shop</Th>
                <Th>Buyer</Th>
                <Th>Placed</Th>
                <Th>Status</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="transition hover:bg-paper-2">
                  <Td>
                    <p className="font-medium text-ink">{order.orderNumber}</p>
                    <p className="text-xs text-muted-2">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    </p>
                  </Td>
                  <Td className="text-xs text-muted">{order.shop.user.email}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={order.shop.platform} />
                      <span className="text-xs text-muted">{order.shop.name}</span>
                    </div>
                  </Td>
                  <Td className="text-sm">{order.buyerName}</Td>
                  <Td className="whitespace-nowrap text-xs text-muted">
                    {formatDateTime(order.placedAt)}
                  </Td>
                  <Td>
                    <StatusBadge status={order.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-right font-medium">
                    {formatMoney(order.total, order.currency)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No orders found" />
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <p className="text-xs text-muted-2">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <ButtonLink href={hrefFor(page - 1)} variant="outline" className="px-3 py-1.5 text-xs">
                  ← Previous
                </ButtonLink>
              ) : null}
              {page < totalPages ? (
                <ButtonLink href={hrefFor(page + 1)} variant="outline" className="px-3 py-1.5 text-xs">
                  Next →
                </ButtonLink>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
