import type { MetadataRoute } from "next";

import { appUrl as resolveAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const appUrl = resolveAppUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
