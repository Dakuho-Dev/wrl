import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Cable,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Workflow,
} from "lucide-react";

import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Order synchronisation, a production queue, workflow rules, tracking upload to Etsy, reporting and a REST API — everything DKH does today.",
};

/**
 * Ground rule for this page: if it is listed here, it works in the shipping
 * application. Anything not built yet belongs in the roadmap section at the
 * bottom, clearly marked as not available.
 */

const SECTIONS = [
  {
    id: "sync",
    eyebrow: "Order synchronisation",
    icon: RefreshCw,
    title: "Your Etsy orders, imported and kept current",
    body: "DKH polls your shop on a schedule and on demand, importing receipts with buyer name, shipping address, line items, personalisation text, totals and payment state. Active listings come in read-only so order lines can be matched to a SKU, price and stock level.",
    bullets: [
      "Records are matched on Etsy's own receipt and listing ids, so re-syncing never duplicates",
      "Every run is recorded as a sync job with counts, duration and any error",
      "Access tokens refresh automatically before they expire",
      "Manual re-sync whenever you want the freshest data",
      "Failures surface on the Shops page and in the activity log rather than failing silently",
    ],
  },
  {
    id: "queue",
    eyebrow: "Production queue",
    icon: Search,
    title: "One list of what has to be made",
    body: "The order list is filterable by status, shop and free-text search across order number, buyer and Etsy receipt id, with pagination and bulk status changes. Each order opens onto its line items, personalisation, shipping address and a full event timeline.",
    bullets: [
      "Statuses you control: new, processing, on hold, shipped, delivered, cancelled, refunded",
      "Internal priority, tags and notes that live in DKH and never touch your Etsy listing",
      "Bulk status update across a filtered selection",
      "Timeline showing every import, status change, note and shipment on the order",
      "Personalisation text called out so it is not missed during production",
    ],
  },
  {
    id: "shipping",
    eyebrow: "Shipping & tracking",
    icon: Truck,
    title: "Record a shipment, Etsy gets the tracking",
    body: "When an order ships you record the carrier and tracking number. DKH submits it to Etsy against the receipt, which marks the order shipped on Etsy. An order can carry several shipments if it goes out in more than one parcel.",
    bullets: [
      "Carrier, service, tracking number and label cost per shipment",
      "Tracking link generated for the major carriers",
      "Upload status shown per shipment, so a failed push is visible",
      "Shipping view listing recent shipments and the orders still waiting",
      "Etsy sends the buyer notification — DKH never messages your buyers",
    ],
  },
  {
    id: "automation",
    eyebrow: "Workflow rules",
    icon: Workflow,
    title: "Rules for the repetitive decisions",
    body: "Build trigger-condition-action rules that act on orders as they arrive. Everything a rule touches stays inside DKH: your Etsy listings, prices and shop settings are never modified.",
    bullets: [
      "Triggers: order created, order paid, order shipped, sync completed, schedule",
      "Conditions on total, destination country, SKU or personalisation",
      "Actions: set status, set priority, add a tag, notify a teammate, upload tracking, call your webhook",
      "Enable, pause, run manually, or delete a rule at any time",
      "Run history per rule with outcome and duration",
    ],
  },
  {
    id: "analytics",
    eyebrow: "Reporting",
    icon: BarChart3,
    title: "Your own numbers, not benchmarks",
    body: "Revenue and order volume over time, average order value, and how long orders take to go from paid to shipped — all computed from your own imported data.",
    bullets: [
      "Revenue and order counts by week over the last quarter",
      "Average time from paid to tracking uploaded",
      "Breakdown by destination country and carrier",
      "Top products by revenue and units",
      "CSV export of your orders and shipments",
    ],
  },
  {
    id: "api",
    eyebrow: "REST API",
    icon: Cable,
    title: "Your data, programmatically",
    body: "Everything DKH imports is available over a REST API secured with scoped keys you generate yourself, so your own production software can read the queue and post shipments back.",
    bullets: [
      "GET /api/v1/orders — list and filter your orders",
      "GET /api/v1/orders/{id} — one order with items, shipments and events",
      "PATCH /api/v1/orders/{id} — update status, priority, tags or notes",
      "POST /api/v1/orders/{id}/shipments — record a shipment and upload tracking",
      "GET /api/v1/shops, /api/v1/products — connected shops and synced listings",
      "Keys are scoped read or read-write, and can be revoked instantly",
    ],
  },
];

const EXTRAS = [
  { icon: Bell, title: "Notifications", body: "In-app alerts for imports, failed syncs and plan limits." },
  { icon: ShieldCheck, title: "Activity log", body: "Every action recorded with actor, category and timestamp." },
  { icon: Download, title: "CSV export", body: "Download your orders and shipments whenever you want." },
  { icon: RefreshCw, title: "Manual re-sync", body: "Force an immediate pull from Etsy per shop." },
];

/** Stated plainly so nobody buys on the strength of something that isn't built. */
const NOT_YET = [
  "Buying shipping labels or comparing carrier rates — you record tracking from your own carrier account",
  "Packing slips, pick lists, invoices or customs documents",
  "Outbound webhook delivery — you can register an endpoint, but DKH does not send to it yet",
  "Team accounts and per-staff permissions",
  "Marketplaces other than Etsy",
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero eyebrow="Features" title="Everything DKH does today">
        Six areas, all working against the Etsy Open API right now. What is not built yet is
        listed at the bottom of this page rather than left to your imagination.
      </PageHero>

      {SECTIONS.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={`scroll-mt-20 border-b border-line py-16 ${index % 2 === 1 ? "bg-paper-2" : ""}`}
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-start lg:px-8">
            <div className={index % 2 === 1 ? "lg:order-2" : ""}>
              <span className="bg-azure-sweep shadow-hard-accent grid h-12 w-12 place-items-center rounded-xl text-white">
                <section.icon className="h-6 w-6" />
              </span>
              <p className="label mt-5">{section.eyebrow}</p>
              <h2 className="mt-2 text-3xl text-ink">{section.title}</h2>
              <p className="mt-4 leading-relaxed text-muted">{section.body}</p>
            </div>

            <ul className={`divide-y divide-line border-y border-line ${index % 2 === 1 ? "lg:order-1" : ""}`}>
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 py-3.5 text-sm text-ink-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-accent" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="border-b border-line py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl text-ink">And the smaller things</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXTRAS.map((extra) => (
              <div key={extra.title} className="border border-line bg-surface p-5">
                <extra.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-3 text-base text-ink">{extra.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{extra.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper-2 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-2xl text-ink">Not built yet</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Tools in this category often advertise things they intend to build. These are ours, and
            they do not work today:
          </p>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {NOT_YET.map((item) => (
              <li key={item} className="flex items-start gap-3 py-3.5 text-sm text-ink-2">
                <span className="mt-1 font-mono text-[11px] uppercase tracking-wider text-rose-800">
                  no
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/register" className="px-6 py-3">
              Start free
            </ButtonLink>
            <ButtonLink href="/platforms" variant="secondary" className="px-6 py-3">
              What we access
            </ButtonLink>
          </div>

          <p className="mt-10 border-t border-line pt-6 text-center text-xs text-muted">
            Missing something you need?{" "}
            <Link href="/contact" className="text-accent underline">
              Tell us
            </Link>{" "}
            and we will say honestly whether it is planned.
          </p>
        </div>
      </section>
    </>
  );
}
