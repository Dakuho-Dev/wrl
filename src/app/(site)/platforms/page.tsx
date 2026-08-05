import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";

import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Platforms",
  description:
    "OwlFlow integrates with Etsy, Shopify, Amazon and TikTok Shop through their official APIs, plus carriers and custom endpoints.",
};

const CHANNELS = [
  {
    name: "Etsy",
    status: "Live",
    color: "from-orange-500 to-amber-500",
    summary:
      "OwlFlow uses the Etsy Open API v3 with OAuth 2.0 (PKCE). After you authorize the connection we import your shop's receipts and active listings, keep order status in sync, and upload tracking numbers back to Etsy so buyers are notified automatically.",
    scopes: [
      ["shops_r", "Read your shop profile and settings"],
      ["listings_r", "Read active listings, SKUs, prices and stock"],
      ["transactions_r", "Read receipts (orders) and their line items"],
      ["transactions_w", "Upload tracking numbers and mark orders shipped"],
      ["email_r", "Read your account email so we can contact you about sync issues"],
    ],
    capabilities: [
      "Import receipts with buyer name, address and personalization",
      "Sync active listings, SKUs, stock levels and prices",
      "Push tracking codes back to Etsy (submitTracking)",
      "Detect cancellations and refunds",
      "Respect Etsy's rate limits with automatic backoff",
    ],
  },
  {
    name: "Shopify",
    status: "Live",
    color: "from-emerald-500 to-green-600",
    summary:
      "Connect a Shopify store through a private or custom app. Orders, products and fulfillments stay aligned with the rest of your channels.",
    scopes: [
      ["read_orders", "Import orders and line items"],
      ["write_fulfillments", "Create fulfillments with tracking"],
      ["read_products", "Sync product catalog and inventory"],
    ],
    capabilities: [
      "Order and refund sync",
      "Fulfillment creation with tracking URL",
      "Product and variant catalog import",
      "Multi-location inventory awareness",
    ],
  },
  {
    name: "Amazon",
    status: "Beta",
    color: "from-amber-400 to-yellow-500",
    summary:
      "Selling Partner API integration for Seller Central accounts. Order reports are pulled on a schedule and shipping confirmations are submitted back.",
    scopes: [
      ["Orders", "Retrieve order and buyer information"],
      ["Merchant Fulfillment", "Submit shipping confirmations"],
    ],
    capabilities: [
      "Scheduled order report ingestion",
      "Shipping confirmation upload",
      "FBM order routing",
    ],
  },
  {
    name: "TikTok Shop",
    status: "Beta",
    color: "from-pink-500 to-rose-500",
    summary:
      "TikTok Shop Partner API integration covering order sync and shipping label workflows for creator-driven storefronts.",
    scopes: [
      ["order.info", "Read orders and buyer details"],
      ["logistics", "Create shipping labels and submit tracking"],
    ],
    capabilities: ["Order sync", "Label creation", "Tracking submission"],
  },
];

export default function PlatformsPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-ink-800/80">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">Platforms</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Official integrations, least-privilege access
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Every connection goes through the marketplace&apos;s own OAuth screen. You see the exact
            permissions before you approve, and you can revoke them from OwlFlow or from the
            marketplace at any time.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          {CHANNELS.map((channel) => (
            <div
              key={channel.name}
              className="overflow-hidden rounded-2xl border border-ink-600/50 bg-ink-850/60"
            >
              <div className="grid gap-8 p-6 lg:grid-cols-5 lg:p-8">
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${channel.color} text-lg font-bold text-white`}
                    >
                      {channel.name[0]}
                    </span>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{channel.name}</h2>
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          channel.status === "Live"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {channel.status}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">{channel.summary}</p>
                </div>

                <div className="lg:col-span-3">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <Lock className="h-3.5 w-3.5" /> Requested scopes
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {channel.scopes.map(([scope, description]) => (
                          <li key={scope} className="text-sm">
                            <code className="rounded bg-ink-900 px-1.5 py-0.5 text-xs text-brand-300">
                              {scope}
                            </code>
                            <span className="ml-2 text-slate-400">{description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        What OwlFlow does
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {channel.capabilities.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-ink-800/80 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Carriers & logistics
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Compare rates and buy labels without leaving the order screen.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["USPS", "UPS", "FedEx", "DHL Express", "Royal Mail", "Australia Post", "Canada Post"].map(
                  (carrier) => (
                    <span
                      key={carrier}
                      className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-slate-300"
                    >
                      {carrier}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Your own systems</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Use the OwlFlow REST API and webhooks to drive your ERP, production software or
                print-on-demand supplier from the same order data.
              </p>
              <ButtonLink href="/docs" variant="outline" className="mt-5">
                Read the API docs <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Need another one?</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                We build custom connectors for marketplaces and suppliers on the Scale plan. Tell us
                what you sell on and we will scope it.
              </p>
              <ButtonLink href="/contact" variant="outline" className="mt-5">
                Request an integration <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
