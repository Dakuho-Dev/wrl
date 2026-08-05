/**
 * Runs the demo seed only when the database has no users yet.
 *
 * This is safe to call on every deploy: the moment real accounts exist, the
 * seed (which truncates every table) is skipped.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("· seed-if-empty: DATABASE_URL not set, skipping.");
    return;
  }

  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.count();
    if (users > 0) {
      console.log(`· seed-if-empty: ${users} users already present, skipping seed.`);
      return;
    }
  } catch (error) {
    console.log("· seed-if-empty: could not read the database, skipping seed.");
    console.log(error instanceof Error ? error.message : error);
    return;
  } finally {
    await prisma.$disconnect();
  }

  console.log("· seed-if-empty: database is empty, running seed…");
  await import("./seed");
}

main().catch((error) => {
  // Never fail a deployment because the demo seed had a problem.
  console.error("· seed-if-empty failed:", error);
});
