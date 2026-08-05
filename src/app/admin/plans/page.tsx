import type { Metadata } from "next";
import { Plus, Trash2 } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, parseJson } from "@/lib/utils";
import { deletePlan, savePlan } from "../actions";

export const metadata: Metadata = { title: "Plans · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireAdmin();

  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <>
      <PageHeader
        title="Plans & pricing"
        description="These plans drive the public pricing page and each account's quotas."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-600/40 px-5 py-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white">{plan.name}</h3>
                  <Badge tone={plan.isPublic ? "ACTIVE" : undefined}>
                    {plan.isPublic ? "public" : "hidden"}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {formatNumber(plan._count.users)} user{plan._count.users === 1 ? "" : "s"}
                  </span>
                </div>
                <form action={deletePlan}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    className="px-2 py-1.5 text-xs text-rose-300"
                    disabled={plan._count.users > 0}
                    title={plan._count.users > 0 ? "Plan is in use" : "Delete plan"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>

              <form action={savePlan} className="grid gap-3 p-5 sm:grid-cols-2">
                <input type="hidden" name="planId" value={plan.id} />
                <Field label="Name">
                  <Input name="name" defaultValue={plan.name} required />
                </Field>
                <Field label="Slug">
                  <Input name="slug" defaultValue={plan.slug} required />
                </Field>
                <Field label="Monthly price (USD)">
                  <Input name="priceMonthly" type="number" step="1" defaultValue={plan.priceMonthly} />
                </Field>
                <Field label="Yearly price (USD)">
                  <Input name="priceYearly" type="number" step="1" defaultValue={plan.priceYearly} />
                </Field>
                <Field label="Orders / month">
                  <Input name="orderLimit" type="number" defaultValue={plan.orderLimit} />
                </Field>
                <Field label="Shop limit">
                  <Input name="shopLimit" type="number" defaultValue={plan.shopLimit} />
                </Field>
                <Field label="Sort order">
                  <Input name="sortOrder" type="number" defaultValue={plan.sortOrder} />
                </Field>
                <label className="flex items-end gap-2 pb-2.5 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    name="isPublic"
                    defaultChecked={plan.isPublic}
                    className="h-4 w-4 rounded border-ink-600 bg-ink-900"
                  />
                  Show on public pricing page
                </label>
                <div className="sm:col-span-2">
                  <Field label="Features (one per line)">
                    <Textarea
                      name="features"
                      className="min-h-32"
                      defaultValue={parseJson<string[]>(plan.features, []).join("\n")}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit">Save changes</Button>
                </div>
              </form>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <CardHeader title="Create plan" />
          <form action={savePlan} className="space-y-3 p-5">
            <Field label="Name">
              <Input name="name" required placeholder="Enterprise" />
            </Field>
            <Field label="Slug">
              <Input name="slug" required placeholder="enterprise" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly">
                <Input name="priceMonthly" type="number" defaultValue={0} />
              </Field>
              <Field label="Yearly">
                <Input name="priceYearly" type="number" defaultValue={0} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Orders/mo">
                <Input name="orderLimit" type="number" defaultValue={100} />
              </Field>
              <Field label="Shops">
                <Input name="shopLimit" type="number" defaultValue={1} />
              </Field>
            </div>
            <Field label="Sort order">
              <Input name="sortOrder" type="number" defaultValue={plans.length + 1} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="isPublic"
                defaultChecked
                className="h-4 w-4 rounded border-ink-600 bg-ink-900"
              />
              Public
            </label>
            <Field label="Features (one per line)">
              <Textarea name="features" placeholder={"Unlimited shops\nDedicated support"} />
            </Field>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Create plan
            </Button>
          </form>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <p className="text-sm text-slate-400">
          Public plans appear on <span className="text-brand-300">/pricing</span> immediately after
          saving. Quotas ({formatMoney(0)} plans included) are enforced when a seller connects a shop
          or when the monthly order counter is checked.
        </p>
      </Card>
    </>
  );
}
