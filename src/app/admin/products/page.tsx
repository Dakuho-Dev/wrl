import type { Metadata } from "next";

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
import { formatMoney, formatNumber, PLATFORM_LABEL } from "@/lib/utils";

export const metadata: Metadata = { title: "Products · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const platform = params.platform ?? "";

  const where = {
    ...(platform ? { shop: { platform } } : {}),
    ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" as const } }, { sku: { contains: query, mode: "insensitive" as const } }] } : {}),
  };

  const [products, total, active, outOfStock] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { shop: { include: { user: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.product.count(),
    prisma.product.count({ where: { state: "active" } }),
    prisma.product.count({ where: { quantity: 0 } }),
  ]);

  return (
    <>
      <PageHeader title="Products" description="Listings synced from every seller account." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Listings synced" value={formatNumber(total)} />
        <StatCard label="Active" value={formatNumber(active)} />
        <StatCard label="Out of stock" value={formatNumber(outOfStock)} />
      </div>

      <Card className="my-4 p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]" action="/admin/products">
          <Input name="q" defaultValue={query} placeholder="Search title or SKU…" />
          <Select name="platform" defaultValue={platform}>
            <option value="">Any channel</option>
            {Object.entries(PLATFORM_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="All listings" description={`Showing ${products.length} of ${formatNumber(total)}`} />
        {products.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Shop</Th>
                <Th>Owner</Th>
                <Th>State</Th>
                <Th className="text-right">Stock</Th>
                <Th className="text-right">Price</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="transition hover:bg-paper-2">
                  <Td>
                    <p className="font-medium text-ink">{product.title}</p>
                    <p className="text-xs text-muted-2">SKU {product.sku ?? "—"}</p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={product.shop.platform} />
                      <span className="text-xs text-muted">{product.shop.name}</span>
                    </div>
                  </Td>
                  <Td className="text-xs text-muted">{product.shop.user.email}</Td>
                  <Td>
                    <Badge tone={product.state === "active" ? "ACTIVE" : undefined}>
                      {product.state}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <span className={product.quantity === 0 ? "text-rose-700" : ""}>
                      {formatNumber(product.quantity)}
                    </span>
                  </Td>
                  <Td className="text-right font-medium">
                    {formatMoney(product.price, product.currency)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No products found" />
        )}
      </Card>
    </>
  );
}
