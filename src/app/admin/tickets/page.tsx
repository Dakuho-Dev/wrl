import type { Metadata } from "next";

import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
  StatCard,
  Textarea,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatNumber, timeAgo } from "@/lib/utils";
import { replyToTicket } from "../actions";

export const metadata: Metadata = { title: "Tickets · Admin" };
export const dynamic = "force-dynamic";

const PRIORITY_TONE: Record<string, string> = {
  HIGH: "text-rose-700",
  URGENT: "text-rose-700",
  NORMAL: "text-muted",
  LOW: "text-muted-2",
};

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = params.status ?? "";

  const [tickets, open, pending, resolved] = await Promise.all([
    prisma.ticket.findMany({
      where: status ? { status } : {},
      include: { replies: { orderBy: { createdAt: "asc" } }, user: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.ticket.count({ where: { status: "PENDING" } }),
    prisma.ticket.count({ where: { status: "RESOLVED" } }),
  ]);

  return (
    <>
      <PageHeader title="Support tickets" description="Messages from the contact form and in-app support.">
        <form action="/admin/tickets">
          <Select name="status" defaultValue={status} className="w-44 py-2 text-xs">
            <option value="">All tickets</option>
            {["OPEN", "PENDING", "RESOLVED", "CLOSED"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </form>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open" value={formatNumber(open)} />
        <StatCard label="Pending" value={formatNumber(pending)} />
        <StatCard label="Resolved" value={formatNumber(resolved)} />
      </div>

      <div className="mt-4 space-y-4">
        {tickets.length ? (
          tickets.map((ticket) => (
            <Card key={ticket.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{ticket.subject}</h3>
                    <Badge tone={ticket.status}>{ticket.status.toLowerCase()}</Badge>
                    <Badge>{ticket.category.toLowerCase()}</Badge>
                    <span className={`text-xs font-medium ${PRIORITY_TONE[ticket.priority] ?? ""}`}>
                      {ticket.priority.toLowerCase()} priority
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-2">
                    {ticket.name} · {ticket.email}
                    {ticket.user ? " · registered account" : " · guest"} · {timeAgo(ticket.createdAt)}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="rounded-xl border border-line bg-paper-2 p-4">
                  <p className="text-sm leading-relaxed text-ink-2">{ticket.message}</p>
                  <p className="mt-2 text-xs text-muted-2">{formatDateTime(ticket.createdAt)}</p>
                </div>

                {ticket.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`rounded-xl border p-4 ${
                      reply.isStaff
                        ? "ml-6 border-accent bg-accent-soft"
                        : "border-line bg-paper-2"
                    }`}
                  >
                    <p className="text-xs font-medium text-accent">{reply.authorName}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{reply.message}</p>
                    <p className="mt-2 text-xs text-muted-2">{formatDateTime(reply.createdAt)}</p>
                  </div>
                ))}

                <form action={replyToTicket} className="space-y-3 border-t border-line pt-4">
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <Textarea name="message" placeholder="Write a reply…" className="min-h-24" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Select name="status" defaultValue={ticket.status} className="w-40 py-2 text-xs">
                      {["OPEN", "PENDING", "RESOLVED", "CLOSED"].map((value) => (
                        <option key={value} value={value}>
                          Set {value.toLowerCase()}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit">Send reply</Button>
                  </div>
                </form>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <EmptyState title="No tickets" description="Nothing needs your attention right now." />
          </Card>
        )}
      </div>
    </>
  );
}
