import type { Metadata } from "next";

import { appUrl as resolveAppUrl } from "@/lib/env";

import "./globals.css";

const appUrl = resolveAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "OwlFlow — Order management & fulfillment automation",
    template: "%s · OwlFlow",
  },
  description:
    "OwlFlow connects your Etsy, Shopify, Amazon and TikTok Shop stores and automates the entire order lifecycle — synchronization, processing, shipping labels and tracking.",
  keywords: [
    "order management",
    "Etsy order sync",
    "fulfillment automation",
    "multichannel ecommerce",
    "shipping tracking",
  ],
  openGraph: {
    title: "OwlFlow — Order management & fulfillment automation",
    description:
      "Sync orders from every sales channel, automate fulfillment, and push tracking back to the marketplace automatically.",
    url: appUrl,
    siteName: "OwlFlow",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-slate-200 antialiased">{children}</body>
    </html>
  );
}
