import type { Metadata } from "next";

import {
  Badge,
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
import { formatNumber, parseJson, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Automations · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAutomationsPage() {
  await requireAdmin();

  const [automations, runs, failed] = await Promise.all([
    prisma.automation.findMany({
      include: { user: true, _count: { select: { runs: true } } },
      orderBy: { runCount: "desc" },
      take: 100,
    }),
    prisma.automationRun.count(),
    prisma.automationRun.count({ where: { status: "FAILED" } }),
  ]);

  const enabled = automations.filter((item) => item.enabled).length;

  return (
    <>
      <PageHeader
        title="Automations"
        description="Every rule configured by every seller, ranked by usage."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rules" value={formatNumber(automations.length)} />
        <StatCard label="Enabled" value={formatNumber(enabled)} />
        <StatCard label="Total runs" value={formatNumber(runs)} />
        <StatCard label="Failed runs" value={formatNumber(failed)} />
      </div>

      <Card className="mt-4">
        <CardHeader title="All automations" />
        {automations.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Rule</Th>
                <Th>Owner</Th>
                <Th>Trigger</Th>
                <Th>Actions</Th>
                <Th>State</Th>
                <Th className="text-right">Runs</Th>
                <Th>Last run</Th>
              </tr>
            </thead>
            <tbody>
              {automations.map((automation) => (
                <tr key={automation.id} className="transition hover:bg-ink-800/30">
                  <Td>
                    <p className="font-medium text-white">{automation.name}</p>
                    {automation.description ? (
                      <p className="max-w-72 truncate text-xs text-slate-500">
                        {automation.description}
                      </p>
                    ) : null}
                  </Td>
                  <Td className="text-xs text-slate-400">{automation.user.email}</Td>
                  <Td>
                    <code className="rounded bg-ink-900 px-1.5 py-0.5 text-xs text-brand-300">
                      {automation.trigger}
                    </code>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {parseJson<Array<{ type: string }>>(automation.actions, []).map(
                        (action, index) => (
                          <span
                            key={index}
                            className="rounded-md bg-ink-800 px-1.5 py-0.5 text-[11px] text-emerald-300"
                          >
                            {action.type}
                          </span>
                        ),
                      )}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={automation.enabled ? "ACTIVE" : undefined}>
                      {automation.enabled ? "enabled" : "paused"}
                    </Badge>
                  </Td>
                  <Td className="text-right">{formatNumber(automation.runCount)}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    {timeAgo(automation.lastRunAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No automations configured" />
        )}
      </Card>
    </>
  );
}
