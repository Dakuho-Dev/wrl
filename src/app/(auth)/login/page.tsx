import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

/**
 * Reviewers (Etsy, prospective customers) need a way in, so the demo credentials
 * are shown when SHOW_DEMO_CREDENTIALS is enabled. Turn it off once the app
 * carries real seller data.
 */
const showDemoCredentials = process.env.SHOW_DEMO_CREDENTIALS !== "false";
const demoSeller = process.env.DEMO_SELLER_EMAIL ?? "seller@owlflow.io";
const demoAdmin = process.env.DEMO_ADMIN_EMAIL ?? "admin@owlflow.io";
const demoSellerPassword = process.env.DEMO_SELLER_PASSWORD ?? "Password123!";
const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "Admin123!";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-ink-600/50 bg-ink-850/80 p-7 shadow-2xl shadow-black/40 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Sign in to your OwlFlow operations console.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          No account yet?{" "}
          <Link href="/register" className="font-medium text-brand-400 hover:text-brand-300">
            Create one free
          </Link>
        </p>
      </div>

      {showDemoCredentials ? (
        <div className="mt-4 rounded-2xl border border-ink-700/60 bg-ink-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Demo accounts
          </p>
          <div className="mt-2 space-y-1 text-xs text-slate-400">
            <p>
              Seller · <code className="text-brand-300">{demoSeller}</code> /{" "}
              <code className="text-brand-300">{demoSellerPassword}</code>
            </p>
            <p>
              Admin · <code className="text-brand-300">{demoAdmin}</code> /{" "}
              <code className="text-brand-300">{demoAdminPassword}</code>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
