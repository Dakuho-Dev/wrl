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
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      {/* Announcement strip — sets the "operations desk" tone before the nav. */}
      <div className="bg-navy hidden text-white sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] sm:px-6 lg:px-8">
          <span>Order management for Etsy sellers</span>
          <span className="text-slate-400">Etsy Open API v3 · No scraping</span>
        </div>
      </div>

      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-[13.5px] font-medium transition",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-ink-2 hover:bg-accent-soft/60 hover:text-accent",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="shadow-hard-accent rounded-lg bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-accent-2"
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 transition hover:text-accent"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="shadow-hard-accent rounded-lg bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-accent-2"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink lg:hidden"
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-line bg-surface lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-3 text-sm font-medium text-ink-2 hover:bg-accent-soft hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 py-3">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex-1 rounded-lg border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white"
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
