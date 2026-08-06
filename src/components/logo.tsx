import Link from "next/link";

import { cn } from "@/lib/utils";

/** Monogram tile + wordmark. No illustration, no gradient. */
export function Logo({
  className,
  href = "/",
  subtitle = true,
}: {
  className?: string;
  href?: string;
  subtitle?: boolean;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <span className="grid h-9 w-9 place-items-center bg-ink font-mono text-[13px] font-bold leading-none tracking-tight text-white">
        DKH
      </span>
      <span className="leading-none">
        <span className="block font-mono text-[15px] font-bold uppercase tracking-[0.18em] text-ink">
          dkh<span className="text-accent">.io</span>
        </span>
        {subtitle ? (
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-muted-2">
            Order Operations
          </span>
        ) : null}
      </span>
    </Link>
  );
}
