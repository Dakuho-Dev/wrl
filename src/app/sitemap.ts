import type { MetadataRoute } from "next";

import { appUrl as resolveAppUrl } from "@/lib/env";

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
  const appUrl = resolveAppUrl();
  const now = new Date();

  return ROUTES.map((route) => ({
    url: `${appUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
