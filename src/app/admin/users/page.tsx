import type { Metadata } from "next";
import { Search, Trash2 } from "lucide-react";

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
import { formatDate, formatNumber, initials, timeAgo } from "@/lib/utils";
import { deleteUser, setUserPlan, setUserRole, setUserStatus } from "../actions";

export const metadata: Metadata = { title: "Users · Admin" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const role = params.role ?? "";
  const page = Math.max(1, Number(params.page ?? 1));

  const where = {
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
    ...(query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
            { company: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total, plans, active, suspended] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { plan: true, _count: { select: { shops: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefFor = (overrides: Record<string, string>) => {
    const next = new URLSearchParams({ q: query, status, role, page: String(page), ...overrides });
    for (const [key, value] of Array.from(next.entries())) {
      if (!value || value === "1") next.delete(key);
    }
    const qs = next.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Users" description={`${formatNumber(total)} accounts match your filters.`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value={formatNumber(total)} />
        <StatCard label="Active" value={formatNumber(active)} />
        <StatCard label="Suspended" value={formatNumber(suspended)} />
      </div>

      <Card className="my-4 p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_160px_160px_auto]" action="/admin/users">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input name="q" defaultValue={query} placeholder="Search name, email or company…" className="pl-9" />
          </div>
          <Select name="status" defaultValue={status}>
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING">Pending</option>
          </Select>
          <Select name="role" defaultValue={role}>
            <option value="">Any role</option>
            <option value="USER">Seller</option>
            <option value="ADMIN">Admin</option>
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Accounts" description="Change plan, role or status inline" />
        {users.length ? (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Plan</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th className="text-right">Shops</Th>
                <Th>Last login</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="transition hover:bg-ink-800/30">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600/80 text-xs font-semibold text-white">
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                        {user.company ? (
                          <p className="truncate text-xs text-slate-600">{user.company}</p>
                        ) : null}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <form action={setUserPlan} className="flex items-center gap-1">
                      <input type="hidden" name="userId" value={user.id} />
                      <Select
                        name="planId"
                        defaultValue={user.planId ?? ""}
                        className="w-28 px-2 py-1 text-xs"
                      >
                        <option value="">None</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                        ✓
                      </Button>
                    </form>
                  </Td>
                  <Td>
                    <form action={setUserRole} className="flex items-center gap-1">
                      <input type="hidden" name="userId" value={user.id} />
                      <Select
                        name="role"
                        defaultValue={user.role}
                        className="w-24 px-2 py-1 text-xs"
                        disabled={user.id === admin.id}
                      >
                        <option value="USER">Seller</option>
                        <option value="ADMIN">Admin</option>
                      </Select>
                      <Button
                        type="submit"
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        disabled={user.id === admin.id}
                      >
                        ✓
                      </Button>
                    </form>
                  </Td>
                  <Td>
                    <Badge tone={user.status}>{user.status.toLowerCase()}</Badge>
                  </Td>
                  <Td className="text-right">{user._count.shops}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    {timeAgo(user.lastLoginAt)}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    {formatDate(user.createdAt)}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      <form action={setUserStatus}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"}
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          className="px-2 py-1 text-xs"
                          disabled={user.id === admin.id}
                        >
                          {user.status === "SUSPENDED" ? "Restore" : "Suspend"}
                        </Button>
                      </form>
                      <form action={deleteUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          className="px-2 py-1 text-xs text-rose-300"
                          disabled={user.id === admin.id}
                        >
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
          <EmptyState title="No users found" description="Try a different search." />
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-ink-600/40 px-5 py-3">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <ButtonLink href={hrefFor({ page: String(page - 1) })} variant="outline" className="px-3 py-1.5 text-xs">
                  ← Previous
                </ButtonLink>
              ) : null}
              {page < totalPages ? (
                <ButtonLink href={hrefFor({ page: String(page + 1) })} variant="outline" className="px-3 py-1.5 text-xs">
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
