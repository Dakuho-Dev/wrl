import type { Metadata } from "next";

import { appUrl as resolveAppUrl } from "@/lib/env";

import "./globals.css";

const appUrl = resolveAppUrl();

const DESCRIPTION =
  "DKH is an order management tool for Etsy sellers. It imports your Etsy orders into a production queue and uploads tracking numbers back to Etsy when you ship.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "DKH — Order management for Etsy sellers",
    template: "%s · DKH",
  },
  description: DESCRIPTION,
  keywords: [
    "Etsy order management",
    "Etsy order sync",
    "Etsy tracking upload",
    "Etsy seller tools",
  ],
  openGraph: {
    title: "DKH — Order management for Etsy sellers",
    description: DESCRIPTION,
    url: appUrl,
    siteName: "DKH",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink-2 antialiased">{children}</body>
    </html>
  );
}
