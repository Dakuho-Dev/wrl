import type { Metadata } from "next";
import Link from "next/link";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  PageHeader,
  PlatformIcon,
  Select,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { shopTokens } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { etsyConfig, rawEtsyRequest, userIdFromToken } from "@/lib/etsy";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "API explorer · Admin" };
export const dynamic = "force-dynamic";

/** Ready-made calls. {userId} and {shopId} are filled in from the selected shop. */
const PRESETS: Array<{ label: string; path: string; needsShop: boolean }> = [
  { label: "Ping — is the API key valid?", path: "/openapi-ping", needsShop: false },
  { label: "Me — the authorised Etsy user", path: "/users/{userId}", needsShop: true },
  { label: "My shops", path: "/users/{userId}/shops", needsShop: true },
  { label: "Shop profile", path: "/shops/{shopId}", needsShop: true },
  { label: "Receipts (orders) — 5 newest", path: "/shops/{shopId}/receipts?limit=5", needsShop: true },
  { label: "Active listings — 5 with images", path: "/shops/{shopId}/listings/active?limit=5&includes=Images", needsShop: true },
  { label: "Shop sections", path: "/shops/{shopId}/sections", needsShop: true },
  { label: "Shipping profiles", path: "/shops/{shopId}/shipping-profiles", needsShop: true },
];

export default async function ApiExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const etsy = etsyConfig();

  const shops = await prisma.shop.findMany({
    where: { platform: "ETSY" },
    include: { user: true },
    orderBy: [{ isDemo: "asc" }, { createdAt: "desc" }],
  });

  const liveShops = shops.filter((shop) => !shop.isDemo && shop.accessToken);
  const selectedShopId = params.shop ?? liveShops[0]?.id ?? "";
  const shop = shops.find((entry) => entry.id === selectedShopId);
  const rawPath = params.path ?? "";

  let result: Awaited<ReturnType<typeof rawEtsyRequest>> | null = null;
  let error: string | null = null;
  let resolvedPath = "";

  if (rawPath) {
    try {
      const tokens = shop ? shopTokens(shop) : { accessToken: null, refreshToken: null };
      const etsyUserId = tokens.accessToken ? userIdFromToken(tokens.accessToken) : "";

      resolvedPath = rawPath
        .replaceAll("{shopId}", shop?.externalId ?? "")
        .replaceAll("{userId}", etsyUserId);

      if (resolvedPath.includes("{")) {
        throw new Error("Select a connected Etsy shop first — the path still has placeholders.");
      }

      result = await rawEtsyRequest(resolvedPath, tokens.accessToken ?? undefined);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Request failed";
    }
  }

  return (
    <>
      <PageHeader
        title="API explorer"
        description="Send a request to the Etsy Open API and read the untouched response."
      />

      {!etsy.isLive ? (
        <div className="mb-4">
          <Alert tone="warning" title="No Etsy credentials on this deployment">
            <code>ETSY_CLIENT_ID</code> is empty, so every call will fail. Set it and{" "}
            <code>ETSY_CLIENT_SECRET</code> on Vercel, redeploy, then come back.
          </Alert>
        </div>
      ) : liveShops.length === 0 ? (
        <div className="mb-4">
          <Alert tone="info" title="No Etsy shop connected yet">
            Only the ping endpoint works without a shop. To read orders and listings, connect a real
            Etsy shop from{" "}
            <Link href="/dashboard/shops" className="underline">
              Dashboard → Shops
            </Link>
            .
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit lg:col-span-1">
          <CardHeader title="Request" description="Presets fill the path for you" />
          <form className="space-y-4 p-5" action="/admin/api-explorer">
            <label className="block">
              <span className="label mb-1.5 block">Shop (supplies the token)</span>
              <Select name="shop" defaultValue={selectedShopId}>
                <option value="">None — unauthenticated</option>
                {shops.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} {entry.isDemo ? "(demo — no real token)" : ""} · {entry.user.email}
                  </option>
                ))}
              </Select>
            </label>

            <div>
              <span className="label mb-1.5 block">Presets</span>
              <div className="divide-y divide-line border-y border-line">
                {PRESETS.map((preset) => (
                  <Link
                    key={preset.path}
                    href={`/admin/api-explorer?shop=${encodeURIComponent(selectedShopId)}&path=${encodeURIComponent(preset.path)}`}
                    className="block py-2 text-sm text-ink-2 transition hover:text-accent"
                  >
                    {preset.label}
                    <span className="mt-0.5 block font-mono text-[11px] text-muted-2">
                      {preset.path}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="label mb-1.5 block">Or type a path</span>
              <Input
                name="path"
                defaultValue={rawPath}
                placeholder="/shops/{shopId}/receipts?limit=5"
                className="font-mono text-xs"
              />
              <span className="mt-1 block text-xs text-muted-2">
                Relative to <code>openapi.etsy.com/v3/application</code>. Placeholders{" "}
                <code>{"{shopId}"}</code> and <code>{"{userId}"}</code> are substituted.
              </span>
            </label>

            <Button type="submit" className="w-full">
              Send request
            </Button>
          </form>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {shop ? (
            <Card className="flex flex-wrap items-center gap-4 p-4">
              <PlatformIcon platform="ETSY" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{shop.name}</p>
                <p className="font-mono text-[11px] text-muted">
                  shop_id {shop.externalId} · synced {timeAgo(shop.lastSyncAt)}
                </p>
              </div>
              <Badge tone={shop.isDemo ? undefined : "CONNECTED"}>
                {shop.isDemo ? "demo" : "live token"}
              </Badge>
            </Card>
          ) : null}

          {error ? <Alert tone="danger" title="Request could not be sent">{error}</Alert> : null}

          {result ? (
            <Card>
              <CardHeader
                title="Response"
                description={resolvedPath}
                action={
                  <Badge tone={result.ok ? "SUCCESS" : "FAILED"}>
                    {result.status} · {result.durationMs}ms
                  </Badge>
                }
              />

              <dl className="grid grid-cols-2 divide-x divide-line border-b border-line sm:grid-cols-4">
                {[
                  ["Daily limit", result.rateLimit.limit],
                  ["Remaining today", result.rateLimit.remaining],
                  ["Per second", result.rateLimit.perSecond],
                  ["Left this sec", result.rateLimit.remainingPerSecond],
                ].map(([label, value]) => (
                  <div key={label as string} className="px-4 py-3">
                    <dt className="label">{label as string}</dt>
                    <dd className="mt-1 font-mono text-sm text-ink">{(value as string) ?? "—"}</dd>
                  </div>
                ))}
              </dl>

              <pre className="scroll-thin max-h-[560px] overflow-auto bg-paper-2 p-4 text-xs leading-relaxed text-ink">
                <code>{JSON.stringify(result.body, null, 2)}</code>
              </pre>
            </Card>
          ) : !error ? (
            <Card className="p-10 text-center">
              <p className="font-display text-lg text-ink">Pick a preset to send your first call</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Start with <strong>Ping</strong> — it only needs the API key, so it tells you
                straight away whether the keystring is valid.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
