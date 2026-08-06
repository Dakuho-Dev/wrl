import Link from "next/link";

import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { href: "/features", label: "Features" },
      { href: "/platforms", label: "Platforms" },
      { href: "/pricing", label: "Pricing" },
      { href: "/register", label: "Create account" },
    ],
  },
  {
    title: "Capabilities",
    links: [
      { href: "/features#sync", label: "Data synchronization" },
      { href: "/features#automation", label: "Workflow automation" },
      { href: "/features#shipping", label: "Processing & shipping" },
      { href: "/features#api", label: "API integrations" },
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

const CONTACT = [
  ["Support", "support@dkh.io"],
  ["Sales", "sales@dkh.io"],
  ["Phone", "+84 28 7300 1234"],
  ["Office", "Ho Chi Minh City, Vietnam"],
];

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-line-strong bg-paper-2">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              DKH is an order management and fulfillment automation platform for multichannel
              sellers. Connect your stores once and let the workflow run itself.
            </p>

            <dl className="mt-6 divide-y divide-line border-y border-line">
              {CONTACT.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="label">{label}</dt>
                  <dd className="text-sm text-ink-2">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-8 sm:grid-cols-4 lg:col-span-8">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h4 className="label border-b border-line pb-2">{column.title}</h4>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-2 underline decoration-transparent underline-offset-4 transition hover:decoration-accent"
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

        <div className="mt-10 space-y-3 border-t-2 border-line-strong pt-5">
          <p className="max-w-4xl text-xs leading-relaxed text-muted">
            The term &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc. This application uses the Etsy
            API but is not endorsed or certified by Etsy, Inc. Shopify, Amazon and TikTok Shop are
            trademarks of their respective owners.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
              © {new Date().getFullYear()} dkh.io — All rights reserved
            </p>
            <div className="flex gap-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
              <Link href="/terms" className="hover:text-ink">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-ink">
                Privacy
              </Link>
              <Link href="/security" className="hover:text-ink">
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
