import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  KeyRound,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Tags,
  Truck,
  Workflow,
} from "lucide-react";

import { EtsyTrademarkCard } from "@/components/site/etsy-trademark-banner";
import { ButtonLink } from "@/components/ui";

/**
 * Every claim on this page has to be true of the shipping application — Etsy's
 * API Terms require the app to be "fully functional" and "consistent with the
 * Application Purpose" submitted for review. No usage statistics, no channels
 * that do not exist, no buyer-facing messaging.
 */

/** Verifiable facts about how the integration works, not usage numbers. */
const FACTS = [
  ["Etsy Open API v3", "the only marketplace API we call"],
  ["OAuth 2.0 + PKCE", "you authorise on etsy.com"],
  ["4 scopes", "the minimum the features need"],
  ["AES-256-GCM", "tokens encrypted at rest"],
];

const CAPABILITIES = [
  {
    n: "01",
    icon: RefreshCw,
    title: "Order synchronisation",
    body: "Receipts are imported from your Etsy shop with buyer name, shipping address, line items, personalisation text and payment state, then kept up to date on every sync.",
  },
  {
    n: "02",
    icon: ListChecks,
    title: "Production queue",
    body: "One list of what has to be made and shipped, with status, priority, internal notes and tags that live in WrL — your Etsy listings and orders are never altered.",
  },
  {
    n: "03",
    icon: Tags,
    title: "Listing reference",
    body: "Active listings are pulled in read-only so order lines can be matched to a SKU, price and stock level. WrL does not create or edit listings.",
  },
  {
    n: "04",
    icon: Truck,
    title: "Tracking upload",
    body: "When you record a shipment, the tracking number and carrier are submitted to Etsy against the receipt. Etsy marks the order shipped and handles notifying the buyer.",
  },
  {
    n: "05",
    icon: Workflow,
    title: "Workflow rules",
    body: "Trigger-condition-action rules that set status, priority or tags, alert a teammate, or call your own webhook. Everything they touch stays inside WrL.",
  },
  {
    n: "06",
    icon: BarChart3,
    title: "Reporting",
    body: "Revenue, order volume and time-to-ship across your own shop, with CSV export of your own data whenever you want it.",
  },
];

const PIPELINE = [
  [
    "01",
    "Authorise",
    "You approve WrL on Etsy's own screen and see the exact scopes. We never ask for your Etsy password.",
  ],
  [
    "02",
    "Import",
    "Your receipts and active listings are read into WrL and refreshed on a schedule, or on demand.",
  ],
  [
    "03",
    "Work the queue",
    "Move orders through your own production stages. Rules handle the repetitive steps.",
  ],
  [
    "04",
    "Upload tracking",
    "Record the shipment and WrL submits the tracking number to Etsy. Etsy notifies the buyer — WrL never messages buyers itself.",
  ],
];

/** Scope → what it is used for. Mirrors DEFAULT_SCOPES in src/lib/etsy.ts. */
const SCOPES = [
  ["shops_r", "Read", "Your shop id, name and currency, to label the connection"],
  ["listings_r", "Read", "Active listings: title, SKU, price, quantity, image"],
  ["transactions_r", "Read", "Receipts: buyer name, address, line items, totals, payment state"],
  ["transactions_w", "Write", "Submit a tracking number and mark the receipt shipped"],
];

const MANIFEST = [
  ["#2481930", "Shipped"],
  ["#2481929", "In production"],
  ["#2481928", "New"],
  ["#2481927", "Delivered"],
  ["#2481926", "On hold"],
];

const STATE_TONE: Record<string, string> = {
  Shipped: "bg-violet-100 text-violet-800",
  "In production": "bg-amber-100 text-amber-800",
  New: "bg-slate-100 text-slate-700",
  Delivered: "bg-emerald-100 text-emerald-800",
  "On hold": "bg-rose-100 text-rose-800",
};

const COMMITMENTS = [
  "We request four scopes — the exact set the features above need, and nothing more",
  "Buyer data is used only to fulfil your own orders: never sold, never used for advertising, never shared with other sellers",
  "WrL does not email, text or otherwise message your buyers",
  "Tokens are encrypted at rest and deleted the moment you disconnect",
  "Disconnect or delete your account from the dashboard, and the data goes with it",
];

export default function HomePage() {
  return (
    <>
      {/* --------------------------------------------------- Hero (card) */}
      <section className="px-3 pt-4 sm:px-4">
        <div className="bg-brand-sweep relative mx-auto max-w-7xl overflow-hidden rounded-[28px] text-white">
          <div className="surface-dots absolute inset-0 opacity-60" aria-hidden />
          <div
            className="absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full bg-fuchsia-400/25 blur-3xl"
            aria-hidden
          />
          <div
            className="absolute -bottom-32 -left-28 h-[380px] w-[380px] rounded-full bg-violet-500/30 blur-3xl"
            aria-hidden
          />

          <div className="relative grid items-center gap-12 px-6 py-16 sm:px-10 lg:grid-cols-12 lg:px-14 lg:py-24">
          <div className="animate-rise lg:order-2 lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-violet-100 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              Order management for Etsy sellers
            </span>

            <h1 className="mt-6 text-[2.7rem] font-bold leading-[1.06] tracking-tight sm:text-6xl">
              Your Etsy orders,
              <br />
              in a queue built{" "}
              <span className="bg-gradient-to-r from-violet-300 to-fuchsia-200 bg-clip-text text-transparent">
                for making things.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-200">
              WrL reads the orders from your Etsy shop into one production board, lets you track
              each one from paid to packed, and uploads the tracking number back to Etsy when it
              ships. That is the whole job.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-accent shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-violet-50"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/platforms"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
              >
                What we access
              </Link>
            </div>

            <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">
              Free tier · No card required · Disconnect anytime
            </p>
          </div>

          {/* Sample queue — labelled, so nobody mistakes it for real trading data. */}
          <div className="animate-rise lg:order-1 lg:col-span-5">
            <div className="rounded-2xl border border-white/15 bg-white/8 p-2 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="overflow-hidden rounded-xl bg-surface">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <span className="label">The queue</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
                    Sample view
                  </span>
                </div>

                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {MANIFEST.map(([id, state]) => (
                      <tr key={id} className="border-b border-line last:border-b-0">
                        <td className="px-4 py-3 font-mono text-[13px] text-ink">{id}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATE_TONE[state]}`}
                          >
                            {state}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-line bg-paper-2/60 px-4 py-3">
                  <p className="font-mono text-[10.5px] leading-relaxed text-muted">
                    Illustration of the order list. Figures are not real trading data.
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Facts */}
      <section className="px-3 sm:px-4">
        <div className="mx-auto grid max-w-7xl gap-3 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(([value, label]) => (
            <div
              key={label}
              className="shadow-card rounded-2xl border border-line bg-surface px-5 py-6 text-center transition hover:-translate-y-0.5 hover:shadow-hard-sm"
            >
              <p className="text-brand-sweep font-display text-xl leading-tight sm:text-2xl">
                {value}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-muted">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ Capabilities */}
      <section id="features" className="bg-aurora">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label">What WrL does</p>
            <h2 className="mt-3 text-4xl text-ink sm:text-[2.75rem]">
              Six things, all working today
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Everything below runs against the Etsy Open API right now. Nothing here is planned,
              in beta, or coming soon.
            </p>
          </div>

          {/* Alternating rows: the eye zig-zags down the page instead of
              scanning a uniform grid, so each capability gets its own beat. */}
          <div className="mt-14 space-y-4">
            {CAPABILITIES.map((item, index) => {
              const Icon = item.icon;
              const flip = index % 2 === 1;
              return (
                <article
                  key={item.n}
                  className={`shadow-card group relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-line bg-surface p-7 transition-all duration-300 hover:border-accent/30 hover:shadow-hard sm:items-center sm:gap-10 sm:p-9 ${
                    flip ? "sm:flex-row-reverse" : "sm:flex-row"
                  }`}
                >
                  <span
                    className={`bg-accent-sweep absolute inset-y-0 w-1 origin-bottom scale-y-0 transition-transform duration-300 group-hover:scale-y-100 ${
                      flip ? "right-0" : "left-0"
                    }`}
                    aria-hidden
                  />

                  <div className="flex shrink-0 items-center gap-4 sm:w-64 sm:flex-col sm:items-start sm:gap-5">
                    <span className="bg-accent-sweep shadow-hard-accent grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white transition group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <span className="font-mono text-[11px] tracking-widest text-muted-2">
                        {item.n}
                      </span>
                      <h3 className="text-xl leading-snug text-ink">{item.title}</h3>
                    </div>
                  </div>

                  <p
                    className={`flex-1 text-[15px] leading-relaxed text-muted ${
                      flip ? "sm:text-right" : ""
                    }`}
                  >
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------- Scopes (accent card) */}
      <section id="platforms" className="px-3 pb-4 sm:px-4">
        <div className="bg-accent-sweep relative mx-auto max-w-7xl overflow-hidden rounded-[28px] text-white">
        <div className="surface-dots absolute inset-0 opacity-40" aria-hidden />

        <div className="relative px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
          {/* Heading pins to the left while the scopes scroll past it. */}
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-10">
                <p className="label !text-violet-100">Exactly what we access</p>
                <h2 className="mt-3 text-4xl sm:text-[2.75rem]">Four scopes. That is the list.</h2>
                <p className="mt-4 leading-relaxed text-violet-100">
                  You see them on Etsy&rsquo;s own authorisation screen before you approve anything
                  — and you can revoke them from your Etsy account at any time.
                </p>
                <Link
                  href="/platforms"
                  className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
                >
                  Full detail <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-7">
            {/* Second required-notice placement, mid-page and high contrast. */}
            <EtsyTrademarkCard />

            {SCOPES.map(([scope, access, purpose]) => (
              <div
                key={scope}
                className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur transition hover:border-white/35 hover:bg-white/15"
              >
                <div className="flex items-center justify-between gap-3">
                  <code className="flex items-center gap-2 font-mono text-[15px] font-semibold text-white">
                    <KeyRound className="h-4 w-4 text-violet-200" />
                    {scope}
                  </code>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-wider ${
                      access === "Read"
                        ? "bg-emerald-400/20 text-emerald-50"
                        : "bg-amber-400/25 text-amber-50"
                    }`}
                  >
                    {access}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-violet-100">{purpose}</p>
              </div>
            ))}
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Pipeline */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label">How an order moves</p>
            <h2 className="mt-3 text-4xl text-ink sm:text-[2.75rem]">From paid to packed</h2>
          </div>

          {/* Vertical timeline: an order moves through these in sequence, so
              the layout runs down the page rather than across it. */}
          <div className="relative mx-auto mt-14 max-w-3xl">
            <div
              className="absolute bottom-6 left-6 top-6 w-px bg-gradient-to-b from-accent/10 via-accent/40 to-accent/10"
              aria-hidden
            />
            <div className="space-y-8">
              {PIPELINE.map(([step, title, body]) => (
                <div key={step} className="relative flex gap-6">
                  <span className="bg-accent-sweep shadow-hard-accent relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-lg text-white">
                    {step}
                  </span>
                  <div className="pt-1.5">
                    <h3 className="text-lg text-ink">{title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Commitments */}
      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          {/* Copy sits to the right of the list here, mirroring the hero. */}
          <div className="lg:order-2">
            <p className="label">How we handle your data</p>
            <h2 className="mt-3 text-4xl text-ink sm:text-[2.75rem]">
              Your seller data stays yours
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-muted">
              WrL acts as a service provider to you, the seller. Everything read from Etsy is used
              to fulfil your own orders and for nothing else.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/privacy" variant="secondary" className="px-5 py-2.5">
                Privacy Policy
              </ButtonLink>
              <ButtonLink href="/security" variant="secondary" className="px-5 py-2.5">
                Security Policy
              </ButtonLink>
            </div>
          </div>

          <ul className="shadow-card space-y-4 rounded-3xl border border-line bg-surface p-7 lg:order-1">
            {COMMITMENTS.map((item) => (
              <li key={item} className="flex items-start gap-3.5 text-[14.5px] leading-relaxed text-ink-2">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- CTA (card) */}
      <section className="px-3 pb-6 sm:px-4">
        <div className="bg-brand-sweep relative mx-auto max-w-7xl overflow-hidden rounded-[28px] text-white">
        <div className="surface-dots absolute inset-0 opacity-50" aria-hidden />
        <div
          className="absolute -right-20 -top-24 h-[340px] w-[340px] rounded-full bg-fuchsia-400/25 blur-3xl"
          aria-hidden
        />
        <div className="relative px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <h2 className="max-w-2xl text-4xl leading-tight sm:text-[2.75rem]">
                Get your orders out of the browser tab.
              </h2>
              <p className="mt-4 max-w-xl text-slate-300">
                Create a free account, authorise your Etsy shop, and your orders are in the queue a
                minute later.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-accent shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-violet-50"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-xl border border-white/30 px-6 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
              >
                Contact support
              </Link>
            </div>
          </div>
        </div>
        </div>
      </section>
    </>
  );
}
