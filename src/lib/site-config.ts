import { cleanEnv } from "@/lib/env";

/**
 * Public contact details.
 *
 * Etsy's API Terms require the application to publish "a monitored email address
 * that Etsy sellers can use to contact your Application for support" — so
 * SUPPORT_EMAIL must point at a mailbox somebody actually reads. Set it in the
 * environment; the fallback is a placeholder, not a working address.
 */
export const siteConfig = {
  supportEmail: cleanEnv(process.env.SUPPORT_EMAIL, "support@dkh.io"),
  legalName: cleanEnv(process.env.LEGAL_NAME, "DKH"),
  /** Only rendered when set — we do not publish an address we cannot stand behind. */
  businessAddress: cleanEnv(process.env.BUSINESS_ADDRESS, ""),
  businessPhone: cleanEnv(process.env.BUSINESS_PHONE, ""),
} as const;

/** The exact notice Etsy's API Terms §1 require the application to display. */
export const ETSY_TRADEMARK_NOTICE =
  "The term “Etsy” is a trademark of Etsy, Inc. This Application uses Etsy’s API, but is not endorsed or certified by Etsy.";
