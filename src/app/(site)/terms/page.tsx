import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/site/legal";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms governing your use of the DKH order management platform.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="5 August 2026"
      intro="These terms form the agreement between DKH and you when you create an account or use the service. Please read them; by signing up you accept them."
    >
      <LegalSection heading="1. The service">
        <p>
          DKH provides software that connects to your Etsy shop through the Etsy Open API, imports
          your orders and active listings, gives you a queue for working through them, and submits
          tracking information back to Etsy when you record a shipment. Etsy is the only
          marketplace DKH integrates with. The service is provided on a subscription basis
          according to the plan you select.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <ul className="space-y-1.5">
          <li>You must provide accurate information and keep your credentials confidential.</li>
          <li>You are responsible for all activity that happens under your account.</li>
          <li>You must be at least 18 and legally able to enter into this agreement.</li>
          <li>One person or company per account; you may invite team members under your plan&apos;s limits.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Connected shops and Etsy's terms">
        <p>
          You authorise DKH to access your Etsy shop using the scopes you approve on Etsy&apos;s own
          authorisation screen. You remain bound by Etsy&apos;s terms, including its API Terms of
          Use and seller policies. You confirm that you have the right to grant this access and to
          have us process the buyer data that flows into DKH.
        </p>
        <p>
          Etsy may change, restrict or withdraw its API at any time. If that happens we will adapt
          where feasible, but we cannot guarantee continued availability of the integration.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="space-y-1.5">
          <li>Use the service for unlawful, infringing or fraudulent activity.</li>
          <li>Attempt to bypass rate limits, security controls or plan quotas.</li>
          <li>Resell or sublicense the service without a written agreement.</li>
          <li>Upload malware, or interfere with the operation of the platform.</li>
          <li>Use buyer data obtained through the service for marketing unrelated to fulfilling those orders, or in breach of applicable privacy law.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Fees and billing">
        <ul className="space-y-1.5">
          <li>Paid plans are billed monthly or annually in advance and renew automatically.</li>
          <li>Upgrades take effect immediately and are prorated; downgrades apply from the next period.</li>
          <li>You may cancel at any time; the service continues until the end of the paid period.</li>
          <li>Fees are exclusive of taxes, which are added where required.</li>
          <li>We may change prices with 30 days&apos; notice; changes never apply to a period already paid for.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Your data">
        <p>
          You keep all rights to the data you bring into DKH. You grant us a limited licence to
          host, process and transmit it solely to operate the service for you. Our handling of
          personal data is described in the <a href="/privacy">Privacy Policy</a>, which forms part
          of these terms.
        </p>
      </LegalSection>

      <LegalSection heading="7. Availability">
        <p>
          We aim to keep the service continuously available and announce planned maintenance in
          advance where possible, but we do not offer a contractual uptime guarantee. Sync frequency
          depends on Etsy&apos;s API availability and rate limits, and is not instantaneous.
        </p>
      </LegalSection>

      <LegalSection id="etsy-disclaimer" heading="8. Etsy disclaimer">
        <p>
          DKH integrates with Etsy through the Etsy Open API. Etsy is not the provider of this
          service and has no responsibility for it:
        </p>
        <p className="border border-line bg-paper-2 p-4 font-mono text-xs uppercase leading-relaxed">
          DISCLAIMER: THIS APPLICATION IS SOLELY PROVIDED BY DKH (THE &ldquo;APPLICATION
          DEVELOPER&rdquo;). YOU ACKNOWLEDGE THAT ETSY, INC. AND ITS AFFILIATES ARE NOT THE
          APPLICATION DEVELOPER, DO NOT PROVIDE THE APPLICATION SERVICE, AND MAKE NO WARRANTIES OF
          ANY KIND WITH RESPECT TO THE APPLICATION OR DATA ACCESSED THROUGH IT.
        </p>
        <p>
          The term &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc. This Application uses
          Etsy&rsquo;s API, but is not endorsed or certified by Etsy.
        </p>
        <p>
          In handling data we read from Etsy on your behalf, we act as your service provider and
          process it only to deliver the features described in these terms and in the{" "}
          <a href="/privacy">Privacy Policy</a>. DKH does not contact your buyers. When you record
          a shipment, the tracking number is submitted to Etsy and Etsy notifies the buyer through
          its own channels.
        </p>
      </LegalSection>

      <LegalSection heading="9. Warranties and liability">
        <p>
          The service is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law we
          disclaim implied warranties of merchantability and fitness for a particular purpose. Our
          total liability in any 12-month period is limited to the fees you paid us in that period.
          We are not liable for indirect or consequential loss, including lost profits or lost sales
          caused by a third-party marketplace outage.
        </p>
      </LegalSection>

      <LegalSection heading="10. Suspension and termination">
        <p>
          We may suspend or terminate an account that breaches these terms, creates a security risk,
          or has unpaid fees more than 14 days overdue. You may close your account at any time from
          the dashboard. On termination we delete your data as described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection heading="11. Changes to these terms">
        <p>
          We may update these terms; the current version is always on this page. Material changes are
          emailed to account owners at least 14 days before they take effect. Continuing to use the
          service after that date means you accept the new version.
        </p>
      </LegalSection>

      <LegalSection heading="12. Governing law">
        <p>
          These terms are governed by the laws of Vietnam. Disputes will be resolved in the competent
          courts of Ho Chi Minh City, without prejudice to mandatory consumer protections in your
          country of residence.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact">
        <p>
          Questions about these terms: <a href={`mailto:${siteConfig.legalEmail}`}>{siteConfig.legalEmail}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
