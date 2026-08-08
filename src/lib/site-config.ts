import { cleanEnv } from "@/lib/env";

/** The registered domain. Every brand string on the site derives from this. */
export const SITE_DOMAIN = cleanEnv(process.env.SITE_DOMAIN, "dkh.io.vn");

/**
 * Public contact details.
 *
 * Etsy's API Terms require the application to publish "a monitored email address
 * that Etsy sellers can use to contact your Application for support" — so
 * SUPPORT_EMAIL must point at a mailbox somebody actually reads.
 *
 * The privacy/security/legal addresses fall back to the support mailbox rather
 * than inventing aliases nobody has created. One address that works beats four
 * that bounce.
 */
const supportEmail = cleanEnv(process.env.SUPPORT_EMAIL, `support@${SITE_DOMAIN}`);

export const siteConfig = {
  domain: SITE_DOMAIN,
  supportEmail,
  privacyEmail: cleanEnv(process.env.PRIVACY_EMAIL, supportEmail),
  securityEmail: cleanEnv(process.env.SECURITY_EMAIL, supportEmail),
  legalEmail: cleanEnv(process.env.LEGAL_EMAIL, supportEmail),
  legalName: cleanEnv(process.env.LEGAL_NAME, "DKH"),
  /** Only rendered when set — we do not publish an address we cannot stand behind. */
  businessAddress: cleanEnv(process.env.BUSINESS_ADDRESS, ""),
  businessPhone: cleanEnv(process.env.BUSINESS_PHONE, ""),
} as const;

/**
 * The notice Etsy's API Terms §1 require the application to display, word for
 * word as Etsy publishes it. Do not paraphrase or reflow this string.
 */
export const ETSY_TRADEMARK_NOTICE =
  "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.";
