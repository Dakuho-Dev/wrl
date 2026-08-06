import type { Metadata } from "next";
import { Package, Search } from "lucide-react";

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
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, parseJson } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const shopId = params.shop ?? "";

  const where = {
    shop: { userId: user.id },
    ...(shopId ? { shopId } : {}),
    ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" as const } }, { sku: { contains: query, mode: "insensitive" as const } }] } : {}),
  };

  const [products, shops, total, outOfStock, inventoryValue] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { shop: true },
      orderBy: { views: "desc" },
      take: 100,
    }),
    prisma.shop.findMany({ where: { userId: user.id } }),
    prisma.product.count({ where: { shop: { userId: user.id } } }),
    prisma.product.count({ where: { shop: { userId: user.id }, quantity: 0 } }),
    prisma.product.findMany({
      where: { shop: { userId: user.id } },
      select: { price: true, quantity: true },
    }),
  ]);

  const stockValue = inventoryValue.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <PageHeader
        title="Products"
        description="Listings synced from every connected channel."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Listings synced" value={formatNumber(total)} icon={<Package className="h-4 w-4" />} />
        <StatCard label="Out of stock" value={formatNumber(outOfStock)} hint="need restocking" />
        <StatCard label="Inventory value" value={formatMoney(stockValue)} hint="price × quantity" />
      </div>

      <Card className="my-4 p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_200px_auto]" action="/dashboard/products">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <Input name="q" defaultValue={query} placeholder="Search title or SKU…" className="pl-9" />
          </div>
          <Select name="shop" defaultValue={shopId}>
            <option value="">All shops</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Listings" description={`Showing ${products.length} of ${formatNumber(total)}`} />
        {products.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Shop</Th>
                <Th>Tags</Th>
                <Th>State</Th>
                <Th className="text-right">Stock</Th>
                <Th className="text-right">Views</Th>
                <Th className="text-right">Price</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const tags = parseJson<string[]>(product.tags, []);
                return (
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
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-none bg-paper-2 px-1.5 py-0.5 text-[11px] text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Td>
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
                    <Td className="text-right text-muted">{formatNumber(product.views)}</Td>
                    <Td className="text-right font-medium">
                      {formatMoney(product.price, product.currency)}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            title="No listings found"
            description="Connect a shop or clear the filters to see products."
          />
        )}
      </Card>
    </>
  );
}
