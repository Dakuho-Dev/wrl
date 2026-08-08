import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Soft azure wash behind the form, so signing in feels part of the product. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_32rem_at_50%_-10%,rgba(22,104,216,0.16),transparent)]"
        aria-hidden
      />

      <header className="relative border-b border-line bg-surface/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/" className="text-sm text-muted transition hover:text-ink">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-14">{children}</main>

      <footer className="relative border-t border-line py-5">
        <p className="text-center text-xs text-muted-2">
          © {new Date().getFullYear()} DKH ·{" "}
          <Link href="/terms" className="hover:text-ink-2">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:text-ink-2">
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  );
}
