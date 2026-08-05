import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn, statusTone } from "@/lib/utils";

// ------------------------------------------------------------------ Layout

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-600/50 bg-ink-850/70 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
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
        "flex flex-wrap items-start justify-between gap-3 border-b border-ink-600/40 px-5 py-4",
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------------ Buttons

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-900/30 border border-brand-500/50",
  secondary: "bg-ink-700 text-slate-100 hover:bg-ink-600 border border-ink-600",
  ghost: "text-slate-300 hover:bg-ink-800 hover:text-white border border-transparent",
  danger: "bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-500/50",
  outline: "border border-ink-600 text-slate-200 hover:border-brand-500/60 hover:text-white",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60";

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
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-rose-400">{error}</span> : null}
    </label>
  );
}

const controlBase =
  "w-full rounded-xl border border-ink-600 bg-ink-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tone ? statusTone(tone) : "bg-ink-700/60 text-slate-300 ring-ink-600",
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
        "border-b border-ink-600/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-ink-700/40 px-4 py-3 align-middle text-slate-200", className)}>
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
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {description ? <p className="max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

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
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {icon ? <span className="text-brand-400">{icon}</span> : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {delta ? (
          <span
            className={cn(
              "text-xs font-medium",
              positive ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {delta}
          </span>
        ) : null}
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
    </Card>
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
    info: "border-brand-500/30 bg-brand-500/10 text-brand-100",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    danger: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone])}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="text-[13px] leading-relaxed opacity-90">{children}</div>
    </div>
  );
}

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const map: Record<string, { label: string; bg: string }> = {
    ETSY: { label: "E", bg: "bg-orange-500" },
    SHOPIFY: { label: "S", bg: "bg-emerald-600" },
    AMAZON: { label: "A", bg: "bg-amber-500" },
    TIKTOK: { label: "T", bg: "bg-pink-600" },
  };
  const item = map[platform] ?? { label: "?", bg: "bg-slate-600" };
  return (
    <span
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white",
        item.bg,
        className,
      )}
      title={platform}
    >
      {item.label}
    </span>
  );
}
