import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-900/40">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" aria-hidden="true">
          <path
            d="M4 8.5C4 6 6 4 8.5 4h7C18 4 20 6 20 8.5V13c0 4.4-3.6 8-8 8s-8-3.6-8-8V8.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <circle cx="9" cy="10.5" r="1.8" fill="currentColor" />
          <circle cx="15" cy="10.5" r="1.8" fill="currentColor" />
          <path d="M12 13.5v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">
        Owl<span className="text-brand-400">Flow</span>
      </span>
    </Link>
  );
}
