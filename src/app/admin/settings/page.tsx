import type { Metadata } from "next";

import { Button, Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/site-config";
import { formatDateTime } from "@/lib/utils";
import { saveSettings } from "../actions";

export const metadata: Metadata = { title: "Settings · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const rows = await prisma.setting.findMany({ orderBy: { key: "asc" } });
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return (
    <>
      <PageHeader title="Platform settings" description="Global configuration for the DKH instance." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="General" description="Branding, signups and sync cadence" />
          <form action={saveSettings} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Site name">
              <Input name="siteName" defaultValue={settings["site.name"] ?? "DKH"} />
            </Field>
            <Field label="Support email">
              <Input
                name="supportEmail"
                type="email"
                defaultValue={settings["site.supportEmail"] ?? siteConfig.supportEmail}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Tagline">
                <Input
                  name="siteTagline"
                  defaultValue={settings["site.tagline"] ?? "Automate your entire order lifecycle"}
                />
              </Field>
            </div>
            <Field label="Sync interval (minutes)">
              <Select name="syncInterval" defaultValue={settings["sync.intervalMinutes"] ?? "15"}>
                {["5", "15", "30", "60", "180"].map((value) => (
                  <option key={value} value={value}>
                    Every {value} minutes
                  </option>
                ))}
              </Select>
            </Field>
            <div className="space-y-3 pt-6">
              <label className="flex items-center gap-2.5 text-sm text-ink-2">
                <input
                  type="checkbox"
                  name="signupEnabled"
                  defaultChecked={settings["signup.enabled"] !== "false"}
                  className="h-4 w-4 rounded border-line bg-paper-2"
                />
                Allow new sign-ups
              </label>
              <label className="flex items-center gap-2.5 text-sm text-ink-2">
                <input
                  type="checkbox"
                  name="maintenance"
                  defaultChecked={settings["maintenance.enabled"] === "true"}
                  className="h-4 w-4 rounded border-line bg-paper-2"
                />
                Maintenance mode
              </label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Save settings</Button>
            </div>
          </form>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Stored values" description="Raw settings table" />
          <div className="divide-y divide-line">
            {rows.map((row) => (
              <div key={row.key} className="px-5 py-3">
                <p className="font-mono text-xs text-accent">{row.key}</p>
                <p className="mt-0.5 text-sm text-ink-2">{row.value}</p>
                <p className="text-xs text-muted-2">{formatDateTime(row.updatedAt)}</p>
              </div>
            ))}
            {rows.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-2">No settings saved yet.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}
