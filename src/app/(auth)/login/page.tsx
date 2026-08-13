import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <div className="w-full max-w-md">
      <div className="shadow-hard rounded-2xl border border-line bg-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted">
          Sign in to your WrL operations console.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          No account yet?{" "}
          <Link href="/register" className="font-medium text-accent hover:text-accent">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
