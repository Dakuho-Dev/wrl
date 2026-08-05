import type { Metadata } from "next";

import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  Select,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity log · Admin" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const level = params.level ?? "";
  const category = params.category ?? "";
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? 1));

  const where = {
    ...(level ? { level } : {}),
    ...(category ? { category } : {}),
    ...(query
      ? { OR: [{ message: { contains: query, mode: "insensitive" as const } }, { user: { email: { contains: query, mode: "insensitive" as const } } }] }
      : {}),
  };

  const [logs, total, errors, syncJobs] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.count({ where: { level: "ERROR" } }),
    prisma.syncJob.findMany({
      orderBy: { startedAt: "desc" },
      take: 12,
      include: { shop: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (nextPage: number) => {
    const qs = new URLSearchParams();
    if (level) qs.set("level", level);
    if (category) qs.set("category", category);
    if (query) qs.set("q", query);
    if (nextPage > 1) qs.set("page", String(nextPage));
    const value = qs.toString();
    return `/admin/logs${value ? `?${value}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Activity log" description="Immutable audit trail of everything on the platform." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Matching entries" value={formatNumber(total)} />
        <StatCard label="Errors (all time)" value={formatNumber(errors)} />
        <StatCard label="Recent sync jobs" value={formatNumber(syncJobs.length)} />
      </div>

      <Card className="my-4 p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_150px_170px_auto]" action="/admin/logs">
          <Input name="q" defaultValue={query} placeholder="Search message or user email…" />
          <Select name="level" defaultValue={level}>
            <option value="">Any level</option>
            {["INFO", "WARN", "ERROR"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Select name="category" defaultValue={category}>
            <option value="">Any category</option>
            {["AUTH", "SYNC", "ORDER", "AUTOMATION", "ADMIN", "SYSTEM"].map((value) => (
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Events" description={`Page ${page} of ${totalPages}`} />
          {logs.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Level</Th>
                  <Th>Category</Th>
                  <Th>Message</Th>
                  <Th>User</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-ink-800/30">
                    <Td className="whitespace-nowrap text-xs text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </Td>
                    <Td>
                      <span
                        className={`text-xs font-semibold ${
                          log.level === "ERROR"
                            ? "text-rose-400"
                            : log.level === "WARN"
                              ? "text-amber-400"
                              : "text-slate-500"
                        }`}
                      >
                        {log.level}
                      </span>
                    </Td>
                    <Td>
                      <Badge>{log.category.toLowerCase()}</Badge>
                    </Td>
                    <Td className="text-sm text-slate-300">{log.message}</Td>
                    <Td className="text-xs text-slate-500">{log.user?.email ?? "system"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState title="No log entries" />
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-ink-600/40 px-5 py-3">
              <p className="text-xs text-slate-500">
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

        <Card className="h-fit">
          <CardHeader title="Recent sync jobs" description="Marketplace API runs" />
          <div className="divide-y divide-ink-700/40">
            {syncJobs.map((job) => (
              <div key={job.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-slate-200">{job.shop.name}</p>
                  <Badge tone={job.status}>{job.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {job.type.toLowerCase()} · {job.itemsSaved} saved · {formatDateTime(job.startedAt)}
                </p>
                {job.message && job.status === "FAILED" ? (
                  <p className="mt-1 text-xs text-rose-400">{job.message}</p>
                ) : null}
              </div>
            ))}
            {syncJobs.length === 0 ? <EmptyState title="No sync jobs yet" /> : null}
          </div>
        </Card>
      </div>
    </>
  );
}
