import type { Metadata } from "next";
import { Check } from "lucide-react";

import { ButtonLink } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatNumber, parseJson } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple per-shop pricing. Start free, upgrade when your order volume grows.",
};

export const dynamic = "force-dynamic";

const FAQS = [
  {
    q: "Is there really a free plan?",
    a: "Yes. The Starter plan is free forever for one connected shop and up to 100 orders per month. No credit card is required to sign up.",
  },
  {
    q: "What counts as an order?",
    a: "Any order imported from a connected marketplace during the billing month. Re-syncing an existing order does not count twice.",
  },
  {
    q: "Can I change plans mid-cycle?",
    a: "Yes. Upgrades take effect immediately and are prorated. Downgrades apply at the start of your next billing period.",
  },
  {
    q: "Do you charge for shipping labels?",
    a: "DKH does not add a markup. You pay the carrier's rate directly through your own carrier account.",
  },
];

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({
    where: { isPublic: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="surface-rule pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Pricing</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Pay for the volume you actually ship
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Every plan includes order sync, the automation engine and tracking upload. You only move
            up when you outgrow the limits.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan, index) => {
              const features = parseJson<string[]>(plan.features, []);
              const highlighted = index === 1;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-none border p-7 ${
                    highlighted
                      ? "border-accent bg-gradient-to-b from-accent to-paper-2"
                      : "border-line bg-surface"
                  }`}
                >
                  {highlighted ? (
                    <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink">
                      Most popular
                    </span>
                  ) : null}

                  <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-ink">
                      ${plan.priceMonthly}
                    </span>
                    <span className="text-sm text-muted">/ month</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-2">
                    {plan.priceYearly > 0
                      ? `or $${plan.priceYearly}/year — two months free`
                      : "Free forever"}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-none border border-line bg-paper-2 p-3 text-center">
                    <div>
                      <p className="text-lg font-semibold text-ink">
                        {formatNumber(plan.orderLimit)}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-muted-2">
                        orders / mo
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-ink">{plan.shopLimit}</p>
                      <p className="text-[11px] uppercase tracking-wide text-muted-2">shops</p>
                    </div>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <ButtonLink
                    href="/register"
                    variant={highlighted ? "primary" : "outline"}
                    className="mt-7 w-full py-2.5"
                  >
                    {plan.priceMonthly === 0 ? "Start free" : `Choose ${plan.name}`}
                  </ButtonLink>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-none border border-line bg-surface p-6 text-center">
            <h3 className="font-semibold text-ink">Enterprise & custom volume</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">
              Above 25,000 orders a month, or need a private connector, dedicated infrastructure or
              a signed DPA? We will build a plan around your operation.
            </p>
            <ButtonLink href="/contact" variant="outline" className="mt-4">
              Contact sales
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Billing questions</h2>
          <div className="mt-8 space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-none border border-line bg-surface p-5">
                <h3 className="font-medium text-ink">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
