import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { SITE_DOMAIN } from "@/lib/site-config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

/**
 * Reviewers (Etsy, prospective customers) need a way in, so the demo credentials
 * are shown when SHOW_DEMO_CREDENTIALS is enabled. Turn it off once the app
 * carries real seller data.
 */
const showDemoCredentials = process.env.SHOW_DEMO_CREDENTIALS !== "false";
const demoSeller = process.env.DEMO_SELLER_EMAIL ?? `seller@${SITE_DOMAIN}`;
const demoAdmin = process.env.DEMO_ADMIN_EMAIL ?? `admin@${SITE_DOMAIN}`;
const demoSellerPassword = process.env.DEMO_SELLER_PASSWORD ?? "Password123!";
const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "Admin123!";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <div className="w-full max-w-md">
      <div className="shadow-hard rounded-2xl border border-line bg-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted">
          Sign in to your DKH operations console.
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

      {showDemoCredentials ? (
        <div className="mt-4 rounded-xl border border-line bg-paper-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
            Demo accounts
          </p>
          <div className="mt-2 space-y-1 text-xs text-muted">
            <p>
              Seller · <code className="text-accent">{demoSeller}</code> /{" "}
              <code className="text-accent">{demoSellerPassword}</code>
            </p>
            <p>
              Admin · <code className="text-accent">{demoAdmin}</code> /{" "}
              <code className="text-accent">{demoAdminPassword}</code>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
