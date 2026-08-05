import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "OwlFlow",
    links: [
      { href: "/", label: "Home" },
      { href: "/features", label: "Features" },
      { href: "/platforms", label: "Platforms" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Product & Services",
    links: [
      { href: "/features#sync", label: "Data synchronization" },
      { href: "/features#automation", label: "Workflow automation" },
      { href: "/features#shipping", label: "Order processing & shipping" },
      { href: "/features#api", label: "API integrations" },
    ],
  },
  {
    title: "Help & Support",
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
  return (
    <footer className="border-t border-ink-700/60 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              OwlFlow is an order management and fulfillment automation platform for multichannel
              sellers. Connect your stores once and let the workflow run itself.
            </p>
            <div className="mt-5 space-y-2 text-sm text-slate-400">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-400" /> support@owlflow.io
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-400" /> +84 28 7300 1234
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-400" /> Ho Chi Minh City, Vietnam
              </p>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="text-sm font-semibold text-white">{column.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition hover:text-brand-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-3 border-t border-ink-700/60 pt-6">
          <p className="text-xs leading-relaxed text-slate-500">
            The term &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc. This application uses the Etsy
            API but is not endorsed or certified by Etsy, Inc. Shopify, Amazon and TikTok Shop are
            trademarks of their respective owners.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} OwlFlow. All rights reserved.
            </p>
            <div className="flex gap-4 text-xs text-slate-500">
              <Link href="/terms" className="hover:text-slate-300">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-slate-300">
                Privacy
              </Link>
              <Link href="/security" className="hover:text-slate-300">
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
