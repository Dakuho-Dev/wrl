import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms governing your use of the OwlFlow order management platform.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="5 August 2026"
      intro="These terms form the agreement between OwlFlow and you when you create an account or use the service. Please read them; by signing up you accept them."
    >
      <LegalSection heading="1. The service">
        <p>
          OwlFlow provides software that connects to third-party sales channels, imports order and
          catalog data, automates fulfillment steps and submits shipping information back to those
          channels. The service is provided on a subscription basis according to the plan you select.
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

      <LegalSection heading="3. Connected shops and third-party terms">
        <p>
          You authorize OwlFlow to access your marketplace accounts using the permissions you grant
          through each marketplace&apos;s OAuth flow. You remain bound by the terms of those
          marketplaces, including their API and seller policies. You confirm that you have the right
          to grant this access and to process the buyer data that flows into OwlFlow.
        </p>
        <p>
          Marketplaces may change, restrict or withdraw their APIs at any time. If that happens we
          will adapt the integration where feasible, but we cannot guarantee continued availability
          of any third-party channel.
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
          You keep all rights to the data you bring into OwlFlow. You grant us a limited licence to
          host, process and transmit it solely to operate the service for you. Our handling of
          personal data is described in the <a href="/privacy">Privacy Policy</a>, which forms part
          of these terms.
        </p>
      </LegalSection>

      <LegalSection heading="7. Availability">
        <p>
          We aim for 99.9% monthly availability excluding scheduled maintenance, which we announce in
          advance where possible. Sync frequency depends on third-party API availability and rate
          limits and is not guaranteed to be instantaneous.
        </p>
      </LegalSection>

      <LegalSection heading="8. Warranties and liability">
        <p>
          The service is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law we
          disclaim implied warranties of merchantability and fitness for a particular purpose. Our
          total liability in any 12-month period is limited to the fees you paid us in that period.
          We are not liable for indirect or consequential loss, including lost profits or lost sales
          caused by a third-party marketplace outage.
        </p>
      </LegalSection>

      <LegalSection heading="9. Suspension and termination">
        <p>
          We may suspend or terminate an account that breaches these terms, creates a security risk,
          or has unpaid fees more than 14 days overdue. You may close your account at any time from
          the dashboard. On termination we delete your data as described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to these terms">
        <p>
          We may update these terms; the current version is always on this page. Material changes are
          emailed to account owners at least 14 days before they take effect. Continuing to use the
          service after that date means you accept the new version.
        </p>
      </LegalSection>

      <LegalSection heading="11. Governing law">
        <p>
          These terms are governed by the laws of Vietnam. Disputes will be resolved in the competent
          courts of Ho Chi Minh City, without prejudice to mandatory consumer protections in your
          country of residence.
        </p>
      </LegalSection>

      <LegalSection heading="12. Contact">
        <p>
          Questions about these terms: <a href="mailto:legal@owlflow.io">legal@owlflow.io</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
