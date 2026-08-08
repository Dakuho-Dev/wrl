import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Lock, X } from "lucide-react";

import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "What we access",
  description:
    "The exact Etsy Open API scopes DKH requests, the endpoints it calls, and the things it deliberately does not do.",
};

const SCOPES = [
  {
    scope: "shops_r",
    access: "Read",
    what: "Your shop id, name, currency and URL",
    why: "So the connection can be labelled in your dashboard and orders can be attributed to the right shop.",
  },
  {
    scope: "listings_r",
    access: "Read",
    what: "Active listings: title, SKU, price, quantity, image",
    why: "So an order line can be matched to the product it refers to, and so you can see stock levels next to the queue.",
  },
  {
    scope: "transactions_r",
    access: "Read",
    what: "Receipts: buyer name, shipping address, line items, personalisation, totals, payment and shipment state",
    why: "This is the order data itself — without it there is nothing to manage.",
  },
  {
    scope: "transactions_w",
    access: "Write",
    what: "Submit a tracking number against a receipt",
    why: "When you record a shipment, the carrier and tracking number are sent to Etsy so the order is marked shipped on Etsy.",
  },
];

const ENDPOINTS = [
  ["GET", "/v3/application/users/{user_id}/shops", "Identify the shop you authorised"],
  ["GET", "/v3/application/shops/{shop_id}/listings/active", "Import listings"],
  ["GET", "/v3/application/shops/{shop_id}/receipts", "Import orders"],
  ["POST", "/v3/application/shops/{shop_id}/receipts/{receipt_id}/tracking", "Upload tracking"],
  ["POST", "/v3/public/oauth/token", "Exchange and refresh the access token"],
];

const NOT_DOING = [
  "Message your buyers. DKH never emails, texts or otherwise contacts an Etsy member. Uploading the tracking number is the only buyer-visible effect, and Etsy sends that notification, not us.",
  "Create or edit listings. We hold no write access to your catalogue — listings are read-only.",
  "Change your shop settings, policies or prices.",
  "Scrape Etsy. Every call is to the documented Open API v3 with a token you granted.",
  "Sell, share or repurpose buyer data. It is used to fulfil your orders and nothing else.",
  "Use Etsy data for analytics products, model training or licensing.",
];

export default function PlatformsPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b-2 border-line-strong">
        <div className="surface-rule pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="label">What we access</p>
          <h1 className="mt-4 text-4xl text-ink sm:text-5xl">
            Four scopes, listed in full
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            DKH integrates with one marketplace: Etsy, through the Etsy Open API v3. You approve
            the scopes on Etsy&rsquo;s own authorisation screen, and you can revoke them from Etsy
            or from DKH at any time.
          </p>
        </div>
      </section>

      <section className="border-b-2 border-line-strong py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="flex items-center gap-2 text-2xl text-ink">
            <Lock className="h-5 w-5 text-accent" /> Requested scopes
          </h2>

          <div className="mt-6 divide-y-2 divide-line border-y-2 border-line-strong">
            {SCOPES.map((entry) => (
              <div key={entry.scope} className="grid gap-4 py-6 sm:grid-cols-3">
                <div>
                  <code className="font-mono text-sm text-accent">{entry.scope}</code>
                  <span
                    className={`ml-2 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${
                      entry.access === "Read"
                        ? "border-emerald-800/25 bg-emerald-700/10 text-emerald-900"
                        : "border-amber-800/25 bg-amber-600/12 text-amber-900"
                    }`}
                  >
                    {entry.access}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-ink">{entry.what}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{entry.why}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted">
            That is the complete list. DKH does not request <code>listings_w</code>,{" "}
            <code>shops_w</code>, <code>email_r</code>, <code>billing_r</code>,{" "}
            <code>cart_r</code>, <code>favorites_r</code>, <code>feedback_r</code>,{" "}
            <code>profile_r</code> or <code>recommend_r</code>, because no feature needs them.
          </p>
        </div>
      </section>

      <section className="border-b-2 border-line-strong bg-paper-2 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl text-ink">Endpoints we call</h2>
          <div className="scroll-thin mt-6 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr>
                  {["Method", "Endpoint", "Purpose"].map((head) => (
                    <th key={head} className="label border-y-2 border-line-strong px-4 py-3 text-left">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map(([method, endpoint, purpose]) => (
                  <tr key={endpoint} className="border-b border-line">
                    <td className="px-4 py-3 font-mono text-xs text-accent">{method}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">{endpoint}</td>
                    <td className="px-4 py-3 text-muted">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-line-strong py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl text-ink">What DKH deliberately does not do</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {NOT_DOING.map((item) => (
              <li key={item} className="flex items-start gap-3 py-4 text-sm leading-relaxed text-ink-2">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paper-2 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl text-ink">Revoking access</h2>
              <ul className="mt-4 space-y-3">
                {[
                  "Disconnect the shop in DKH — the stored tokens are deleted immediately and syncing stops.",
                  "Or revoke DKH from your Etsy account settings, which has the same effect.",
                  "Orders already imported stay in your DKH account until you delete them or your account.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl text-ink">Other marketplaces</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                DKH supports Etsy only. We are not going to list channels we have not built — if
                you need Shopify, Amazon or TikTok Shop today, DKH is not the tool for you yet.
                Tell us what you sell on and we will say honestly whether it is on the roadmap.
              </p>
              <ButtonLink href="/contact" variant="outline" className="mt-5">
                Ask about a channel <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>

          <p className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-muted">
            The term &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc. This Application uses
            Etsy&rsquo;s API, but is not endorsed or certified by Etsy. See our{" "}
            <Link href="/terms" className="text-accent underline">
              Terms
            </Link>{" "}
            for the full disclaimer.
          </p>
        </div>
      </section>
    </>
  );
}
