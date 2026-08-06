import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Bell, Check } from "lucide-react";

import { Button, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

async function markAllRead() {
  "use server";
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard/notifications");
}

const TONE: Record<string, string> = {
  SUCCESS: "border-emerald-500/30 bg-emerald-500/5",
  WARNING: "border-amber-500/30 bg-amber-500/5",
  ERROR: "border-rose-500/30 bg-rose-500/5",
  INFO: "border-line bg-surface",
};

export default async function NotificationsPage() {
  const user = await requireUser();

  const [notifications, logs] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <>
      <PageHeader title="Notifications" description={`${unread} unread`}>
        <form action={markAllRead}>
          <Button type="submit" variant="outline">
            <Check className="h-4 w-4" /> Mark all read
          </Button>
        </form>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {notifications.length ? (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`flex items-start gap-4 p-4 ${TONE[notification.type] ?? TONE.INFO} ${
                  notification.read ? "opacity-60" : ""
                }`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-none bg-paper-2 text-accent">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink">{notification.title}</p>
                    {!notification.read ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">{notification.body}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-2">
                    <span>{timeAgo(notification.createdAt)}</span>
                    {notification.link ? (
                      <Link href={notification.link} className="text-accent hover:text-accent">
                        Open →
                      </Link>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <EmptyState title="Nothing here yet" description="Alerts about your shops will appear here." />
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader title="Recent account activity" description="Your last 20 events" />
          <div className="divide-y divide-line">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink-2">{log.message}</p>
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase ${
                      log.level === "ERROR"
                        ? "text-rose-700"
                        : log.level === "WARN"
                          ? "text-amber-700"
                          : "text-muted-2"
                    }`}
                  >
                    {log.level}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-2">
                  {log.category.toLowerCase()} · {timeAgo(log.createdAt)}
                </p>
              </div>
            ))}
            {logs.length === 0 ? <EmptyState title="No activity yet" /> : null}
          </div>
        </Card>
      </div>
    </>
  );
}
