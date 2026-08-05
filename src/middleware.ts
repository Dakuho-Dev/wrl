import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers + a lightweight rate limiter.
 *
 * The limiter keeps counters in memory, so on a serverless platform each instance
 * enforces its own budget. That is enough to blunt credential stuffing and API
 * scraping; move to Redis/Upstash if you need a global limit.
 */

const WINDOW_MS = 60_000;

const LIMITS: Array<{ prefix: string; max: number }> = [
  { prefix: "/api/v1", max: 120 },
  { prefix: "/api/integrations", max: 20 },
  { prefix: "/login", max: 20 },
  { prefix: "/register", max: 10 },
];

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimit(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const rule = LIMITS.find((entry) => path.startsWith(entry.prefix));
  if (!rule) return null;

  // Only meter state-changing requests on the auth pages; GET renders are cheap.
  if (rule.prefix === "/login" || rule.prefix === "/register") {
    if (request.method === "GET") return null;
  }

  const now = Date.now();
  const key = `${rule.prefix}:${clientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > rule.max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return new NextResponse(
      JSON.stringify({ error: "rate_limited", message: "Too many requests. Slow down." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 5000) {
    for (const [entryKey, entry] of buckets) {
      if (entry.resetAt < now) buckets.delete(entryKey);
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
