import type { Metadata } from "next";
import {
  BarChart3,
  Bell,
  Boxes,
  Cable,
  FileText,
  Gauge,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Users,
  Workflow,
} from "lucide-react";

import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Order synchronization, workflow automation, shipping labels, real-time tracking, API integrations and analytics for multichannel sellers.",
};

const SECTIONS = [
  {
    id: "sync",
    eyebrow: "Data synchronization",
    icon: RefreshCw,
    title: "One order queue for every channel",
    body: "OwlFlow polls each connected marketplace on a schedule and imports orders, buyer details, personalization notes, shipping addresses and payment state. Listings and inventory counts come along for the ride, so you always know what is actually in stock.",
    bullets: [
      "Incremental sync — only new and changed records are fetched",
      "Automatic retry with exponential backoff on marketplace rate limits",
      "Historical import of past orders when you first connect a shop",
      "Duplicate protection using the marketplace's own record id",
      "Per-shop sync log so you can see exactly what happened and when",
    ],
  },
  {
    id: "automation",
    eyebrow: "Workflow automation",
    icon: Workflow,
    title: "Rules that do the repetitive work",
    body: "Describe what should happen when an order arrives and OwlFlow handles it forever. Triggers, conditions and actions are composable, so a rule can be as simple as tagging a VIP order or as involved as routing print files to a specific supplier.",
    bullets: [
      "Triggers: order created, order paid, order shipped, sync completed, schedule",
      "Conditions on total, SKU, destination country, channel, personalization",
      "Actions: change status, set priority, add tag, notify a teammate, call a webhook",
      "Dry-run preview before you enable a rule on live orders",
      "Complete run history with duration and outcome per execution",
    ],
  },
  {
    id: "shipping",
    eyebrow: "Order processing & shipping",
    icon: Truck,
    title: "From production queue to parcel",
    body: "Group orders into batches, generate labels in bulk and record tracking numbers in a single pass. Once a shipment exists, the tracking code is pushed back to the marketplace so the buyer gets notified through the channel they bought on.",
    bullets: [
      "Bulk selection with saved filters (unshipped, high priority, by SKU)",
      "Carrier rate comparison across USPS, UPS, FedEx, DHL and regional partners",
      "Packing slips and pick lists generated per batch",
      "Tracking upload back to Etsy, Shopify, Amazon and TikTok Shop",
      "Split shipments for partially fulfilled orders",
    ],
  },
  {
    id: "tracking",
    eyebrow: "Real-time tracking",
    icon: Gauge,
    title: "Know where every parcel is",
    body: "Each order carries a unified timeline: imported, paid, in production, label created, in transit, delivered. Carrier exceptions surface as alerts rather than as an angry buyer message three days later.",
    bullets: [
      "Unified event timeline per order across all systems",
      "Delivery exception and delayed-shipment alerts",
      "Buyer-facing tracking page you can share",
      "SLA countdown against the marketplace's ship-by date",
    ],
  },
  {
    id: "api",
    eyebrow: "API integrations",
    icon: Cable,
    title: "Plug OwlFlow into your stack",
    body: "Everything the dashboard can do is available over a REST API secured with scoped keys. Signed webhooks push events to your systems the moment they happen, so your ERP or production software stays in step.",
    bullets: [
      "REST endpoints for orders, shipments, products and shops",
      "Scoped API keys with independent read and write permissions",
      "HMAC-signed webhooks with automatic retry on failure",
      "Official marketplace APIs only — no scraping, no browser automation",
      "Sandbox environment for building against before you go live",
    ],
  },
  {
    id: "analytics",
    eyebrow: "Optimization & analytics",
    icon: BarChart3,
    title: "Find the bottleneck",
    body: "Revenue, order volume, average fulfillment time and channel mix in one place. Spot the SKU that always ships late or the channel that quietly became your biggest earner.",
    bullets: [
      "Revenue and volume by channel, SKU and time period",
      "Average time from paid to shipped, per shop and per product",
      "Backlog ageing report to catch orders stuck in production",
      "CSV export for accounting and inventory planning",
    ],
  },
];

const EXTRAS = [
  { icon: Users, title: "Team accounts", body: "Invite staff with role-based access to orders and shipping only." },
  { icon: Bell, title: "Smart notifications", body: "Email and in-app alerts for failed syncs, refunds and SLA risks." },
  { icon: Search, title: "Universal search", body: "Find any order by number, buyer, SKU or tracking code instantly." },
  { icon: FileText, title: "Documents", body: "Packing slips, invoices and customs declarations generated per order." },
  { icon: Layers, title: "Bulk actions", body: "Update status, priority or tags across hundreds of orders at once." },
  { icon: Boxes, title: "Inventory view", body: "Live stock counts pulled from every connected listing." },
  { icon: ShieldCheck, title: "Audit log", body: "Every action recorded with actor, timestamp and IP address." },
  { icon: RefreshCw, title: "Manual re-sync", body: "Force an immediate pull whenever you need the freshest data." },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-ink-800/80">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">Features</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            The whole order lifecycle, handled
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            OwlFlow replaces the manual steps between &ldquo;buyer paid&rdquo; and &ldquo;parcel
            delivered&rdquo; with a single automated pipeline.
          </p>
        </div>
      </section>

      {SECTIONS.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={`scroll-mt-20 border-b border-ink-800/80 py-20 ${index % 2 === 1 ? "bg-ink-900/40" : ""}`}
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-start lg:px-8">
            <div className={index % 2 === 1 ? "lg:order-2" : ""}>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/20">
                <section.icon className="h-6 w-6" />
              </span>
              <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-brand-400">
                {section.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {section.title}
              </h2>
              <p className="mt-4 leading-relaxed text-slate-400">{section.body}</p>
            </div>

            <ul className={`space-y-3 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
              {section.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-3 rounded-xl border border-ink-600/40 bg-ink-850/50 px-4 py-3.5 text-sm text-slate-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            And the details that matter
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXTRAS.map((extra) => (
              <div key={extra.title} className="rounded-2xl border border-ink-600/50 bg-ink-850/50 p-5">
                <extra.icon className="h-5 w-5 text-brand-400" />
                <h3 className="mt-3 text-sm font-semibold text-white">{extra.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{extra.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/register" className="px-6 py-3">
              Start free
            </ButtonLink>
            <ButtonLink href="/pricing" variant="outline" className="px-6 py-3">
              See pricing
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
