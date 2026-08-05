import type { MetadataRoute } from "next";

const ROUTES = [
  "",
  "/features",
  "/platforms",
  "/pricing",
  "/docs",
  "/faq",
  "/support",
  "/contact",
  "/terms",
  "/privacy",
  "/security",
  "/login",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();

  return ROUTES.map((route) => ({
    url: `${appUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
