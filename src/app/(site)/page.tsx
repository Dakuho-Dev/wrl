import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { ButtonLink } from "@/components/ui";

const METRICS = [
  ["4.6M+", "orders processed"],
  ["12,400", "connected shops"],
  ["99.95%", "sync uptime"],
  ["8.4h", "saved / week / seller"],
];

const CAPABILITIES = [
  {
    n: "01",
    title: "Data synchronization",
    body: "Orders, listings, inventory and customer records stay aligned across every connected marketplace, with automatic retry and rate-limit handling.",
  },
  {
    n: "02",
    title: "Workflow automation",
    body: "If-this-then-that rules for order routing, tagging, holds and notifications. No code, no spreadsheets, no copy-paste between tabs.",
  },
  {
    n: "03",
    title: "Order processing & shipping",
    body: "Route work to the right fulfillment location, generate labels in bulk and upload tracking back to the marketplace in one pass.",
  },
  {
    n: "04",
    title: "Real-time tracking",
    body: "One timeline per order from creation to delivery, with carrier events and exception alerts when a parcel stalls.",
  },
  {
    n: "05",
    title: "API integrations",
    body: "Official marketplace APIs, plus our own REST API and signed webhooks so your ERP, print partner or 3PL can plug straight in.",
  },
  {
    n: "06",
    title: "Optimization & analytics",
    body: "Revenue, fulfillment speed and backlog reporting across channels, so you can see exactly where the queue is stalling.",
  },
];

const PIPELINE = [
  ["01", "Connect", "Authorize through the marketplace's own OAuth screen. We never ask for your store password."],
  ["02", "Import", "Historical and new orders arrive with buyer details, personalization, address and payment state."],
  ["03", "Automate", "Rules move orders through production and hold anything unusual for a human to review."],
  ["04", "Ship", "The moment a label exists, tracking is pushed back and the buyer is notified on the channel they bought from."],
];

const CHANNELS = [
  ["Etsy", "Receipts · listings · stock", "Tracking upload · shipped flag", "Live"],
  ["Shopify", "Orders · products · inventory", "Fulfillments with tracking", "Live"],
  ["Amazon", "Order reports", "Shipping confirmations", "Beta"],
  ["TikTok Shop", "Orders · buyer details", "Labels · tracking", "Beta"],
];

const MANIFEST = [
  ["#2481930", "Etsy", "Shipped"],
  ["#2481929", "Etsy", "In production"],
  ["#2481928", "Shopify", "New"],
  ["#2481927", "TikTok", "Delivered"],
  ["#2481926", "Etsy", "On hold"],
];

const COMPLIANCE = [
  "OAuth 2.0 with PKCE — we never see your marketplace password",
  "Least-privilege API scopes, listed in full before you authorize",
  "Tokens encrypted at rest, deleted the moment you disconnect",
  "Full audit log of every sync and automation run",
  "Export or erase your data from the dashboard at any time",
];

export default function HomePage() {
  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="border-b-2 border-line-strong">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="py-14 lg:col-span-7 lg:border-r lg:border-line lg:py-20 lg:pr-12">
            <p className="label">Multichannel order operations</p>

            <h1 className="mt-5 text-[2.6rem] leading-[1.05] text-ink sm:text-6xl">
              Every order,
              <br />
              one ledger,
              <br />
              <span className="text-accent">no retyping.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
              DKH connects Etsy, Shopify, Amazon and TikTok Shop into a single operations desk, then
              runs the whole lifecycle — synchronization, processing, shipping and tracking —
              without anyone copying order data between browser tabs.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="/register" className="px-6 py-3 text-base">
                Create free account
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/features" variant="secondary" className="px-6 py-3 text-base">
                What it does
              </ButtonLink>
            </div>

            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
              No card required · Free tier · Disconnect anytime
            </p>
          </div>

          {/* Printed manifest, not a floating glass card */}
          <div className="border-t border-line py-10 lg:col-span-5 lg:border-t-0 lg:py-20 lg:pl-12">
            <div className="border-2 border-line-strong bg-surface">
              <div className="flex items-baseline justify-between border-b-2 border-line-strong px-4 py-2.5">
                <span className="label !text-ink">Today&rsquo;s queue</span>
                <span className="font-mono text-[11px] text-muted">05 AUG</span>
              </div>

              <table className="w-full border-collapse text-sm">
                <tbody>
                  {MANIFEST.map(([id, channel, state]) => (
                    <tr key={id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-2.5 font-mono text-[13px] text-ink">{id}</td>
                      <td className="px-2 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-2">
                        {channel}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[13px] text-ink-2">{state}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-3 border-t-2 border-line-strong">
                {[
                  ["18", "new"],
                  ["42", "in production"],
                  ["37", "shipped"],
                ].map(([value, label]) => (
                  <div key={label} className="border-r border-line px-4 py-3 last:border-r-0">
                    <p className="font-display text-2xl leading-none text-ink">{value}</p>
                    <p className="label mt-1.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-2">
              Tracking for 37 orders was pushed back to the marketplace automatically at 09:12.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Metrics */}
      <section className="border-b-2 border-line-strong bg-ink text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {METRICS.map(([value, label], index) => (
            <div
              key={label}
              className={`px-2 py-7 ${index < 3 ? "lg:border-r lg:border-white/15" : ""} ${
                index % 2 === 0 ? "border-r border-white/15 lg:border-r" : ""
              }`}
            >
              <p className="font-display text-3xl leading-none">{value}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-3">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ Capabilities */}
      <section id="features" className="border-b-2 border-line-strong">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-line-strong pb-5">
            <div>
              <p className="label">Section I</p>
              <h2 className="mt-2 text-4xl text-ink">What the platform does</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Six building blocks that replace the spreadsheets and browser tabs between a paid
              order and a delivered parcel.
            </p>
          </div>

          <div className="grid md:grid-cols-2">
            {CAPABILITIES.map((item, index) => (
              <article
                key={item.n}
                className={`border-b border-line py-7 md:py-8 ${
                  index % 2 === 0 ? "md:border-r md:pr-10" : "md:pl-10"
                }`}
              >
                <div className="flex gap-5">
                  <span className="font-display text-2xl leading-none text-muted-2">{item.n}</span>
                  <div>
                    <h3 className="text-xl text-ink">{item.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Pipeline */}
      <section className="border-b-2 border-line-strong bg-paper-2">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="label">Section II</p>
          <h2 className="mt-2 text-4xl text-ink">How an order moves</h2>

          <div className="mt-9 grid border-y-2 border-line-strong md:grid-cols-4">
            {PIPELINE.map(([step, title, body], index) => (
              <div
                key={step}
                className={`px-5 py-7 ${index < 3 ? "border-b border-line md:border-b-0 md:border-r" : ""}`}
              >
                <span className="font-display text-4xl leading-none text-accent">{step}</span>
                <h3 className="mt-4 text-lg text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Channels */}
      <section id="platforms" className="border-b-2 border-line-strong">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label">Section III</p>
              <h2 className="mt-2 text-4xl text-ink">Connected channels</h2>
            </div>
            <ButtonLink href="/platforms" variant="outline">
              Scope details <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>

          <div className="scroll-thin mt-8 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr>
                  {["Channel", "We read", "We write", "Status"].map((head) => (
                    <th
                      key={head}
                      className="label border-y-2 border-line-strong px-4 py-3 text-left"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map(([name, reads, writes, status]) => (
                  <tr key={name} className="border-b border-line">
                    <td className="px-4 py-4 font-display text-lg text-ink">{name}</td>
                    <td className="px-4 py-4 text-muted">{reads}</td>
                    <td className="px-4 py-4 text-muted">{writes}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${
                          status === "Live"
                            ? "border-emerald-800/25 bg-emerald-700/10 text-emerald-900"
                            : "border-amber-800/25 bg-amber-600/12 text-amber-900"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Compliance */}
      <section className="border-b-2 border-line-strong bg-paper-2">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="label">Section IV</p>
            <h2 className="mt-2 text-4xl text-ink">Built for marketplace compliance</h2>
            <p className="mt-5 max-w-lg leading-relaxed text-muted">
              DKH requests only the API scopes needed to import orders and upload tracking. Buyer
              data is used to fulfill the seller&rsquo;s own orders and nothing else — never sold,
              never used for advertising, never shared with other sellers.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/privacy"
                className="border border-line-strong px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-all hover:shadow-hard-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="/security"
                className="border border-line-strong px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-all hover:shadow-hard-sm"
              >
                Security Policy
              </Link>
            </div>
          </div>

          <ul className="divide-y divide-line border-y-2 border-line-strong">
            {COMPLIANCE.map((item) => (
              <li key={item} className="flex items-start gap-3 py-4 text-[15px] text-ink-2">
                <Check className="mt-1 h-4 w-4 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <h2 className="max-w-2xl text-4xl leading-tight">
                Stop managing orders. Start shipping them.
              </h2>
              <p className="mt-4 max-w-xl text-paper-3">
                Create a free account, connect your first shop, and watch the queue fill itself
                within minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="border border-white bg-white px-6 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition hover:bg-paper-2"
              >
                Create free account
              </Link>
              <Link
                href="/contact"
                className="border border-white/40 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white transition hover:border-white"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
