import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[130px]" />

      <header className="relative border-b border-ink-800/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/" className="text-sm text-slate-400 transition hover:text-white">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-14">{children}</main>

      <footer className="relative border-t border-ink-800/60 py-5">
        <p className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} OwlFlow ·{" "}
          <Link href="/terms" className="hover:text-slate-300">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:text-slate-300">
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  );
}
