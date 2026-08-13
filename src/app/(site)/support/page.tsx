import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import Link from "next/link";
import { AlertTriangle, BookOpen, LifeBuoy, MessageSquare, PlugZap, RefreshCw } from "lucide-react";

import { ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Support Center",
  description: "Guides, troubleshooting and ways to reach the DKH support team.",
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
    title: "An order is missing from DKH",
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
      <PageHero eyebrow="Support" title="Support center">
        <p>
          Start with the guides below. If none of them cover it, open a ticket and a human will
          answer.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-accent transition-all hover:-translate-y-0.5 hover:bg-violet-50"
          >
            <MessageSquare className="h-4 w-4" /> Open a ticket
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
          >
            Read the docs
          </Link>
        </div>
      </PageHero>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {TOPICS.map((topic) => (
              <Link key={topic.title} href={topic.href}>
                <Card className="h-full p-6 transition hover:border-accent">
                  <topic.icon className="h-6 w-6 text-accent" />
                  <h2 className="mt-4 font-semibold text-ink">{topic.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{topic.body}</p>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-14">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              Common issues
            </h2>
            <div className="mt-5 space-y-3">
              {ISSUES.map((issue) => (
                <Card key={issue.title} className="p-5">
                  <h3 className="text-sm font-semibold text-ink">{issue.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{issue.body}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="font-semibold text-ink">Still stuck?</h2>
              <p className="mt-1 text-sm text-muted">
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
