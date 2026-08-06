"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  CreditCard,
  FileCog,
  Home,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Package,
  PlugZap,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { cn, initials } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: string; badge?: number };
export type NavGroup = { title: string; items: NavItem[] };

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

  const activeLabel =
    groups.flatMap((group) => group.items).find((item) => isActive(item.href))?.label ?? "";

  const sidebar = (
    <div className="flex h-full flex-col bg-paper-2">
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b-2 border-line-strong px-5">
        <Logo href={variant === "admin" ? "/admin" : "/dashboard"} subtitle={false} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {variant === "admin" ? (
        <div className="border-b border-line bg-ink px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white">
          Administration
        </div>
      ) : null}

      <nav className="scroll-thin flex-1 overflow-y-auto py-2">
        {groups.map((group) => (
          <div key={group.title} className="mb-1">
            <p className="label border-b border-line px-5 py-2">{group.title}</p>
            <div>
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? Home;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 border-l-[3px] px-4 py-2.5 text-sm transition",
                      active
                        ? "border-accent bg-surface font-medium text-ink"
                        : "border-transparent text-ink-2 hover:bg-surface/60 hover:text-ink",
                    )}
                  >
                    <Icon
                      className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-muted-2")}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="border border-line-strong px-1.5 font-mono text-[10px] text-ink">
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

      <div className="border-t border-line">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition hover:text-ink"
        >
          <Home className="h-4 w-4" />
          Public site
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-64 shrink-0 border-r-2 border-line-strong lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r-2 border-line-strong">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-[68px] items-center gap-3 border-b-2 border-line-strong bg-paper px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center border border-line-strong text-ink lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <p className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-muted sm:block">
            {variant === "admin" ? "Admin" : "Console"}
            {activeLabel ? <span className="text-ink"> / {activeLabel}</span> : null}
          </p>

          <div className="flex-1" />

          <Link
            href={variant === "admin" ? "/admin/logs" : "/dashboard/notifications"}
            className="relative grid h-9 w-9 place-items-center border border-line text-muted transition hover:border-line-strong hover:text-ink"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notifications ? (
              <span className="absolute -right-2 -top-2 grid h-4.5 min-w-4.5 place-items-center bg-accent px-1 font-mono text-[10px] text-white">
                {notifications}
              </span>
            ) : null}
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex items-center gap-2.5 border border-line py-1.5 pl-1.5 pr-3 transition hover:border-line-strong"
            >
              <span className="grid h-7 w-7 place-items-center bg-ink font-mono text-[10px] font-bold text-white">
                {initials(user.name)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-medium leading-tight text-ink">{user.name}</span>
                <span className="block font-mono text-[10px] uppercase leading-tight tracking-wider text-muted-2">
                  {user.plan ?? user.role}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-2" />
            </button>

            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-60 border-2 border-line-strong bg-surface shadow-hard">
                  <div className="border-b border-line px-4 py-3">
                    <p className="text-sm font-medium text-ink">{user.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted">{user.email}</p>
                  </div>
                  <div className="divide-y divide-line">
                    <Link
                      href={variant === "admin" ? "/admin/settings" : "/dashboard/settings"}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    {user.role === "ADMIN" ? (
                      <Link
                        href={variant === "admin" ? "/dashboard" : "/admin"}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {variant === "admin" ? "Seller console" : "Admin panel"}
                      </Link>
                    ) : null}
                    <form action="/api/auth/logout" method="post">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-rose-800 hover:bg-rose-700/8"
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

        <main className="flex-1 px-4 py-7 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
