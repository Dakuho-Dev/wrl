export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function timeAgo(value: Date | string | null | undefined) {
  if (!value) return "never";
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const ORDER_STATUSES = [
  "NEW",
  "PROCESSING",
  "ON_HOLD",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PLATFORMS = ["ETSY", "SHOPIFY", "AMAZON", "TIKTOK"] as const;

export const PLATFORM_LABEL: Record<string, string> = {
  ETSY: "Etsy",
  SHOPIFY: "Shopify",
  AMAZON: "Amazon",
  TIKTOK: "TikTok Shop",
};

/** Bordered tag colours, tuned for a light paper background. */
export function statusTone(status: string) {
  switch (status) {
    case "NEW":
      return "border-sky-800/25 bg-sky-700/10 text-sky-900";
    case "PROCESSING":
      return "border-amber-800/25 bg-amber-600/12 text-amber-900";
    case "ON_HOLD":
      return "border-orange-800/30 bg-orange-600/12 text-orange-900";
    case "SHIPPED":
      return "border-violet-800/25 bg-violet-700/10 text-violet-900";
    case "DELIVERED":
    case "CONNECTED":
    case "SUCCESS":
    case "ACTIVE":
    case "PAID":
    case "RESOLVED":
      return "border-emerald-800/25 bg-emerald-700/10 text-emerald-900";
    case "CANCELLED":
    case "FAILED":
    case "ERROR":
    case "SUSPENDED":
      return "border-rose-800/25 bg-rose-700/10 text-rose-900";
    case "REFUNDED":
      return "border-line bg-paper-3 text-muted";
    default:
      return "border-line bg-paper-2 text-muted";
  }
}
