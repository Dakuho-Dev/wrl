import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

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
    title: "Order synchronisation",
    body: "Receipts are imported from your Etsy shop with buyer name, shipping address, line items, personalisation text and payment state, then kept up to date on every sync.",
  },
  {
    n: "02",
    title: "Production queue",
    body: "One list of what has to be made and shipped, with status, priority, internal notes and tags that live in DKH — your Etsy listings and orders are never altered.",
  },
  {
    n: "03",
    title: "Listing reference",
    body: "Active listings are pulled in read-only so order lines can be matched to a SKU, price and stock level. DKH does not create or edit listings.",
  },
  {
    n: "04",
    title: "Tracking upload",
    body: "When you record a shipment, the tracking number and carrier are submitted to Etsy against the receipt. Etsy marks the order shipped and handles notifying the buyer.",
  },
  {
    n: "05",
    title: "Workflow rules",
    body: "Trigger-condition-action rules that set status, priority or tags, alert a teammate, or call your own webhook. Everything they touch stays inside DKH.",
  },
  {
    n: "06",
    title: "Reporting",
    body: "Revenue, order volume and time-to-ship across your own shop, with CSV export of your own data whenever you want it.",
  },
];

const PIPELINE = [
  [
    "01",
    "Authorise",
    "You approve DKH on Etsy's own screen and see the exact scopes. We never ask for your Etsy password.",
  ],
  [
    "02",
    "Import",
    "Your receipts and active listings are read into DKH and refreshed on a schedule, or on demand.",
  ],
  [
    "03",
    "Work the queue",
    "Move orders through your own production stages. Rules handle the repetitive steps.",
  ],
  [
    "04",
    "Upload tracking",
    "Record the shipment and DKH submits the tracking number to Etsy. Etsy notifies the buyer — DKH never messages buyers itself.",
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

const COMMITMENTS = [
  "We request four scopes — the exact set the features above need, and nothing more",
  "Buyer data is used only to fulfil your own orders: never sold, never used for advertising, never shared with other sellers",
  "DKH does not email, text or otherwise message your buyers",
  "Tokens are encrypted at rest and deleted the moment you disconnect",
  "Disconnect or delete your account from the dashboard, and the data goes with it",
];

export default function HomePage() {
  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="border-b-2 border-line-strong">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="py-14 lg:col-span-7 lg:border-r lg:border-line lg:py-20 lg:pr-12">
            <p className="label">Order management for Etsy sellers</p>

            <h1 className="mt-5 text-[2.6rem] leading-[1.05] text-ink sm:text-6xl">
              Your Etsy orders,
              <br />
              in a queue built
              <br />
              <span className="text-accent">for making things.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
              DKH reads the orders from your Etsy shop into one production board, lets you track
              each one from paid to packed, and uploads the tracking number back to Etsy when it
              ships. That is the whole job.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="/register" className="px-6 py-3 text-base">
                Create free account
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/platforms" variant="secondary" className="px-6 py-3 text-base">
                What we access
              </ButtonLink>
            </div>

            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
              Free tier · No card required · Disconnect anytime
            </p>
          </div>

          <div className="border-t border-line py-10 lg:col-span-5 lg:border-t-0 lg:py-20 lg:pl-12">
            <div className="border-2 border-line-strong bg-surface">
              <div className="flex items-baseline justify-between border-b-2 border-line-strong px-4 py-2.5">
                <span className="label !text-ink">The queue</span>
                <span className="font-mono text-[11px] text-muted-2">Sample view</span>
              </div>

              <table className="w-full border-collapse text-sm">
                <tbody>
                  {MANIFEST.map(([id, state]) => (
                    <tr key={id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-2.5 font-mono text-[13px] text-ink">{id}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] text-ink-2">{state}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t-2 border-line-strong px-4 py-3">
                <p className="font-mono text-[11px] leading-relaxed text-muted">
                  Illustration of the order list. Figures are not real trading data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Facts */}
      <section className="border-b-2 border-line-strong bg-ink text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {FACTS.map(([value, label], index) => (
            <div
              key={label}
              className={`px-2 py-7 ${index < 3 ? "lg:border-r lg:border-white/15" : ""} ${
                index % 2 === 0 ? "border-r border-white/15 lg:border-r" : ""
              }`}
            >
              <p className="font-display text-2xl leading-tight">{value}</p>
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
              <h2 className="mt-2 text-4xl text-ink">What DKH does</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Six things, all of them working today against the Etsy Open API. Nothing here is
              planned or in beta.
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

      {/* ------------------------------------------------------------ Scopes */}
      <section id="platforms" className="border-b-2 border-line-strong">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label">Section III</p>
              <h2 className="mt-2 text-4xl text-ink">Exactly what we access</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                These four scopes are the complete list. You see them on Etsy&rsquo;s authorisation
                screen before you approve anything.
              </p>
            </div>
            <ButtonLink href="/platforms" variant="outline">
              Full detail <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>

          <div className="scroll-thin mt-8 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr>
                  {["Scope", "Access", "Used for"].map((head) => (
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
                {SCOPES.map(([scope, access, purpose]) => (
                  <tr key={scope} className="border-b border-line">
                    <td className="px-4 py-4 font-mono text-[13px] text-accent">{scope}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${
                          access === "Read"
                            ? "border-emerald-800/25 bg-emerald-700/10 text-emerald-900"
                            : "border-amber-800/25 bg-amber-600/12 text-amber-900"
                        }`}
                      >
                        {access}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Commitments */}
      <section className="border-b-2 border-line-strong bg-paper-2">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="label">Section IV</p>
            <h2 className="mt-2 text-4xl text-ink">How we handle your data</h2>
            <p className="mt-5 max-w-lg leading-relaxed text-muted">
              DKH acts as a service provider to you, the seller. Everything read from Etsy is used
              to fulfil your own orders and for nothing else.
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
            {COMMITMENTS.map((item) => (
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
                Get your orders out of the browser tab.
              </h2>
              <p className="mt-4 max-w-xl text-paper-3">
                Create a free account, authorise your Etsy shop, and your orders are in the queue a
                minute later.
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
                Contact support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
