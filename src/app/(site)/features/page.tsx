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
    body: "DKH polls each connected marketplace on a schedule and imports orders, buyer details, personalization notes, shipping addresses and payment state. Listings and inventory counts come along for the ride, so you always know what is actually in stock.",
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
    body: "Describe what should happen when an order arrives and DKH handles it forever. Triggers, conditions and actions are composable, so a rule can be as simple as tagging a VIP order or as involved as routing print files to a specific supplier.",
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
    title: "Plug DKH into your stack",
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
      <section className="relative overflow-hidden border-b border-line">
        <div className="surface-rule pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Features</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            The whole order lifecycle, handled
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            DKH replaces the manual steps between &ldquo;buyer paid&rdquo; and &ldquo;parcel
            delivered&rdquo; with a single automated pipeline.
          </p>
        </div>
      </section>

      {SECTIONS.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={`scroll-mt-20 border-b border-line py-20 ${index % 2 === 1 ? "bg-paper-2" : ""}`}
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-start lg:px-8">
            <div className={index % 2 === 1 ? "lg:order-2" : ""}>
              <span className="grid h-12 w-12 place-items-center rounded-none bg-accent-soft text-accent ring-1 ring-accent">
                <section.icon className="h-6 w-6" />
              </span>
              <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-accent">
                {section.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                {section.title}
              </h2>
              <p className="mt-4 leading-relaxed text-muted">{section.body}</p>
            </div>

            <ul className={`space-y-3 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
              {section.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-3 rounded-none border border-line bg-surface px-4 py-3.5 text-sm text-ink-2"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            And the details that matter
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXTRAS.map((extra) => (
              <div key={extra.title} className="rounded-none border border-line bg-surface p-5">
                <extra.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-3 text-sm font-semibold text-ink">{extra.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{extra.body}</p>
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
