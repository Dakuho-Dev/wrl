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

/**
 * Floating pill nav: detached from the top edge so the page reads as a stack of
 * cards rather than a document with a toolbar bolted on.
 */
export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="shadow-card mx-auto max-w-7xl rounded-2xl border border-line bg-surface/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-6 pl-4 pr-3 sm:pl-5 sm:pr-4">
          <Logo />

          <nav className="hidden items-center gap-0.5 lg:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[13.5px] font-medium transition",
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-ink-2 hover:bg-paper-2 hover:text-accent",
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
                className="shadow-hard-accent rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-accent-2"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-ink-2 transition hover:text-accent"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="shadow-hard-accent rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-accent-2"
                >
                  Start free
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-line px-3 pb-3 lg:hidden">
            <div className="pt-2">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-sm font-medium text-ink-2 hover:bg-accent-soft hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex-1 rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
