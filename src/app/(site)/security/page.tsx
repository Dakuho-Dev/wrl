import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Security Policy",
  description:
    "How OwlFlow protects seller accounts, marketplace API credentials and buyer data, and how to report a vulnerability.",
};

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security Policy"
      updated="5 August 2026"
      intro="OwlFlow holds marketplace access tokens and buyer order data on behalf of sellers. This page describes the controls we apply and how to report a security issue."
    >
      <LegalSection heading="1. Authentication and access">
        <ul className="space-y-1.5">
          <li>Seller passwords are hashed with bcrypt; we never store or transmit them in plain text.</li>
          <li>Sessions use signed, HTTP-only cookies with a 30-day maximum lifetime.</li>
          <li>Marketplace connections use OAuth 2.0 with PKCE — we never ask for or receive your marketplace password.</li>
          <li>Role-based access separates seller accounts from platform administration.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. Token handling">
        <ul className="space-y-1.5">
          <li>Access and refresh tokens are encrypted at rest and are never returned by our API or shown in the interface.</li>
          <li>Tokens are scoped to the minimum permissions each integration needs.</li>
          <li>Disconnecting a shop deletes its tokens immediately and irreversibly.</li>
          <li>Refresh happens server-side only; tokens never reach the browser.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Data protection">
        <ul className="space-y-1.5">
          <li>All traffic is served over TLS 1.2 or higher with HSTS.</li>
          <li>Databases are encrypted at rest with provider-managed keys and backed up daily.</li>
          <li>Backups are encrypted and retained for 30 days.</li>
          <li>Production data is never copied into development environments.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Application security">
        <ul className="space-y-1.5">
          <li>All database access goes through a parameterized ORM layer, preventing SQL injection.</li>
          <li>Server-rendered output is escaped by default to prevent cross-site scripting.</li>
          <li>State-changing requests are protected against CSRF by same-site cookies and server actions.</li>
          <li>Dependencies are monitored for known vulnerabilities and patched on a regular cadence.</li>
          <li>Rate limiting is applied to authentication and API endpoints.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Operations">
        <ul className="space-y-1.5">
          <li>Access to production is restricted to named engineers with multi-factor authentication.</li>
          <li>Every administrative action is written to an immutable audit log.</li>
          <li>Infrastructure changes go through peer review before deployment.</li>
          <li>Monitoring and alerting cover sync failures, error rates and unusual access patterns.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Incident response">
        <p>
          If we detect a breach affecting personal data we will investigate immediately, contain the
          issue, and notify affected customers and the relevant supervisory authority within 72 hours
          of becoming aware, including what happened, what data was involved and what we are doing
          about it.
        </p>
      </LegalSection>

      <LegalSection heading="7. Reporting a vulnerability">
        <p>
          Please report suspected vulnerabilities to{" "}
          <a href="mailto:security@owlflow.io">security@owlflow.io</a>. Include steps to reproduce
          and any proof-of-concept. We acknowledge reports within two business days and aim to remediate
          critical issues within seven days.
        </p>
        <p>
          We ask researchers not to access data belonging to other users, not to degrade the service,
          and to give us reasonable time to fix an issue before disclosing it publicly. We will not
          pursue legal action against researchers who follow these guidelines.
        </p>
      </LegalSection>

      <LegalSection heading="8. Marketplace compliance">
        <p>
          Our integrations use official, documented APIs only. We honour each marketplace&apos;s rate
          limits, data retention requirements and prohibitions on reselling or repurposing buyer
          data. Where a marketplace requires deletion of buyer data after a set period, we apply that
          period automatically.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
