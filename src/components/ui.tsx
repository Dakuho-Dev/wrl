import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn, statusTone } from "@/lib/utils";

// ------------------------------------------------------------------ Layout

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("border border-line bg-surface", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line bg-paper-2/60 px-5 py-3.5",
        className,
      )}
    >
      <div>
        <h3 className="label !text-ink">{title}</h3>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 border-b-2 border-line-strong pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl text-ink">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
        </div>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Buttons

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-accent bg-accent text-white hover:bg-accent-2 hover:shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none",
  secondary:
    "border border-line-strong bg-surface text-ink hover:shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none",
  ghost: "border border-transparent text-ink-2 hover:bg-paper-2 hover:text-ink",
  danger:
    "border border-rose-700 bg-rose-700 text-white hover:bg-rose-800 hover:shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none",
  outline: "border border-line text-ink-2 hover:border-line-strong hover:text-ink",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cn(buttonBase, buttonStyles[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cn(buttonBase, buttonStyles[variant], className)} {...props} />;
}

// ------------------------------------------------------------------ Form fields

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-muted-2">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : null}
    </label>
  );
}

const controlBase =
  "w-full border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted-2 focus:border-line-strong focus:outline-none focus:ring-0";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlBase, "min-h-28 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(controlBase, "appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

// ------------------------------------------------------------------ Data display

/** Square, mono, bordered — reads as a data tag rather than a pill. */
export function Badge({
  children,
  tone,
  className,
}: {
  children: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider",
        tone ? statusTone(tone) : "border-line bg-paper-2 text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status}>{status.replaceAll("_", " ").toLowerCase()}</Badge>;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("scroll-thin w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "label border-b-2 border-line-strong px-4 py-2.5 text-left align-bottom",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-line px-4 py-3 align-middle text-ink-2", className)}>
      {children}
    </td>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** Ledger-style figure: mono label above a large serif number. */
export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  hint?: string;
  icon?: ReactNode;
}) {
  const positive = delta?.startsWith("+");
  return (
    <div className="border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="label">{label}</p>
        {icon ? <span className="text-muted-2">{icon}</span> : null}
      </div>
      <p className="mt-3 font-display text-[28px] leading-none text-ink">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {delta ? (
          <span
            className={cn(
              "border px-1.5 py-0.5 font-mono text-[11px]",
              positive
                ? "border-emerald-700/30 bg-emerald-700/10 text-emerald-800"
                : "border-rose-700/30 bg-rose-700/10 text-rose-800",
            )}
          >
            {delta}
          </span>
        ) : null}
        {hint ? <span className="text-xs text-muted-2">{hint}</span> : null}
      </div>
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-l-accent bg-accent-soft text-accent-ink",
    success: "border-l-emerald-700 bg-emerald-700/8 text-emerald-900",
    warning: "border-l-amber-600 bg-amber-500/10 text-amber-900",
    danger: "border-l-rose-700 bg-rose-700/8 text-rose-900",
  };
  return (
    <div className={cn("border border-line border-l-4 px-4 py-3", tones[tone])}>
      {title ? <p className="mb-1 font-display text-[15px]">{title}</p> : null}
      <div className="text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const map: Record<string, { label: string; bg: string }> = {
    ETSY: { label: "ET", bg: "bg-[#8a4b1f]" },
    SHOPIFY: { label: "SH", bg: "bg-[#2b5f3a]" },
    AMAZON: { label: "AZ", bg: "bg-[#7a5c12]" },
    TIKTOK: { label: "TT", bg: "bg-[#7a2447]" },
  };
  const item = map[platform] ?? { label: "??", bg: "bg-muted" };
  return (
    <span
      className={cn(
        "grid h-6 w-7 shrink-0 place-items-center font-mono text-[10px] font-bold tracking-tight text-white",
        item.bg,
        className,
      )}
      title={platform}
    >
      {item.label}
    </span>
  );
}
