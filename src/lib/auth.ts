import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { cleanEnv } from "@/lib/env";

const COOKIE_NAME = "dkh_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const value = cleanEnv(process.env.AUTH_SECRET);
  if (!value || value.length < 16) {
    // Keeps local dev working before .env is filled in.
    return new TextEncoder().encode("dkh-development-secret-key-please-change");
  }
  return new TextEncoder().encode(value);
}

export type SessionPayload = {
  sub: string;
  email: string;
  role: string;
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ""),
      role: String(payload.role ?? "USER"),
    };
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { plan: true },
  });
  if (!user || user.status === "SUSPENDED") return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * How many active shops a user may hold. Admins are exempt: the operator
 * account connects every shop the business owns so the scheduled job can feed
 * their orders to the CMS, and a plan cap makes no sense there.
 */
export function shopLimitFor(user: { role: string; plan?: { shopLimit: number } | null }) {
  if (user.role === "ADMIN") return Number.POSITIVE_INFINITY;
  return user.plan?.shopLimit ?? 1;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function logActivity(input: {
  userId?: string | null;
  level?: "INFO" | "WARN" | "ERROR";
  category?: "AUTH" | "SYNC" | "ORDER" | "AUTOMATION" | "ADMIN" | "SYSTEM";
  message: string;
  meta?: unknown;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        level: input.level ?? "INFO",
        category: input.category ?? "SYSTEM",
        message: input.message,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch {
    // Logging must never break a request.
  }
}
