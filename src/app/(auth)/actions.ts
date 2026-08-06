"use server";

import { redirect } from "next/navigation";

import { createSession, destroySession, hashPassword, logActivity, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AuthState = { error?: string } | null;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }
  if (user.status === "SUSPENDED") {
    return { error: "This account has been suspended. Contact support@dkh.io." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ sub: user.id, email: user.email, role: user.role });
  await logActivity({ userId: user.id, category: "AUTH", message: "User signed in" });

  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const company = String(formData.get("company") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const accepted = formData.get("terms") === "on";

  if (!name || !email || !password) return { error: "Please fill in every required field." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address is not valid." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!accepted) return { error: "Please accept the Terms and Privacy Policy." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const starter = await prisma.plan.findUnique({ where: { slug: "starter" } });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      company: company || null,
      passwordHash: await hashPassword(password),
      planId: starter?.id ?? null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      title: "Welcome to DKH",
      body: "Connect your first shop to start importing orders automatically.",
      type: "INFO",
      link: "/dashboard/shops",
    },
  });

  await createSession({ sub: user.id, email: user.email, role: user.role });
  await logActivity({ userId: user.id, category: "AUTH", message: "Account created" });

  redirect("/dashboard/shops?welcome=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
