import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { Check, CreditCard, Download } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { logActivity, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, formatNumber, parseJson } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

async function changePlan(formData: FormData) {
  "use server";
  const user = await requireUser();
  const planId = String(formData.get("planId"));

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return;

  await prisma.user.update({ where: { id: user.id }, data: { planId: plan.id } });
  await logActivity({
    userId: user.id,
    category: "SYSTEM",
    message: `Plan changed to ${plan.name}`,
  });

  revalidatePath("/dashboard/billing");
}

export default async function BillingPage() {
  const user = await requireUser();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [plans, ordersThisMonth, shopCount, revenue] = await Promise.all([
    prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } }),
    prisma.order.count({ where: { shop: { userId: user.id }, createdAt: { gte: monthStart } } }),
    prisma.shop.count({ where: { userId: user.id } }),
    prisma.order.aggregate({
      where: { shop: { userId: user.id }, placedAt: { gte: monthStart } },
      _sum: { total: true },
    }),
  ]);

  const current = user.plan;
  const orderLimit = current?.orderLimit ?? 100;
  const usage = Math.min(100, Math.round((ordersThisMonth / orderLimit) * 100));

  // Illustrative invoice history for the current plan.
  const invoices = current && current.priceMonthly > 0
    ? Array.from({ length: 4 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - index);
        return {
          id: `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`,
          date,
          amount: current.priceMonthly,
          status: index === 0 ? "OPEN" : "PAID",
        };
      })
    : [];

  return (
    <>
      <PageHeader
        title="Billing"
        description="Your plan, usage and invoices."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current plan"
          value={current?.name ?? "Starter"}
          hint={current ? `${formatMoney(current.priceMonthly)}/month` : "Free"}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          label="Orders this month"
          value={`${formatNumber(ordersThisMonth)} / ${formatNumber(orderLimit)}`}
          hint={`${usage}% of quota used`}
        />
        <StatCard
          label="Shops"
          value={`${shopCount} / ${current?.shopLimit ?? 1}`}
          hint="connected channels"
        />
        <StatCard label="Revenue this month" value={formatMoney(revenue._sum.total ?? 0)} />
      </div>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Monthly order quota</span>
          <span className="text-slate-400">
            {formatNumber(ordersThisMonth)} of {formatNumber(orderLimit)}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-800">
          <div
            className={`h-full rounded-full ${usage > 85 ? "bg-amber-500" : "bg-gradient-to-r from-brand-600 to-brand-400"}`}
            style={{ width: `${Math.max(usage, 2)}%` }}
          />
        </div>
        {usage > 85 ? (
          <p className="mt-2 text-xs text-amber-300">
            You are close to your monthly limit. Syncing pauses once the quota is reached — consider
            upgrading.
          </p>
        ) : null}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === current?.id;
          const features = parseJson<string[]>(plan.features, []);
          return (
            <Card
              key={plan.id}
              className={`flex flex-col p-6 ${isCurrent ? "border-brand-500/60 bg-brand-900/10" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{plan.name}</h3>
                {isCurrent ? <Badge tone="ACTIVE">current</Badge> : null}
              </div>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatMoney(plan.priceMonthly)}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <form action={changePlan} className="mt-6">
                <input type="hidden" name="planId" value={plan.id} />
                <Button
                  type="submit"
                  variant={isCurrent ? "secondary" : "primary"}
                  className="w-full"
                  disabled={isCurrent}
                >
                  {isCurrent ? "Current plan" : `Switch to ${plan.name}`}
                </Button>
              </form>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardHeader title="Invoices" description="Downloadable billing history" />
        {invoices.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Date</Th>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <Td className="font-mono text-xs text-white">{invoice.id}</Td>
                  <Td className="text-xs text-slate-400">{formatDate(invoice.date)}</Td>
                  <Td className="text-sm">{current?.name}</Td>
                  <Td>
                    <Badge tone={invoice.status === "PAID" ? "PAID" : undefined}>
                      {invoice.status.toLowerCase()}
                    </Badge>
                  </Td>
                  <Td className="text-right font-medium">{formatMoney(invoice.amount)}</Td>
                  <Td className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            You are on the free Starter plan — no invoices yet.
          </div>
        )}
      </Card>
    </>
  );
}
