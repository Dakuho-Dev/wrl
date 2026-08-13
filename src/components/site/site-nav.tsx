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
 * Navigation lives in a fixed rail down the left edge on desktop, and collapses
 * to a top bar below it. The rail keeps the whole map of the site visible while
 * you read, which a horizontal bar cannot do without a dropdown.
 */
export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const primary = signedIn ? (
    <Link
      href="/dashboard"
      className="shadow-hard-accent block rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-accent-2"
    >
      Dashboard →
    </Link>
  ) : (
    <>
      <Link
        href="/register"
        className="shadow-hard-accent block rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-accent-2"
      >
        Start free
      </Link>
      <Link
        href="/login"
        className="block rounded-xl border border-line px-4 py-2.5 text-center text-sm font-medium text-ink-2 transition hover:border-accent hover:text-accent"
      >
        Log in
      </Link>
    </>
  );

  const navList = (
    <nav className="space-y-1">
      {LINKS.map((link, index) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition",
              active
                ? "bg-accent-soft text-accent"
                : "text-ink-2 hover:bg-paper-2 hover:text-accent",
            )}
          >
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums",
                active ? "text-accent" : "text-muted-2",
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ---------------------------------------------------- Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/80 backdrop-blur-xl lg:flex">
        <div className="px-5 py-6">
          <Logo />
        </div>

        <div className="flex-1 overflow-y-auto px-3">{navList}</div>

        <div className="space-y-2 border-t border-line p-4">{primary}</div>
      </aside>

      {/* ------------------------------------------------------ Mobile bar */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink"
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-line px-3 pb-4 pt-2">
            {navList}
            <div className="mt-3 space-y-2">{primary}</div>
          </div>
        ) : null}
      </header>
    </>
  );
}
