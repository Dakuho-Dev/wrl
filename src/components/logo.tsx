import Link from "next/link";

import { cn } from "@/lib/utils";

/** Monogram tile + wordmark. */
export function Logo({
  className,
  href = "/",
  subtitle = true,
  onDark = false,
}: {
  className?: string;
  href?: string;
  subtitle?: boolean;
  onDark?: boolean;
}) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-3", className)}>
      <span className="bg-accent-sweep shadow-hard-accent grid h-9 w-9 place-items-center rounded-lg font-mono text-[12px] font-bold leading-none tracking-tight text-white transition group-hover:-translate-y-px">
        DKH
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-[17px] font-bold tracking-tight",
            onDark ? "text-white" : "text-ink",
          )}
        >
          dkh<span className={onDark ? "text-violet-300" : "text-accent"}>.io.vn</span>
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-1 block font-mono text-[9px] uppercase tracking-[0.2em]",
              onDark ? "text-slate-400" : "text-muted-2",
            )}
          >
            Order Operations
          </span>
        ) : null}
      </span>
    </Link>
  );
}
