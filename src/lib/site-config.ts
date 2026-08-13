import { cleanEnv } from "@/lib/env";

/** Display name of the product, as it appears in copy, the logo and metadata. */
export const BRAND = cleanEnv(process.env.BRAND, "WrL");

/** The host the site is served from. */
export const SITE_DOMAIN = cleanEnv(process.env.SITE_DOMAIN, "wrl.dkh.io.vn");

/**
 * Where mail lives. Deliberately separate from SITE_DOMAIN: the site runs on a
 * subdomain, but MX records belong to the registered apex, so addresses stay
 * short and no second mailbox has to be configured.
 */
export const MAIL_DOMAIN = cleanEnv(process.env.MAIL_DOMAIN, "dkh.io.vn");

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
const supportEmail = cleanEnv(process.env.SUPPORT_EMAIL, `support@${MAIL_DOMAIN}`);

export const siteConfig = {
  brand: BRAND,
  domain: SITE_DOMAIN,
  mailDomain: MAIL_DOMAIN,
  supportEmail,
  privacyEmail: cleanEnv(process.env.PRIVACY_EMAIL, supportEmail),
  securityEmail: cleanEnv(process.env.SECURITY_EMAIL, supportEmail),
  legalEmail: cleanEnv(process.env.LEGAL_EMAIL, supportEmail),
  legalName: cleanEnv(process.env.LEGAL_NAME, BRAND),
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
