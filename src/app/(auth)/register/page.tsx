import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

const PERKS = [
  "Free forever on the Starter plan",
  "Connect your first shop in minutes",
  "No credit card required",
  "Disconnect and delete your data anytime",
];

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2 lg:items-center">
      <div className="hidden lg:block">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">
          Bring every order into one queue
        </h2>
        <p className="mt-4 leading-relaxed text-muted">
          Connect Etsy, Shopify, Amazon and TikTok Shop, automate the fulfillment steps and let
          tracking flow back to your buyers automatically.
        </p>
        <ul className="mt-7 space-y-3">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-3 text-sm text-ink-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-none border border-line bg-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted">Start on the free Starter plan.</p>

        <div className="mt-6">
          <RegisterForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
