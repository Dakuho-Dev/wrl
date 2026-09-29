import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Plug, RefreshCw, Trash2 } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PlatformIcon,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireUser, shopLimitFor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { etsyConfig } from "@/lib/etsy";
import { formatDateTime, formatNumber, PLATFORM_LABEL, timeAgo } from "@/lib/utils";
import { connectDemoShop, disconnectShop, syncShopNow, toggleAutoSync } from "./actions";

export const metadata: Metadata = { title: "Shops" };
export const dynamic = "force-dynamic";


export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const etsy = etsyConfig();

  const shops = await prisma.shop.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, products: true } },
      syncJobs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });

  const shopLimit = shopLimitFor(user);
  const unlimited = !Number.isFinite(shopLimit);
  // Disconnected shops keep their history but hold no tokens, so they don't
  // count against the plan — matching the check in connectDemoShop.
  const activeShops = shops.filter((shop) => shop.status !== "DISCONNECTED");
  const atLimit = activeShops.length >= shopLimit;

  return (
    <>
      <PageHeader
        title="Shops"
        description={`${
          unlimited
            ? `${activeShops.length} shop${activeShops.length === 1 ? "" : "s"} connected — admin account, no shop limit.`
            : `${activeShops.length} of ${shopLimit} shop${shopLimit === 1 ? "" : "s"} connected on the ${user.plan?.name ?? "Starter"} plan.`
        }${
          shops.length > activeShops.length
            ? ` ${shops.length - activeShops.length} disconnected shop${shops.length - activeShops.length === 1 ? "" : "s"} kept for history — they don't use a slot.`
            : ""
        }`}
      >
        <ButtonLink href="/docs#connect-etsy" variant="outline">
          Connection guide
        </ButtonLink>
      </PageHeader>

      {params.welcome ? (
        <div className="mb-4">
          <Alert tone="success" title="Your account is ready">
            Connect your first shop below. Orders and listings start importing right away.
          </Alert>
        </div>
      ) : null}

      {params.connected ? (
        <div className="mb-4">
          <Alert tone="success" title="Shop connected">
            {params.connected} was linked successfully and the first sync has run.
          </Alert>
        </div>
      ) : null}

      {params.error ? (
        <div className="mb-4">
          <Alert tone="danger" title="Connection failed">
            {decodeURIComponent(params.error)}
          </Alert>
        </div>
      ) : null}

      {/* ---------------------------------------------------------- Connect */}
      <Card className="mb-6">
        <CardHeader
          title="Connect a sales channel"
          description="Authorization happens on the marketplace's own screen. You approve the scopes; we never see your password."
        />

        <div className="grid gap-4 p-5 md:grid-cols-2">
          {/* Etsy — real OAuth when configured */}
          <div className="rounded-xl border border-line bg-paper-2 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-lg font-bold text-ink">
                E
              </span>
              <div>
                <h3 className="font-semibold text-ink">Etsy</h3>
                <p className="text-xs text-muted-2">Etsy Open API v3 · OAuth 2.0 + PKCE</p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-muted">
              {etsy.scopes.map((scope) => (
                <p key={scope} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  <code className="text-accent">{scope}</code>
                </p>
              ))}
            </div>

            {etsy.isLive ? (
              <>
                <ButtonLink
                  href="/api/integrations/etsy/connect"
                  className="mt-5 w-full justify-center py-2.5"
                >
                  <Plug className="h-4 w-4" /> Connect Etsy shop
                </ButtonLink>
                <p className="mt-2 text-center text-[11px] text-muted-2">
                  Redirects to etsy.com to authorize.
                </p>
              </>
            ) : (
              <>
                <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700">
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      No Etsy API credentials configured. Set <code>ETSY_CLIENT_ID</code> and{" "}
                      <code>ETSY_CLIENT_SECRET</code> to enable the live OAuth flow. Until then you
                      can connect a simulated Etsy channel below.
                    </span>
                  </p>
                </div>
                <form action={connectDemoShop} className="mt-3">
                  <input type="hidden" name="platform" value="ETSY" />
                  <Button type="submit" variant="secondary" className="w-full py-2.5" disabled={atLimit}>
                    <Plug className="h-4 w-4" /> Connect demo Etsy shop
                  </Button>
                </form>
              </>
            )}
          </div>

          {/* Etsy is the only integration. We do not advertise channels we have not built. */}
          <div className="space-y-3">
            <div className="border border-line bg-paper-2 p-4">
              <p className="label">Other marketplaces</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                WrL supports Etsy only. Shopify, Amazon and TikTok Shop are not implemented — if
                you need them,{" "}
                <Link href="/contact" className="text-accent underline">
                  tell us
                </Link>{" "}
                and we will say honestly whether they are planned.
              </p>
            </div>

            <details className="rounded-xl border border-line bg-paper-2 p-4">
              <summary className="cursor-pointer text-sm font-medium text-ink-2">
                Connect with a custom name
              </summary>
              <form action={connectDemoShop} className="mt-3 space-y-3">
                <input type="hidden" name="platform" value="ETSY" />
                <Field label="Shop name">
                  <Input name="name" placeholder="MyEtsyShopName" />
                </Field>
                <Button type="submit" variant="secondary" className="w-full" disabled={atLimit}>
                  Add channel
                </Button>
              </form>
            </details>
          </div>
        </div>

        {atLimit ? (
          <div className="border-t border-line px-5 py-3">
            <p className="text-xs text-amber-700">
              You have reached the {shopLimit}-shop limit of your plan.{" "}
              <Link href="/dashboard/billing" className="underline">
                Upgrade
              </Link>{" "}
              to connect more.
            </p>
          </div>
        ) : null}
      </Card>

      {/* ---------------------------------------------------------- Connected shops */}
      <Card>
        <CardHeader title="Connected shops" description="Sync state, volume and access control" />

        {shops.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Shop</Th>
                <Th>Status</Th>
                <Th>Last sync</Th>
                <Th className="text-right">Orders</Th>
                <Th className="text-right">Listings</Th>
                <Th>Auto-sync</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {shops.map((shop) => (
                <tr key={shop.id} className="align-top transition hover:bg-paper-2">
                  <Td>
                    <div className="flex items-start gap-3">
                      <PlatformIcon platform={shop.platform} className="mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{shop.name}</p>
                        <p className="text-xs text-muted-2">
                          {PLATFORM_LABEL[shop.platform] ?? shop.platform} · id {shop.externalId}
                          {shop.isDemo ? " · demo" : ""}
                        </p>
                        {shop.url ? (
                          <a
                            href={shop.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent"
                          >
                            Open shop <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={shop.status}>{shop.status.toLowerCase()}</Badge>
                    {shop.lastSyncError ? (
                      <p className="mt-1 max-w-48 text-xs text-rose-700">{shop.lastSyncError}</p>
                    ) : null}
                  </Td>
                  <Td>
                    <p className="text-xs text-ink-2">{timeAgo(shop.lastSyncAt)}</p>
                    <p className="text-xs text-muted-2">{formatDateTime(shop.lastSyncAt)}</p>
                    {shop.syncJobs[0] ? (
                      <p className="mt-0.5 text-xs text-muted-2">
                        {shop.syncJobs[0].itemsSaved} records · {shop.syncJobs[0].status.toLowerCase()}
                      </p>
                    ) : null}
                  </Td>
                  <Td className="text-right">{formatNumber(shop._count.orders)}</Td>
                  <Td className="text-right">{formatNumber(shop._count.products)}</Td>
                  <Td>
                    <form action={toggleAutoSync}>
                      <input type="hidden" name="shopId" value={shop.id} />
                      <button
                        type="submit"
                        className={`relative h-6 w-11 rounded-full transition ${
                          shop.autoSync ? "bg-accent" : "bg-paper-3"
                        }`}
                        aria-label="Toggle auto-sync"
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-surface transition-all ${
                            shop.autoSync ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </form>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      {shop.status === "DISCONNECTED" ? (
                        <form action={disconnectShop}>
                          <input type="hidden" name="shopId" value={shop.id} />
                          <input type="hidden" name="purge" value="on" />
                          <Button
                            type="submit"
                            variant="danger"
                            className="px-2.5 py-1.5 text-xs"
                            title="Permanently delete this shop and everything imported from it"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete permanently
                          </Button>
                        </form>
                      ) : (
                        <>
                          <form action={syncShopNow}>
                            <input type="hidden" name="shopId" value={shop.id} />
                            <Button type="submit" variant="outline" className="px-2.5 py-1.5 text-xs">
                              <RefreshCw className="h-3.5 w-3.5" /> Sync
                            </Button>
                          </form>
                          <form action={disconnectShop}>
                            <input type="hidden" name="shopId" value={shop.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              className="px-2.5 py-1.5 text-xs text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Disconnect
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            title="No shops connected"
            description="Pick a channel above to link your first store."
          />
        )}
      </Card>

      <Card className="mt-4 p-5">
        <h3 className="text-sm font-semibold text-ink">What happens when you disconnect</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>• Access and refresh tokens are deleted immediately — syncing stops.</li>
          <li>• Already-imported orders stay in WrL so you keep your history.</li>
          <li>
            • To erase every order and listing we hold, delete your account from{" "}
            <Link href="/dashboard/settings" className="text-accent hover:text-accent">
              Settings → Data &amp; privacy
            </Link>
            .
          </li>
        </ul>
      </Card>
    </>
  );
}
