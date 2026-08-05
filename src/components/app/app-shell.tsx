"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";

import { Logo } from "@/components/logo";
import { cn, initials } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: string; badge?: number };
export type NavGroup = { title: string; items: NavItem[] };

/** Icon names are resolved here so the server can pass plain strings. */
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  CreditCard,
  FileCog,
  Home,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Package,
  PlugZap,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Workflow,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  activity: Activity,
  analytics: BarChart3,
  bell: Bell,
  boxes: Boxes,
  billing: CreditCard,
  config: FileCog,
  home: Home,
  key: KeyRound,
  dashboard: LayoutDashboard,
  support: LifeBuoy,
  package: Package,
  plug: PlugZap,
  settings: Settings,
  shield: ShieldCheck,
  bag: ShoppingBag,
  store: Store,
  truck: Truck,
  users: Users,
  workflow: Workflow,
};

export function AppShell({
  groups,
  user,
  variant,
  notifications,
  children,
}: {
  groups: NavGroup[];
  user: { name: string; email: string; role: string; plan?: string | null };
  variant: "seller" | "admin";
  notifications?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin" ? pathname === href : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-800 px-5">
        <Logo href={variant === "admin" ? "/admin" : "/dashboard"} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-400 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {variant === "admin" ? (
        <div className="mx-4 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-amber-300">
          Administration
        </div>
      ) : null}

      <nav className="scroll-thin flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? Home;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-brand-600/15 text-white ring-1 ring-inset ring-brand-500/30"
                        : "text-slate-400 hover:bg-ink-800/70 hover:text-white",
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-brand-400" : "")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-800 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-ink-800/70 hover:text-white"
        >
          <Home className="h-4.5 w-4.5" />
          Back to website
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ink-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-ink-800 bg-ink-900/60 lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Mobile sidebar */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-ink-800 bg-ink-900">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-ink-800 bg-ink-950/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-ink-600 text-slate-300 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <Link
            href={variant === "admin" ? "/admin/logs" : "/dashboard/notifications"}
            className="relative grid h-9 w-9 place-items-center rounded-xl border border-ink-700 text-slate-400 transition hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {notifications ? (
              <span className="absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                {notifications}
              </span>
            ) : null}
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex items-center gap-2.5 rounded-xl border border-ink-700 py-1.5 pl-1.5 pr-3 transition hover:border-ink-600"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-xs font-semibold text-white">
                {initials(user.name)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-medium leading-tight text-white">
                  {user.name}
                </span>
                <span className="block text-[11px] leading-tight text-slate-500">
                  {user.plan ?? user.role}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-ink-700 bg-ink-850 shadow-2xl">
                  <div className="border-b border-ink-700 px-4 py-3">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href={variant === "admin" ? "/admin/settings" : "/dashboard/settings"}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-ink-800 hover:text-white"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    {user.role === "ADMIN" ? (
                      <Link
                        href={variant === "admin" ? "/dashboard" : "/admin"}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-ink-800 hover:text-white"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {variant === "admin" ? "Seller dashboard" : "Admin panel"}
                      </Link>
                    ) : null}
                    <form action="/api/auth/logout" method="post">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </form>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
