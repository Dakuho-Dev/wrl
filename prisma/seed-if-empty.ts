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

const DEMO_ACCOUNTS = [
  {
    email: clean(process.env.DEMO_ADMIN_EMAIL, "admin@owlflow.io"),
    password: clean(process.env.DEMO_ADMIN_PASSWORD, "Admin123!"),
  },
  {
    email: clean(process.env.DEMO_SELLER_EMAIL, "seller@owlflow.io"),
    password: clean(process.env.DEMO_SELLER_PASSWORD, "Password123!"),
  },
];

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

  try {
    const users = await prisma.user.count();

    if (users > 0) {
      console.log(`· bootstrap: ${users} users present, skipping seed.`);
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
