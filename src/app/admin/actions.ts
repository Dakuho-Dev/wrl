"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncShop } from "@/lib/sync";

// ------------------------------------------------------------------ Users

export async function setUserStatus(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const status = String(formData.get("status"));

  if (userId === admin.id) return;

  const user = await prisma.user.update({ where: { id: userId }, data: { status } });
  await logActivity({
    userId: admin.id,
    category: "ADMIN",
    level: status === "SUSPENDED" ? "WARN" : "INFO",
    message: `User ${user.email} set to ${status}`,
  });

  revalidatePath("/admin/users");
}

export async function setUserRole(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role"));

  if (userId === admin.id) return;

  const user = await prisma.user.update({ where: { id: userId }, data: { role } });
  await logActivity({
    userId: admin.id,
    category: "ADMIN",
    message: `User ${user.email} role changed to ${role}`,
  });

  revalidatePath("/admin/users");
}

export async function setUserPlan(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const planId = String(formData.get("planId")) || null;

  const user = await prisma.user.update({ where: { id: userId }, data: { planId } });
  await logActivity({
    userId: admin.id,
    category: "ADMIN",
    message: `Plan updated for ${user.email}`,
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));

  if (userId === admin.id) return;

  const user = await prisma.user.delete({ where: { id: userId } });
  await logActivity({
    userId: admin.id,
    category: "ADMIN",
    level: "WARN",
    message: `Deleted account ${user.email} and all associated data`,
  });

  revalidatePath("/admin/users");
}

// ------------------------------------------------------------------ Shops

export async function adminSyncShop(formData: FormData) {
  const admin = await requireAdmin();
  const shopId = String(formData.get("shopId"));

  const result = await syncShop(shopId, "FULL");
  await logActivity({
    userId: admin.id,
    category: "ADMIN",
    level: result.ok ? "INFO" : "ERROR",
    message: result.ok ? `Admin sync completed for shop ${shopId}` : `Admin sync failed: ${result.error}`,
  });

  revalidatePath("/admin/shops");
}

export async function adminDeleteShop(formData: FormData) {
  const admin = await requireAdmin();
  const shopId = String(formData.get("shopId"));

  const shop = await prisma.shop.delete({ where: { id: shopId } });
  await logActivity({
    userId: admin.id,
    category: "ADMIN",
    level: "WARN",
    message: `Deleted shop "${shop.name}" and all its data`,
  });

  revalidatePath("/admin/shops");
}

// ------------------------------------------------------------------ Plans

export async function savePlan(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("planId") ?? "");

  const data = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    priceMonthly: Number(formData.get("priceMonthly") ?? 0),
    priceYearly: Number(formData.get("priceYearly") ?? 0),
    orderLimit: Number(formData.get("orderLimit") ?? 100),
    shopLimit: Number(formData.get("shopLimit") ?? 1),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    isPublic: formData.get("isPublic") === "on",
    features: JSON.stringify(
      String(formData.get("features") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  };

  if (!data.name || !data.slug) return;

  if (id) {
    await prisma.plan.update({ where: { id }, data });
  } else {
    await prisma.plan.create({ data });
  }

  await logActivity({
    userId: admin.id,
    category: "ADMIN",
    message: `Plan "${data.name}" ${id ? "updated" : "created"}`,
  });

  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
}

export async function deletePlan(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("planId"));

  const inUse = await prisma.user.count({ where: { planId: id } });
  if (inUse > 0) return;

  const plan = await prisma.plan.delete({ where: { id } });
  await logActivity({ userId: admin.id, category: "ADMIN", message: `Plan "${plan.name}" deleted` });

  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
}

// ------------------------------------------------------------------ Tickets

export async function replyToTicket(formData: FormData) {
  const admin = await requireAdmin();
  const ticketId = String(formData.get("ticketId"));
  const message = String(formData.get("message") ?? "").trim();
  const status = String(formData.get("status") ?? "PENDING");

  if (message) {
    await prisma.ticketReply.create({
      data: {
        ticketId,
        userId: admin.id,
        authorName: "DKH Support",
        isStaff: true,
        message,
      },
    });
  }

  await prisma.ticket.update({ where: { id: ticketId }, data: { status } });
  await logActivity({ userId: admin.id, category: "ADMIN", message: `Ticket ${ticketId} → ${status}` });

  revalidatePath("/admin/tickets");
}

// ------------------------------------------------------------------ Settings

export async function saveSettings(formData: FormData) {
  const admin = await requireAdmin();

  const entries: Array<[string, string]> = [
    ["site.name", String(formData.get("siteName") ?? "")],
    ["site.tagline", String(formData.get("siteTagline") ?? "")],
    ["site.supportEmail", String(formData.get("supportEmail") ?? "")],
    ["signup.enabled", formData.get("signupEnabled") === "on" ? "true" : "false"],
    ["sync.intervalMinutes", String(formData.get("syncInterval") ?? "15")],
    ["maintenance.enabled", formData.get("maintenance") === "on" ? "true" : "false"],
  ];

  for (const [key, value] of entries) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  await logActivity({ userId: admin.id, category: "ADMIN", message: "Platform settings updated" });
  revalidatePath("/admin/settings");
}
