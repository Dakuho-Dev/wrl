"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/platforms", label: "What we access" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-2 border-line-strong bg-paper">
      {/* Ticker strip — sets the "operations desk" tone before the nav itself. */}
      <div className="hidden border-b border-line bg-ink px-4 py-1.5 text-white sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
          <span>Order management for Etsy sellers</span>
          <span className="text-paper-3">Etsy Open API v3 · No scraping</span>
        </div>
      </div>

      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center lg:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "border-b-2 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition",
                  active
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:border-line hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="border border-accent bg-accent px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white transition-all hover:shadow-hard-sm"
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 underline decoration-line underline-offset-4 transition hover:decoration-accent"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="border border-accent bg-accent px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white transition-all hover:shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center border border-line-strong text-ink lg:hidden"
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-line bg-surface lg:hidden">
          <div className="mx-auto max-w-7xl divide-y divide-line px-4 sm:px-6">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 py-4">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="flex-1 bg-accent px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-white"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex-1 border border-line-strong px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 bg-accent px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-white"
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
