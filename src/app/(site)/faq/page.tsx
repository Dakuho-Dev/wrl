import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about connecting shops, syncing orders, data handling and marketplace API usage.",
};

const GROUPS = [
  {
    title: "Getting started",
    items: [
      {
        q: "What do I need to connect my first shop?",
        a: "Just an account on the marketplace you sell on. Create a free OwlFlow account, go to Dashboard → Shops → Connect shop, choose your channel and approve the permissions on the marketplace's own authorization screen.",
      },
      {
        q: "How long does the first import take?",
        a: "Usually under two minutes. We import your active listings first, then your recent order history. Large shops with thousands of past orders may take longer; the sync log shows live progress.",
      },
      {
        q: "Can I connect more than one shop?",
        a: "Yes. The Starter plan includes one shop, Growth includes five and Scale includes twenty-five. Shops can be on different marketplaces.",
      },
    ],
  },
  {
    title: "Orders & fulfillment",
    items: [
      {
        q: "Does OwlFlow change anything in my shop automatically?",
        a: "Only what you ask it to. By default OwlFlow reads data. Write actions — uploading tracking numbers and marking an order shipped — happen when you create a shipment or when you explicitly enable an automation that does it.",
      },
      {
        q: "What happens if a buyer cancels or refunds?",
        a: "The next sync detects the change on the marketplace and updates the order status to Cancelled or Refunded, and any automations you have that watch for those statuses will run.",
      },
      {
        q: "Can I edit an order in OwlFlow?",
        a: "You can change internal fields — status, priority, tags and notes — and add shipments. Buyer-facing details such as the shipping address stay under the marketplace's control.",
      },
      {
        q: "Do you support partial shipments?",
        a: "Yes. An order can have multiple shipments, each with its own carrier and tracking number, and the order shows as partially fulfilled until every line is covered.",
      },
    ],
  },
  {
    title: "Data & privacy",
    items: [
      {
        q: "What data do you store?",
        a: "Order records (buyer name, shipping address, line items, totals), listing data (title, SKU, price, stock) and the OAuth tokens needed to talk to the marketplace. We do not store payment card numbers — marketplaces never expose them.",
      },
      {
        q: "Do you sell or share buyer data?",
        a: "No. Buyer data is used only to fulfill the seller's own orders. We do not sell it, use it for advertising or share it with third parties beyond the carriers needed to ship the parcel.",
      },
      {
        q: "How do I delete my data?",
        a: "Disconnecting a shop deletes its tokens immediately. Deleting your account from Dashboard → Settings removes all associated shops, orders and shipments within 30 days. You can also email support@owlflow.io.",
      },
      {
        q: "Where is data stored?",
        a: "In encrypted databases hosted in the EU and US regions of our cloud provider. See the Security Policy for details.",
      },
    ],
  },
  {
    title: "Marketplace APIs",
    items: [
      {
        q: "Is OwlFlow affiliated with Etsy?",
        a: "No. The term \"Etsy\" is a trademark of Etsy, Inc. OwlFlow uses the Etsy API but is not endorsed or certified by Etsy, Inc.",
      },
      {
        q: "Do you scrape marketplaces?",
        a: "Never. Every integration uses the marketplace's official, documented API with credentials you authorize through OAuth.",
      },
      {
        q: "What happens if I revoke access?",
        a: "Syncing stops immediately and the shop is marked as disconnected. Already-imported orders stay in your OwlFlow account until you delete them.",
      },
      {
        q: "How do you handle rate limits?",
        a: "Requests are queued per shop and throttled below each marketplace's published limit. If a limit is hit anyway, the sync backs off exponentially and resumes where it stopped.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <section className="border-b border-ink-800/80">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">FAQ</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Can&apos;t find what you need?{" "}
            <Link href="/contact" className="text-brand-400 hover:text-brand-300">
              Send us a message
            </Link>{" "}
            and we will get back within one business day.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl space-y-12 px-4 sm:px-6">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="text-lg font-semibold text-white">{group.title}</h2>
              <div className="mt-4 divide-y divide-ink-700/50 overflow-hidden rounded-2xl border border-ink-600/50 bg-ink-850/50">
                {group.items.map((item) => (
                  <details key={item.q} className="group px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-100">
                      {item.q}
                      <span className="text-slate-500 transition group-open:rotate-45">＋</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
