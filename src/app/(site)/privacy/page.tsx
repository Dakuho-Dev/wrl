import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How DKH collects, uses, stores and deletes data — including data accessed through marketplace APIs such as the Etsy Open API.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="5 August 2026"
      intro="This policy explains what information DKH collects, why we collect it, how we protect it, and the choices you have. It covers both the information you give us directly and the information we access on your behalf through connected marketplace APIs."
    >
      <LegalSection heading="1. Who we are">
        <p>
          DKH (&ldquo;DKH&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an order
          management and fulfillment automation service for online sellers. For the purposes of the
          GDPR we act as a <strong>data processor</strong> for the order and buyer data we handle on
          behalf of our customers (the sellers), and as a <strong>data controller</strong> for the
          account data of the sellers themselves.
        </p>
        <p>
          Contact: <a href="mailto:privacy@dkh.io">privacy@dkh.io</a>
        </p>
      </LegalSection>

      <LegalSection heading="2. Information you give us">
        <ul className="space-y-1.5">
          <li>Account details: name, email address, password hash, company name, country.</li>
          <li>Billing details: plan selection and invoice history (card data is held by our payment processor, never by us).</li>
          <li>Support content: messages, attachments and ticket history you send us.</li>
        </ul>
      </LegalSection>

      <LegalSection id="marketplace-data" heading="3. Information we access through marketplace APIs">
        <p>
          When you connect a shop, you authorize DKH through the marketplace&apos;s own OAuth
          screen. We then access only the data covered by the scopes you approved. For Etsy this
          means:
        </p>
        <ul className="space-y-1.5">
          <li>
            <strong>Shop profile</strong> (<code>shops_r</code>) — shop id, shop name, currency and
            URL, used to label the connection in your dashboard.
          </li>
          <li>
            <strong>Listings</strong> (<code>listings_r</code>) — title, SKU, price, quantity and
            image, used to show your catalog and match order lines to products.
          </li>
          <li>
            <strong>Receipts / orders</strong> (<code>transactions_r</code>) — order id, buyer name,
            buyer email where provided, shipping address, line items, personalization text, totals
            and payment state, used to create the order records you manage in DKH.
          </li>
          <li>
            <strong>Tracking upload</strong> (<code>transactions_w</code>) — we write tracking
            numbers and shipped status back to the marketplace when you create a shipment.
          </li>
          <li>
            <strong>Account email</strong> (<code>email_r</code>) — used to notify you about sync
            failures affecting your shop.
          </li>
        </ul>
        <p>
          We request the minimum scopes needed for these features. We do not read messages between
          you and your buyers, and we do not access financial or banking information held by the
          marketplace.
        </p>
      </LegalSection>

      <LegalSection heading="4. How we use the information">
        <ul className="space-y-1.5">
          <li>To provide the service: importing orders, running automations, generating labels and pushing tracking back to the marketplace.</li>
          <li>To secure the service: authentication, fraud prevention, abuse detection and audit logging.</li>
          <li>To support you: answering tickets and diagnosing sync problems.</li>
          <li>To improve the service: aggregated, non-identifying usage statistics.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell personal data. We do not use buyer data for advertising,
          profiling or any purpose unrelated to fulfilling the seller&apos;s orders. We do not share
          buyer data with other sellers on the platform.
        </p>
      </LegalSection>

      <LegalSection heading="5. Legal bases (GDPR)">
        <ul className="space-y-1.5">
          <li><strong>Contract</strong> — processing needed to deliver the service you signed up for.</li>
          <li><strong>Legitimate interests</strong> — securing the platform and improving reliability.</li>
          <li><strong>Consent</strong> — optional product emails, which you can withdraw at any time.</li>
          <li><strong>Legal obligation</strong> — retaining invoices for tax purposes.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Sub-processors and sharing">
        <p>We share data only with the providers needed to run the service:</p>
        <ul className="space-y-1.5">
          <li>Cloud hosting and managed database providers (EU and US regions).</li>
          <li>Shipping carriers, when you generate a label — limited to the address on the parcel.</li>
          <li>Payment processor, for subscription billing.</li>
          <li>Transactional email provider, for account and alert emails.</li>
        </ul>
        <p>
          Each sub-processor is bound by a data processing agreement. We will notify customers before
          adding a new sub-processor that handles buyer data.
        </p>
      </LegalSection>

      <LegalSection heading="7. Retention">
        <ul className="space-y-1.5">
          <li>OAuth tokens are deleted immediately when you disconnect a shop or revoke access at the marketplace.</li>
          <li>Order and shipment records are kept while your account is active, so you can search your own history.</li>
          <li>When you delete your account, all shops, orders, shipments and buyer data are permanently erased within 30 days.</li>
          <li>Audit logs are retained for 12 months; invoices for 7 years where tax law requires it.</li>
        </ul>
      </LegalSection>

      <LegalSection id="data-deletion" heading="8. Your rights and data deletion">
        <p>
          You can access, correct, export or delete your data at any time from{" "}
          <strong>Dashboard → Settings</strong>, or by emailing{" "}
          <a href="mailto:privacy@dkh.io">privacy@dkh.io</a>. Specifically:
        </p>
        <ul className="space-y-1.5">
          <li><strong>Disconnect a shop</strong> — stops all syncing and deletes the stored tokens for that shop.</li>
          <li><strong>Export</strong> — download your orders and shipments as CSV.</li>
          <li><strong>Delete account</strong> — erases your account and every record attached to it.</li>
        </ul>
        <p>
          Buyers whose data appears in a seller&apos;s DKH account may contact us and we will
          route the request to the relevant seller (the controller) and assist with fulfilling it.
          EU and UK residents also have the right to lodge a complaint with their supervisory
          authority.
        </p>
      </LegalSection>

      <LegalSection heading="9. Security">
        <p>
          Data is encrypted in transit (TLS 1.2+) and at rest. OAuth tokens are stored encrypted and
          are never exposed in the interface or the API. Access to production systems is limited to
          named engineers with multi-factor authentication. See our{" "}
          <a href="/security">Security Policy</a> for the full description.
        </p>
      </LegalSection>

      <LegalSection heading="10. Cookies">
        <p>
          We use a single essential cookie to keep you signed in. We do not use advertising or
          cross-site tracking cookies. Optional analytics are aggregated and cannot identify an
          individual buyer.
        </p>
      </LegalSection>

      <LegalSection heading="11. Children">
        <p>DKH is a business tool and is not directed at anyone under 16.</p>
      </LegalSection>

      <LegalSection heading="12. Changes">
        <p>
          We will post any change on this page and update the date above. Material changes affecting
          how buyer data is handled will also be emailed to account owners at least 14 days before
          they take effect.
        </p>
      </LegalSection>

      <LegalSection heading="13. Trademarks">
        <p>
          The term &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc. This application uses the Etsy API
          but is not endorsed or certified by Etsy, Inc. Shopify, Amazon and TikTok Shop are
          trademarks of their respective owners.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
