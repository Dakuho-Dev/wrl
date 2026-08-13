import Link from "next/link";

import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site-config";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/platforms", label: "What we access" },
      { href: "/pricing", label: "Pricing" },
      { href: "/register", label: "Create account" },
    ],
  },
  {
    title: "Capabilities",
    links: [
      { href: "/features#sync", label: "Order synchronisation" },
      { href: "/features#automation", label: "Workflow rules" },
      { href: "/features#shipping", label: "Shipping & tracking" },
      { href: "/features#api", label: "REST API" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/support", label: "Support center" },
      { href: "/faq", label: "FAQ" },
      { href: "/docs", label: "Documentation" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/security", label: "Security Policy" },
      { href: "/privacy#data-deletion", label: "Data deletion" },
    ],
  },
];

export function SiteFooter() {
  const contact = [
    ["Support", siteConfig.supportEmail],
    ...(siteConfig.businessPhone ? [["Phone", siteConfig.businessPhone]] : []),
    ...(siteConfig.businessAddress ? [["Address", siteConfig.businessAddress]] : []),
  ] as Array<[string, string]>;

  return (
    <footer className="bg-deep text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo onDark />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
              WrL is an order management tool for Etsy sellers. It reads your orders through the
              Etsy Open API, gives you a production queue, and uploads tracking numbers back to
              Etsy when you ship.
            </p>

            <dl className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {contact.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="label !text-violet-300">{label}</dt>
                  <dd className="text-sm text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-8 sm:grid-cols-4 lg:col-span-8">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h4 className="label !text-violet-300">{column.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-400 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          {/* The Etsy trademark notice lives in the scopes band on the home page. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
              © {new Date().getFullYear()} {siteConfig.domain} — All rights reserved
            </p>
            <div className="flex gap-5 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <Link href="/terms" className="transition hover:text-white">
                Terms
              </Link>
              <Link href="/privacy" className="transition hover:text-white">
                Privacy
              </Link>
              <Link href="/security" className="transition hover:text-white">
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
