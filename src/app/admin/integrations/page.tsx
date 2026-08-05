import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink } from "lucide-react";

import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  PlatformIcon,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appUrl as resolveAppUrl } from "@/lib/env";
import { etsyConfig } from "@/lib/etsy";
import { formatNumber, PLATFORM_LABEL, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Integrations · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  await requireAdmin();
  const etsy = etsyConfig();
  const appUrl = resolveAppUrl();

  const [byPlatform, liveShops, recentJobs, failedJobs] = await Promise.all([
    prisma.shop.groupBy({ by: ["platform", "status"], _count: { platform: true } }),
    prisma.shop.count({ where: { isDemo: false } }),
    prisma.syncJob.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { shop: true },
    }),
    prisma.syncJob.count({ where: { status: "FAILED" } }),
  ]);

  const platforms = ["ETSY", "SHOPIFY", "AMAZON", "TIKTOK"].map((platform) => {
    const rows = byPlatform.filter((entry) => entry.platform === platform);
    return {
      platform,
      total: rows.reduce((sum, entry) => sum + entry._count.platform, 0),
      connected: rows.find((entry) => entry.status === "CONNECTED")?._count.platform ?? 0,
      errored: rows.find((entry) => entry.status === "ERROR")?._count.platform ?? 0,
    };
  });

  const checks = [
    { label: "ETSY_CLIENT_ID", ok: Boolean(etsy.clientId), value: etsy.clientId ? `${etsy.clientId.slice(0, 6)}…` : "not set" },
    { label: "ETSY_CLIENT_SECRET", ok: Boolean(etsy.clientSecret), value: etsy.clientSecret ? "configured" : "not set" },
    { label: "ETSY_REDIRECT_URI", ok: Boolean(etsy.redirectUri), value: etsy.redirectUri },
    { label: "NEXT_PUBLIC_APP_URL", ok: Boolean(appUrl), value: appUrl },
    { label: "AUTH_SECRET", ok: (process.env.AUTH_SECRET?.length ?? 0) >= 32, value: (process.env.AUTH_SECRET?.length ?? 0) >= 32 ? "strong" : "weak or missing" },
  ];

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Marketplace API configuration and connection health."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live API connections" value={formatNumber(liveShops)} hint="non-demo shops" />
        <StatCard label="Etsy shops" value={formatNumber(platforms[0].total)} />
        <StatCard label="Failed sync jobs" value={formatNumber(failedJobs)} />
        <StatCard
          label="Etsy credentials"
          value={etsy.isLive ? "Live" : "Demo"}
          hint={etsy.isLive ? "OAuth enabled" : "keys not configured"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Etsy Open API v3"
            description="OAuth 2.0 authorization code grant with PKCE"
            action={<Badge tone={etsy.isLive ? "CONNECTED" : undefined}>{etsy.isLive ? "live" : "demo"}</Badge>}
          />
          <div className="space-y-4 p-5">
            {!etsy.isLive ? (
              <Alert tone="warning" title="Running in demo mode">
                Set <code>ETSY_CLIENT_ID</code> and <code>ETSY_CLIENT_SECRET</code> in your
                environment, then restart, to enable the live Etsy OAuth flow. Until then sellers can
                only connect simulated channels.
              </Alert>
            ) : (
              <Alert tone="success" title="Live credentials detected">
                Sellers can connect real Etsy shops through the Etsy authorization screen.
              </Alert>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Register this callback URL in your Etsy app
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink-600/50 bg-ink-900 px-3 py-2.5">
                <code className="flex-1 break-all text-xs text-brand-300">{etsy.redirectUri}</code>
                <Copy className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                It must match exactly, including protocol and trailing path.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Requested scopes
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {etsy.scopes.map((scope) => (
                  <code
                    key={scope}
                    className="rounded-lg border border-ink-600/50 bg-ink-900 px-2 py-1 text-xs text-brand-300"
                  >
                    {scope}
                  </code>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Endpoints used
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                <li>
                  <code className="text-slate-300">GET</code> etsy.com/oauth/connect — authorization
                </li>
                <li>
                  <code className="text-slate-300">POST</code> /v3/public/oauth/token — token exchange &
                  refresh
                </li>
                <li>
                  <code className="text-slate-300">GET</code> /v3/application/users/&#123;id&#125;/shops
                </li>
                <li>
                  <code className="text-slate-300">GET</code> /v3/application/shops/&#123;id&#125;/receipts
                </li>
                <li>
                  <code className="text-slate-300">GET</code>{" "}
                  /v3/application/shops/&#123;id&#125;/listings/active
                </li>
                <li>
                  <code className="text-slate-300">POST</code>{" "}
                  /v3/application/shops/&#123;id&#125;/receipts/&#123;id&#125;/tracking
                </li>
              </ul>
            </div>

            <a
              href="https://developers.etsy.com/documentation/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300"
            >
              Etsy developer documentation <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Environment checks" description="Configuration required for production" />
            <div className="divide-y divide-ink-700/40">
              {checks.map((check) => (
                <div key={check.label} className="flex items-center gap-3 px-5 py-3">
                  {check.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <code className="text-xs text-slate-300">{check.label}</code>
                  <span className="ml-auto truncate text-xs text-slate-500">{check.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Channel health" />
            <Table>
              <thead>
                <tr>
                  <Th>Channel</Th>
                  <Th className="text-right">Shops</Th>
                  <Th className="text-right">Connected</Th>
                  <Th className="text-right">Errors</Th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((entry) => (
                  <tr key={entry.platform}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={entry.platform} />
                        <span className="text-sm">{PLATFORM_LABEL[entry.platform]}</span>
                      </div>
                    </Td>
                    <Td className="text-right">{entry.total}</Td>
                    <Td className="text-right text-emerald-400">{entry.connected}</Td>
                    <Td className="text-right text-rose-400">{entry.errored}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent sync jobs" description="Latest marketplace API runs across the platform" />
        {recentJobs.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Shop</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th className="text-right">Read</Th>
                <Th className="text-right">Saved</Th>
                <Th>Message</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr key={job.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={job.shop.platform} />
                      <span className="text-sm">{job.shop.name}</span>
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-400">{job.type.toLowerCase()}</Td>
                  <Td>
                    <Badge tone={job.status}>{job.status.toLowerCase()}</Badge>
                  </Td>
                  <Td className="text-right">{job.itemsRead}</Td>
                  <Td className="text-right">{job.itemsSaved}</Td>
                  <Td className="max-w-64 truncate text-xs text-slate-400">{job.message ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">{timeAgo(job.startedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No sync jobs yet" />
        )}
      </Card>
    </>
  );
}
