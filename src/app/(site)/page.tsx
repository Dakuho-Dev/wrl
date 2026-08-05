import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Cable,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Truck,
  Workflow,
  Zap,
} from "lucide-react";

import { ButtonLink } from "@/components/ui";

const FEATURES = [
  {
    icon: RefreshCw,
    title: "Data Synchronization",
    body: "Orders, listings, inventory and customer records stay in sync across every connected marketplace — in near real time, with automatic retry and rate-limit handling.",
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    body: "Build if-this-then-that rules for order routing, tagging, holds and notifications. No code, no spreadsheets, no manual copy-paste.",
  },
  {
    icon: Truck,
    title: "Order Processing & Shipping",
    body: "Intelligent routing to the right fulfillment location, bulk label generation and one-click tracking upload back to the marketplace.",
  },
  {
    icon: Gauge,
    title: "Real-Time Tracking",
    body: "Follow every order from creation to delivery with a unified timeline, carrier events and exception alerts when something goes wrong.",
  },
  {
    icon: Cable,
    title: "API Integrations",
    body: "Official marketplace APIs plus a REST API and webhooks of our own, so your ERP, print partner or 3PL can plug straight in.",
  },
  {
    icon: BarChart3,
    title: "Optimization & Analytics",
    body: "Revenue, fulfillment speed and bottleneck reporting across channels, so you know exactly where the queue is stalling.",
  },
];

const PLATFORMS = [
  { name: "Etsy", note: "Receipts, listings, tracking upload", color: "from-orange-500 to-amber-500" },
  { name: "Shopify", note: "Orders, products, fulfillments", color: "from-emerald-500 to-green-600" },
  { name: "Amazon", note: "Seller Central order reports", color: "from-amber-400 to-yellow-500" },
  { name: "TikTok Shop", note: "Order sync & shipping labels", color: "from-pink-500 to-rose-500" },
];

const STEPS = [
  {
    step: "01",
    title: "Connect your shop",
    body: "Authorize OwlFlow through the marketplace's official OAuth screen. We never ask for your store password and you can revoke access at any time.",
  },
  {
    step: "02",
    title: "Orders flow in automatically",
    body: "Historical and new orders are imported with buyer details, personalization notes, shipping address and payment status.",
  },
  {
    step: "03",
    title: "Automate the boring parts",
    body: "Rules move orders through production, generate labels and put anything unusual on hold for a human to review.",
  },
  {
    step: "04",
    title: "Tracking goes back to the buyer",
    body: "As soon as a label exists, the tracking number is pushed back to the marketplace and the buyer is notified.",
  },
];

const METRICS = [
  { value: "4.6M+", label: "orders processed" },
  { value: "12,400", label: "connected shops" },
  { value: "99.95%", label: "sync uptime" },
  { value: "8.4h", label: "saved per week / seller" },
];

export default function HomePage() {
  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-brand-700/25 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1.5 text-xs font-medium text-brand-200">
                <Zap className="h-3.5 w-3.5" />
                Multichannel order automation
              </span>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Automate your entire{" "}
                <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
                  order lifecycle
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
                From synchronization and processing to shipping. OwlFlow connects Etsy, Shopify,
                Amazon and TikTok Shop into one operations console — so your team stops copying
                order data between tabs and starts shipping faster.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ButtonLink href="/register" className="px-6 py-3 text-base">
                  Start free — no card required
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href="/features" variant="outline" className="px-6 py-3 text-base">
                  See how it works
                </ButtonLink>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
                {["Official marketplace APIs", "GDPR-ready", "Revoke access anytime"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Console preview */}
            <div className="relative">
              <div className="animate-float-slow rounded-2xl border border-ink-600/60 bg-ink-900/90 p-4 shadow-2xl shadow-black/60 backdrop-blur">
                <div className="flex items-center gap-2 border-b border-ink-700 pb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 text-xs text-slate-500">owlflow.io/dashboard/orders</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "New", value: "18" },
                    { label: "In production", value: "42" },
                    { label: "Shipped today", value: "37" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-ink-850 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  {[
                    { id: "#2481930", buyer: "Emma Johnson", state: "Shipped", tone: "text-violet-300 bg-violet-500/10" },
                    { id: "#2481929", buyer: "Liam Davis", state: "Processing", tone: "text-amber-300 bg-amber-500/10" },
                    { id: "#2481928", buyer: "Ava Wilson", state: "New", tone: "text-sky-300 bg-sky-500/10" },
                    { id: "#2481927", buyer: "Noah Miller", state: "Delivered", tone: "text-emerald-300 bg-emerald-500/10" },
                  ].map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-xl bg-ink-850/70 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-6 w-6 place-items-center rounded-md bg-orange-500 text-[10px] font-bold text-white">
                          E
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-200">{row.id}</p>
                          <p className="text-[11px] text-slate-500">{row.buyer}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${row.tone}`}>
                        {row.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-ink-600/60 bg-ink-850/95 px-4 py-3 shadow-xl backdrop-blur sm:block">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Automation ran</p>
                <p className="mt-0.5 text-sm font-medium text-white">
                  Tracking pushed to Etsy · 37 orders
                </p>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-600/50 bg-ink-600/40 lg:grid-cols-4">
            {METRICS.map((metric) => (
              <div key={metric.label} className="bg-ink-900 px-6 py-7 text-center">
                <p className="text-3xl font-semibold tracking-tight text-white">{metric.value}</p>
                <p className="mt-1 text-sm text-slate-400">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Features */}
      <section id="features" className="border-t border-ink-800/80 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Everything you need to run fulfillment
            </h2>
            <p className="mt-4 text-slate-400">
              Six building blocks that replace the spreadsheets, browser tabs and copy-paste steps
              between a paid order and a delivered parcel.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-ink-600/50 bg-ink-850/60 p-6 transition hover:border-brand-500/40 hover:bg-ink-850"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/20 transition group-hover:bg-brand-500/20">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Platforms */}
      <section id="platforms" className="border-t border-ink-800/80 bg-ink-900/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
                Supported sales channels
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Connect the marketplaces you already sell on
              </h2>
              <p className="mt-4 text-slate-400">
                Each channel connects through its official API and OAuth flow. You approve the exact
                permissions, and you can disconnect a shop from your dashboard at any time — we
                delete the stored tokens immediately.
              </p>
              <ButtonLink href="/platforms" variant="outline" className="mt-7">
                Explore integrations
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {PLATFORMS.map((platform) => (
                <div
                  key={platform.name}
                  className="rounded-2xl border border-ink-600/50 bg-ink-850/70 p-5"
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${platform.color} text-sm font-bold text-white`}
                  >
                    {platform.name[0]}
                  </span>
                  <h3 className="mt-4 font-semibold text-white">{platform.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{platform.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- How it works */}
      <section className="border-t border-ink-800/80 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Live in under ten minutes
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item) => (
              <div key={item.step} className="relative rounded-2xl border border-ink-600/50 bg-ink-850/50 p-6">
                <span className="text-4xl font-bold text-ink-600">{item.step}</span>
                <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Partners */}
      <section className="border-t border-ink-800/80 bg-ink-900/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Cable,
                title: "RESTful API",
                body: "Full read/write access to orders, shipments and shops with scoped API keys and signed webhooks.",
              },
              {
                icon: Boxes,
                title: "Custom solutions",
                body: "Bespoke connectors for your ERP, print-on-demand supplier or in-house production system.",
              },
              {
                icon: Truck,
                title: "Logistics partners",
                body: "Rate shopping and label purchase across USPS, UPS, FedEx, DHL and regional carriers.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-ink-600/50 bg-ink-850/60 p-6">
                <item.icon className="h-6 w-6 text-brand-400" />
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Trust */}
      <section className="border-t border-ink-800/80 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-ink-600/50 bg-gradient-to-br from-ink-850 to-ink-900 p-8 sm:p-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                  Built for marketplace compliance
                </h2>
                <p className="mt-4 leading-relaxed text-slate-400">
                  OwlFlow only requests the minimum API scopes needed to import orders and upload
                  tracking. Access tokens are encrypted at rest, buyer data is never sold or shared
                  with third parties, and sellers can export or delete their data on request.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/privacy"
                    className="rounded-xl border border-ink-600 px-4 py-2 text-sm text-slate-200 hover:border-brand-500/50"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/security"
                    className="rounded-xl border border-ink-600 px-4 py-2 text-sm text-slate-200 hover:border-brand-500/50"
                  >
                    Security Policy
                  </Link>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  "OAuth 2.0 with PKCE — we never see your marketplace password",
                  "Least-privilege API scopes, listed before you authorize",
                  "Tokens encrypted at rest, revoked instantly on disconnect",
                  "Full audit log of every sync and automation run",
                  "Data export and deletion available from the dashboard",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- CTA */}
      <section className="border-t border-ink-800/80 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Stop managing orders. Start shipping them.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Create a free account, connect your first shop and watch your orders appear in a single
            queue within minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/register" className="px-6 py-3 text-base">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline" className="px-6 py-3 text-base">
              Talk to us
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
