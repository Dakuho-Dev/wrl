import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BookOpen, LifeBuoy, MessageSquare, PlugZap, RefreshCw } from "lucide-react";

import { ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Support Center",
  description: "Guides, troubleshooting and ways to reach the OwlFlow support team.",
};

const TOPICS = [
  {
    icon: PlugZap,
    title: "Connecting a shop",
    body: "Step-by-step OAuth walkthrough for each marketplace, plus what to do when the authorization screen errors out.",
    href: "/docs#connect-etsy",
  },
  {
    icon: RefreshCw,
    title: "Sync troubleshooting",
    body: "Why an order might be missing, how to force a re-sync and how to read the sync log.",
    href: "/docs#sync",
  },
  {
    icon: BookOpen,
    title: "Automation recipes",
    body: "Ready-made rules for print-on-demand, personalization checks and VIP order handling.",
    href: "/docs#automations",
  },
  {
    icon: LifeBuoy,
    title: "Billing & plans",
    body: "Changing plan, invoices, order quotas and what happens when you hit a limit.",
    href: "/pricing",
  },
];

const ISSUES = [
  {
    title: "My shop shows “Error” after a token refresh",
    body: "This usually means the marketplace revoked the token — often after a password change. Open Dashboard → Shops, click Reconnect, and approve the permissions again. Your existing orders are preserved.",
  },
  {
    title: "An order is missing from OwlFlow",
    body: "Check the sync log for the shop. Orders placed while a sync was failing appear on the next successful run. You can also press Sync now to pull immediately.",
  },
  {
    title: "Tracking did not reach the marketplace",
    body: "Tracking upload requires the write scope (transactions_w on Etsy). If you connected before granting it, reconnect the shop. The shipment detail view shows whether the push succeeded.",
  },
  {
    title: "I hit my monthly order limit",
    body: "Syncing pauses when a plan's order quota is reached. Upgrade from Dashboard → Billing and the queue resumes automatically — no orders are lost.",
  },
];

export default function SupportPage() {
  return (
    <>
      <section className="border-b border-ink-800/80">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">Support</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Support center
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Start with the guides below. If none of them cover it, open a ticket and a human will
            answer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact" className="px-5 py-2.5">
              <MessageSquare className="h-4 w-4" /> Open a ticket
            </ButtonLink>
            <ButtonLink href="/docs" variant="outline" className="px-5 py-2.5">
              Read the docs
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {TOPICS.map((topic) => (
              <Link key={topic.title} href={topic.href}>
                <Card className="h-full p-6 transition hover:border-brand-500/40">
                  <topic.icon className="h-6 w-6 text-brand-400" />
                  <h2 className="mt-4 font-semibold text-white">{topic.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{topic.body}</p>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-14">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Common issues
            </h2>
            <div className="mt-5 space-y-3">
              {ISSUES.map((issue) => (
                <Card key={issue.title} className="p-5">
                  <h3 className="text-sm font-semibold text-white">{issue.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{issue.body}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="font-semibold text-white">Still stuck?</h2>
              <p className="mt-1 text-sm text-slate-400">
                Send us your shop name and the time the problem occurred — it makes diagnosis much
                faster.
              </p>
            </div>
            <ButtonLink href="/contact">Contact support</ButtonLink>
          </Card>
        </div>
      </section>
    </>
  );
}
