import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Download, ShieldAlert } from "lucide-react";

import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import {
  destroySession,
  hashPassword,
  logActivity,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

async function updateProfile(formData: FormData) {
  "use server";
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: String(formData.get("name") ?? user.name).trim() || user.name,
      company: String(formData.get("company") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      country: String(formData.get("country") ?? "").trim() || null,
    },
  });

  await logActivity({ userId: user.id, category: "AUTH", message: "Profile updated" });
  revalidatePath("/dashboard/settings");
}

async function changePassword(formData: FormData) {
  "use server";
  const user = await requireUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) return;
  if (!(await verifyPassword(currentPassword, user.passwordHash))) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  await logActivity({ userId: user.id, category: "AUTH", message: "Password changed" });
  revalidatePath("/dashboard/settings");
}

async function deleteAccount(formData: FormData) {
  "use server";
  const user = await requireUser();

  if (String(formData.get("confirm")) !== "DELETE") return;

  await prisma.user.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/?deleted=1");
}

export default async function SettingsPage() {
  const user = await requireUser();

  const [shopCount, orderCount, logs] = await Promise.all([
    prisma.shop.count({ where: { userId: user.id } }),
    prisma.order.count({ where: { shop: { userId: user.id } } }),
    prisma.activityLog.findMany({
      where: { userId: user.id, category: "AUTH" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <>
      <PageHeader title="Settings" description="Your profile, security and data controls." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" description="How you appear inside DKH" />
          <form action={updateProfile} className="space-y-3.5 p-5">
            <Field label="Full name">
              <Input name="name" defaultValue={user.name} required />
            </Field>
            <Field label="Email" hint="Contact support to change your sign-in email.">
              <Input defaultValue={user.email} disabled />
            </Field>
            <Field label="Shop or company">
              <Input name="company" defaultValue={user.company ?? ""} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <Input name="phone" defaultValue={user.phone ?? ""} placeholder="+84 …" />
              </Field>
              <Field label="Country">
                <Select name="country" defaultValue={user.country ?? ""}>
                  <option value="">Select…</option>
                  {["US", "GB", "CA", "AU", "DE", "FR", "VN", "SG", "JP"].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Password" description="Use at least 8 characters" />
            <form action={changePassword} className="space-y-3.5 p-5">
              <Field label="Current password">
                <Input name="currentPassword" type="password" required autoComplete="current-password" />
              </Field>
              <Field label="New password">
                <Input
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </Field>
              <Button type="submit" variant="secondary">
                Update password
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Recent sign-in activity" />
            <div className="divide-y divide-line">
              {logs.map((log) => (
                <div key={log.id} className="px-5 py-3">
                  <p className="text-sm text-ink-2">{log.message}</p>
                  <p className="text-xs text-muted-2">
                    {formatDateTime(log.createdAt)} · {log.ip ?? "unknown ip"}
                  </p>
                </div>
              ))}
              {logs.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-2">No activity recorded yet.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Data & privacy"
          description="Export or permanently delete everything DKH holds about you"
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-line bg-paper-2 p-4">
            <div>
              <p className="text-sm font-medium text-ink">Export your data</p>
              <p className="text-xs text-muted-2">
                {orderCount} orders across {shopCount} shop{shopCount === 1 ? "" : "s"}, as CSV.
              </p>
            </div>
            <ButtonLink href="/api/export/orders" variant="outline">
              <Download className="h-4 w-4" /> Download CSV
            </ButtonLink>
          </div>

          <Alert tone="danger" title="Delete account">
            This permanently removes your account, every connected shop, all imported orders,
            shipments and buyer data. Marketplace access tokens are revoked immediately. This cannot
            be undone.
          </Alert>

          <form action={deleteAccount} className="flex flex-wrap items-end gap-3">
            <Field label="Type DELETE to confirm">
              <Input name="confirm" placeholder="DELETE" className="w-52" />
            </Field>
            <Button type="submit" variant="danger">
              <ShieldAlert className="h-4 w-4" /> Delete my account
            </Button>
          </form>
        </div>
      </Card>
    </>
  );
}
