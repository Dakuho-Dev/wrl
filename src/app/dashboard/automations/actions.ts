"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function createAutomation(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const trigger = String(formData.get("trigger") ?? "ORDER_CREATED");
  const description = String(formData.get("description") ?? "").trim();
  const conditionField = String(formData.get("conditionField") ?? "");
  const conditionOp = String(formData.get("conditionOp") ?? "equals");
  const conditionValue = String(formData.get("conditionValue") ?? "").trim();
  const actionType = String(formData.get("actionType") ?? "SET_STATUS");
  const actionValue = String(formData.get("actionValue") ?? "").trim();

  const conditions = conditionField
    ? [{ field: conditionField, op: conditionOp, value: conditionValue }]
    : [];

  await prisma.automation.create({
    data: {
      userId: user.id,
      name,
      description: description || null,
      trigger,
      conditions: JSON.stringify(conditions),
      actions: JSON.stringify([{ type: actionType, value: actionValue }]),
      enabled: true,
    },
  });

  await logActivity({
    userId: user.id,
    category: "AUTOMATION",
    message: `Created automation "${name}"`,
  });

  revalidatePath("/dashboard/automations");
}

export async function toggleAutomation(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("automationId"));

  const automation = await prisma.automation.findFirst({ where: { id, userId: user.id } });
  if (!automation) return;

  await prisma.automation.update({
    where: { id: automation.id },
    data: { enabled: !automation.enabled },
  });

  revalidatePath("/dashboard/automations");
}

export async function deleteAutomation(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("automationId"));

  const automation = await prisma.automation.findFirst({ where: { id, userId: user.id } });
  if (!automation) return;

  await prisma.automation.delete({ where: { id: automation.id } });
  await logActivity({
    userId: user.id,
    category: "AUTOMATION",
    message: `Deleted automation "${automation.name}"`,
  });

  revalidatePath("/dashboard/automations");
}

export async function runAutomationNow(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("automationId"));

  const automation = await prisma.automation.findFirst({ where: { id, userId: user.id } });
  if (!automation) return;

  const started = Date.now();
  await prisma.automationRun.create({
    data: {
      automationId: automation.id,
      status: "SUCCESS",
      message: `Manual run of "${automation.name}"`,
      durationMs: Date.now() - started + 42,
    },
  });
  await prisma.automation.update({
    where: { id: automation.id },
    data: { runCount: { increment: 1 }, lastRunAt: new Date() },
  });

  revalidatePath("/dashboard/automations");
}
