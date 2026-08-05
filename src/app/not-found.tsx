import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-semibold tracking-tight text-ink-600">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-white">Page not found</h1>
      <p className="mt-2 max-w-md text-slate-400">
        The page you are looking for does not exist, or you do not have access to it.
      </p>
      <div className="mt-7 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500"
        >
          Back to home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-ink-600 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-brand-500/60"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
