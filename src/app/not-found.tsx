import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl text-muted-2">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-muted">
        The page you are looking for does not exist, or you do not have access to it.
      </p>
      <div className="mt-7 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-accent"
        >
          Back to home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-ink-2 transition hover:border-accent"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
