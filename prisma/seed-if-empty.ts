/**
 * Deploy-time database bootstrap.
 *
 * 1. On an empty database, run the demo seed.
 * 2. On a database that already has users, leave the data alone but keep the two
 *    demo accounts' passwords in sync with DEMO_*_PASSWORD, so rotating the env
 *    var is enough to change the published credentials.
 *
 * Never throws — a demo-data problem must not fail a deployment.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function clean(value: string | undefined, fallback: string) {
  return (value ?? "").replace(/^﻿/, "").trim() || fallback;
}

/** Mail domain, not the site subdomain — addresses stay on the registered apex. */
const MAIL_DOMAIN = clean(process.env.MAIL_DOMAIN, "dkh.io.vn");

const DEMO_ACCOUNTS = [
  {
    email: clean(process.env.DEMO_ADMIN_EMAIL, `admin@${MAIL_DOMAIN}`),
    password: clean(process.env.DEMO_ADMIN_PASSWORD, "Admin123!"),
  },
  {
    email: clean(process.env.DEMO_SELLER_EMAIL, `seller@${MAIL_DOMAIN}`),
    password: clean(process.env.DEMO_SELLER_PASSWORD, "Password123!"),
  },
];

/**
 * A BOM-prefixed env var once leaked into seeded email addresses, which made the
 * accounts impossible to sign in to. Strip it wherever it landed.
 */
async function repairEmails(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ where: { email: { startsWith: "﻿" } } });

  for (const user of users) {
    const email = user.email.replace(/^﻿/, "").trim();
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash) continue;

    await prisma.user.update({ where: { id: user.id }, data: { email } });
    console.log(`· bootstrap: repaired email ${JSON.stringify(user.email)} -> ${email}`);
  }
}

/**
 * The site moved from the dkh.io placeholder to the registered dkh.io.vn. Rename
 * the seeded accounts in place rather than reseeding, so the demo orders survive.
 */
async function migrateSeedDomain(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ where: { email: { endsWith: "@dkh.io" } } });

  for (const user of users) {
    const email = user.email.replace(/@dkh\.io$/, `@${MAIL_DOMAIN}`);
    if (await prisma.user.findUnique({ where: { email } })) continue;

    await prisma.user.update({ where: { id: user.id }, data: { email } });
    console.log(`· bootstrap: moved ${user.email} -> ${email}`);
  }

  const setting = await prisma.setting.findUnique({ where: { key: "site.supportEmail" } });
  if (setting?.value.endsWith("@dkh.io")) {
    const value = setting.value.replace(/@dkh\.io$/, `@${MAIL_DOMAIN}`);
    await prisma.setting.update({ where: { key: "site.supportEmail" }, data: { value } });
    console.log(`· bootstrap: support address now ${value}`);
  }
}

async function syncDemoPasswords(prisma: PrismaClient) {
  for (const account of DEMO_ACCOUNTS) {
    const user = await prisma.user.findUnique({ where: { email: account.email } });
    if (!user) continue;

    if (await bcrypt.compare(account.password, user.passwordHash)) continue;

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(account.password, 10) },
    });
    console.log(`· bootstrap: reset demo password for ${account.email}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("· bootstrap: DATABASE_URL not set, skipping.");
    return;
  }

  const prisma = new PrismaClient();

  // Escape hatch for rebuilding the demo dataset from scratch. Set SEED_RESET=true
  // for one deploy, then remove it — the seed truncates every table.
  const force = (process.env.SEED_RESET ?? "").trim().toLowerCase() === "true";

  try {
    const users = await prisma.user.count();

    if (users > 0 && force) {
      console.log(`· bootstrap: SEED_RESET set — rebuilding demo data (${users} users dropped).`);
    } else if (users > 0) {
      console.log(`· bootstrap: ${users} users present, skipping seed.`);
      await repairEmails(prisma);
      await migrateSeedDomain(prisma);
      await syncDemoPasswords(prisma);
      return;
    }
  } catch (error) {
    console.log("· bootstrap: could not read the database, skipping.");
    console.log(error instanceof Error ? error.message : error);
    return;
  } finally {
    await prisma.$disconnect();
  }

  console.log("· bootstrap: database is empty, running seed…");
  await import("./seed");
}

main().catch((error) => {
  console.error("· bootstrap failed:", error);
});
