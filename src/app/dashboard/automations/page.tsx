import type { Metadata } from "next";
import { Play, Plus, Trash2, Workflow } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  StatCard,
  Textarea,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNumber, parseJson, timeAgo } from "@/lib/utils";
import { createAutomation, deleteAutomation, runAutomationNow, toggleAutomation } from "./actions";

export const metadata: Metadata = { title: "Automations" };
export const dynamic = "force-dynamic";

const TRIGGERS = [
  ["ORDER_CREATED", "When an order is imported"],
  ["ORDER_PAID", "When an order is paid"],
  ["ORDER_SHIPPED", "When an order ships"],
  ["SYNC_COMPLETED", "When a sync finishes"],
  ["SCHEDULE", "On a schedule"],
];

/**
 * No buyer-facing messaging actions. Etsy's API Terms forbid using the API to
 * send order, shipping or tracking information to Etsy members — uploading the
 * tracking number to Etsy is the supported path, and Etsy notifies the buyer.
 */
const ACTIONS = [
  ["SET_STATUS", "Change order status"],
  ["SET_PRIORITY", "Set priority"],
  ["ADD_TAG", "Add a tag"],
  ["NOTIFY", "Notify a teammate"],
  ["PUSH_TRACKING", "Upload tracking to Etsy"],
  ["WEBHOOK", "Call a webhook"],
];

const CONDITION_FIELDS = [
  ["", "No condition — always run"],
  ["total", "Order total"],
  ["platform", "Sales channel"],
  ["country", "Destination country"],
  ["sku", "SKU"],
  ["personalization", "Personalization text"],
];

export default async function AutomationsPage() {
  const user = await requireUser();

  const automations = await prisma.automation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  const totalRuns = automations.reduce((sum, item) => sum + item.runCount, 0);
  const active = automations.filter((item) => item.enabled).length;

  return (
    <>
      <PageHeader
        title="Automations"
        description="Rules that act on your orders automatically, so you don't have to."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Rules" value={formatNumber(automations.length)} icon={<Workflow className="h-4 w-4" />} />
        <StatCard label="Active" value={formatNumber(active)} hint="currently enabled" />
        <StatCard label="Total runs" value={formatNumber(totalRuns)} hint="all time" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {automations.length ? (
            automations.map((automation) => {
              const conditions = parseJson<Array<{ field: string; op: string; value: unknown }>>(
                automation.conditions,
                [],
              );
              const actions = parseJson<Array<{ type: string; value?: string }>>(
                automation.actions,
                [],
              );

              return (
                <Card key={automation.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">{automation.name}</h3>
                        <Badge tone={automation.enabled ? "ACTIVE" : undefined}>
                          {automation.enabled ? "enabled" : "paused"}
                        </Badge>
                      </div>
                      {automation.description ? (
                        <p className="mt-1 text-sm text-muted">{automation.description}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <form action={runAutomationNow}>
                        <input type="hidden" name="automationId" value={automation.id} />
                        <Button type="submit" variant="outline" className="px-2.5 py-1.5 text-xs">
                          <Play className="h-3.5 w-3.5" /> Run
                        </Button>
                      </form>
                      <form action={toggleAutomation}>
                        <input type="hidden" name="automationId" value={automation.id} />
                        <Button type="submit" variant="secondary" className="px-2.5 py-1.5 text-xs">
                          {automation.enabled ? "Pause" : "Enable"}
                        </Button>
                      </form>
                      <form action={deleteAutomation}>
                        <input type="hidden" name="automationId" value={automation.id} />
                        <Button type="submit" variant="ghost" className="px-2 py-1.5 text-xs text-rose-700">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                        Trigger
                      </p>
                      <p className="mt-1.5 rounded-none bg-paper-2 px-2.5 py-1.5 text-xs text-accent">
                        {automation.trigger}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                        Conditions
                      </p>
                      <div className="mt-1.5 space-y-1">
                        {conditions.length ? (
                          conditions.map((condition, index) => (
                            <p
                              key={index}
                              className="rounded-none bg-paper-2 px-2.5 py-1.5 text-xs text-ink-2"
                            >
                              {condition.field} {condition.op} {String(condition.value)}
                            </p>
                          ))
                        ) : (
                          <p className="rounded-none bg-paper-2 px-2.5 py-1.5 text-xs text-muted-2">
                            always
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                        Actions
                      </p>
                      <div className="mt-1.5 space-y-1">
                        {actions.map((action, index) => (
                          <p
                            key={index}
                            className="rounded-none bg-paper-2 px-2.5 py-1.5 text-xs text-emerald-700"
                          >
                            {action.type}
                            {action.value ? ` → ${action.value}` : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-muted-2">
                    <span>
                      Ran {formatNumber(automation.runCount)} times · last {timeAgo(automation.lastRunAt)}
                    </span>
                    <div className="flex gap-1.5">
                      {automation.runs.map((run) => (
                        <span
                          key={run.id}
                          title={`${run.status} · ${run.message ?? ""}`}
                          className={`h-4 w-1.5 rounded-full ${
                            run.status === "SUCCESS"
                              ? "bg-emerald-500"
                              : run.status === "SKIPPED"
                                ? "bg-slate-600"
                                : "bg-rose-500"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card>
              <EmptyState
                title="No automations yet"
                description="Create your first rule with the form on the right."
              />
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader title="New automation" description="Trigger → condition → action" />
          <form action={createAutomation} className="space-y-3.5 p-5">
            <Field label="Name">
              <Input name="name" required placeholder="Flag high-value orders" />
            </Field>

            <Field label="Description">
              <Textarea
                name="description"
                className="min-h-20"
                placeholder="What should this rule do?"
              />
            </Field>

            <Field label="Trigger">
              <Select name="trigger" defaultValue="ORDER_CREATED">
                {TRIGGERS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Condition">
              <Select name="conditionField" defaultValue="">
                {CONDITION_FIELDS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Operator">
                <Select name="conditionOp" defaultValue="equals">
                  {["equals", "not_equals", "gt", "lt", "contains", "is_empty"].map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Value">
                <Input name="conditionValue" placeholder="150" />
              </Field>
            </div>

            <Field label="Action">
              <Select name="actionType" defaultValue="SET_STATUS">
                {ACTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Action value">
              <Input name="actionValue" placeholder="PROCESSING" />
            </Field>

            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Create automation
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
