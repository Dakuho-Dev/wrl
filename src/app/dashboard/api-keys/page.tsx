import type { Metadata } from "next";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { KeyRound, Plus, Trash2, Webhook } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { hashPassword, logActivity, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, parseJson, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "API & webhooks" };
export const dynamic = "force-dynamic";

async function createApiKey(formData: FormData) {
  "use server";
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim() || "Untitled key";
  const scope = String(formData.get("scope") ?? "read");

  const secret = `dkh_live_${crypto.randomBytes(18).toString("hex")}`;

  await prisma.apiKey.create({
    data: {
      userId: user.id,
      name,
      prefix: secret.slice(0, 16),
      keyHash: await hashPassword(secret),
      scopes: JSON.stringify(scope === "write" ? ["read", "write"] : ["read"]),
    },
  });

  await logActivity({ userId: user.id, category: "SYSTEM", message: `API key "${name}" created` });
  revalidatePath("/dashboard/api-keys");
}

async function revokeApiKey(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("keyId"));

  const key = await prisma.apiKey.findFirst({ where: { id, userId: user.id } });
  if (!key) return;

  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
  await logActivity({ userId: user.id, category: "SYSTEM", message: `API key "${key.name}" revoked` });
  revalidatePath("/dashboard/api-keys");
}

async function createWebhook(formData: FormData) {
  "use server";
  const user = await requireUser();
  const url = String(formData.get("url") ?? "").trim();
  if (!/^https?:\/\//.test(url)) return;

  const events = formData.getAll("events").map(String);

  await prisma.webhookEndpoint.create({
    data: {
      userId: user.id,
      url,
      events: JSON.stringify(events.length ? events : ["order.created"]),
      secret: `whsec_${crypto.randomBytes(16).toString("hex")}`,
    },
  });

  revalidatePath("/dashboard/api-keys");
}

async function deleteWebhook(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("webhookId"));

  const hook = await prisma.webhookEndpoint.findFirst({ where: { id, userId: user.id } });
  if (!hook) return;

  await prisma.webhookEndpoint.delete({ where: { id: hook.id } });
  revalidatePath("/dashboard/api-keys");
}

const EVENTS = [
  "order.created",
  "order.updated",
  "order.shipped",
  "shipment.delivered",
  "shop.sync_failed",
];

export default async function ApiKeysPage() {
  const user = await requireUser();

  const [keys, webhooks] = await Promise.all([
    prisma.apiKey.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.webhookEndpoint.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="API & webhooks"
        description="Programmatic access to your WrL data. See the docs for endpoints and payloads."
      />

      <Alert tone="info" title="Keep your keys secret">
        A key is shown in full only once, at creation. Store it in your password manager or secret
        store — anyone with the key can read and modify your order data.
      </Alert>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="API keys" description="Scoped credentials for the WrL REST API" />
          {keys.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Key</Th>
                  <Th>Scopes</Th>
                  <Th>Last used</Th>
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className={key.revokedAt ? "opacity-50" : ""}>
                    <Td className="font-medium text-ink">{key.name}</Td>
                    <Td>
                      <code className="rounded bg-paper-2 px-2 py-1 font-mono text-xs text-accent">
                        {key.prefix}…
                      </code>
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        {parseJson<string[]>(key.scopes, []).map((scope) => (
                          <Badge key={scope}>{scope}</Badge>
                        ))}
                      </div>
                    </Td>
                    <Td className="text-xs text-muted">{timeAgo(key.lastUsedAt)}</Td>
                    <Td className="text-xs text-muted">{formatDate(key.createdAt)}</Td>
                    <Td className="text-right">
                      {key.revokedAt ? (
                        <Badge tone="CANCELLED">revoked</Badge>
                      ) : (
                        <form action={revokeApiKey}>
                          <input type="hidden" name="keyId" value={key.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            className="px-2.5 py-1.5 text-xs text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Revoke
                          </Button>
                        </form>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState title="No API keys" description="Create one to start using the REST API." />
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader title="Create API key" />
          <form action={createApiKey} className="space-y-3.5 p-5">
            <Field label="Key name">
              <Input name="name" required placeholder="Production integration" />
            </Field>
            <Field label="Permissions">
              <Select name="scope" defaultValue="read">
                <option value="read">Read only</option>
                <option value="write">Read & write</option>
              </Select>
            </Field>
            <Button type="submit" className="w-full">
              <KeyRound className="h-4 w-4" /> Generate key
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Webhook endpoints" description="HMAC-signed event delivery" />
          {webhooks.length ? (
            <div className="divide-y divide-line">
              {webhooks.map((hook) => (
                <div key={hook.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper-2 text-accent">
                    <Webhook className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm text-ink">{hook.url}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {parseJson<string[]>(hook.events, []).map((event) => (
                        <span
                          key={event}
                          className="rounded-xl bg-paper-2 px-1.5 py-0.5 text-[11px] text-muted"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-2">
                      Secret <code className="text-muted">{hook.secret.slice(0, 14)}…</code> ·{" "}
                      {hook.failCount} failures
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={hook.enabled ? "ACTIVE" : undefined}>
                      {hook.enabled ? "enabled" : "disabled"}
                    </Badge>
                    <form action={deleteWebhook}>
                      <input type="hidden" name="webhookId" value={hook.id} />
                      <Button type="submit" variant="ghost" className="px-2 py-1.5 text-xs text-rose-700">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No endpoints" description="Add a URL to start receiving events." />
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader title="Add endpoint" />
          <form action={createWebhook} className="space-y-3.5 p-5">
            <Field label="Endpoint URL">
              <Input name="url" type="url" required placeholder="https://your-app.com/hooks/dkh" />
            </Field>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                Events
              </p>
              <div className="space-y-1.5">
                {EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm text-ink-2">
                    <input
                      type="checkbox"
                      name="events"
                      value={event}
                      defaultChecked={event === "order.created"}
                      className="h-3.5 w-3.5 rounded border-line bg-paper-2"
                    />
                    <code className="text-xs">{event}</code>
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Add endpoint
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
