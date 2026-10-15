import "server-only";

import { prisma } from "@/lib/db";

/**
 * A lease stored in the Setting table so only one sync run works at a time.
 *
 * Needed because a run can be started from several places at once — the Vercel
 * cron, the CMS server's hourly trigger, someone's curl — and the proxy in front
 * of wearelucky.io.vn retries a request it has given up waiting for, which
 * produced two runs importing the same shop four seconds apart.
 *
 * Postgres advisory locks are not an option: Neon's pooled endpoint goes through
 * PgBouncer, where a session lock is not tied to our request.
 *
 * The lease expires on its own, so a run killed by the platform timeout (which
 * never reaches its release) cannot block the next one for long.
 */

const LOCK_KEY = "cron.sync.lock";

export async function acquireLock(ttlMs: number): Promise<string | null> {
  const lease = new Date(Date.now() + ttlMs).toISOString();

  try {
    await prisma.setting.create({ data: { key: LOCK_KEY, value: lease } });
    return lease;
  } catch {
    // Row exists: someone holds it, or held it and died.
  }

  const current = await prisma.setting.findUnique({ where: { key: LOCK_KEY } });
  if (!current) return null; // released between our two reads — let the next run take it
  if (new Date(current.value).getTime() > Date.now()) return null; // still held

  // Expired: take it over with a compare-and-set on the old value, so two
  // callers racing for the same expired lease cannot both win.
  const taken = await prisma.setting.updateMany({
    where: { key: LOCK_KEY, value: current.value },
    data: { value: lease },
  });
  return taken.count === 1 ? lease : null;
}

export async function releaseLock(lease: string) {
  // Only delete our own lease — never one a later run has since taken over.
  await prisma.setting.deleteMany({ where: { key: LOCK_KEY, value: lease } });
}

const LAST_RUN_KEY = "cron.sync.lastRun";

export async function saveLastRun(summary: unknown) {
  const value = JSON.stringify({ finishedAt: new Date().toISOString(), ...(summary as object) });
  await prisma.setting.upsert({
    where: { key: LAST_RUN_KEY },
    create: { key: LAST_RUN_KEY, value },
    update: { value },
  });
}

export async function readLastRun(): Promise<unknown> {
  const row = await prisma.setting.findUnique({ where: { key: LAST_RUN_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}
