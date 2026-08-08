import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "How to connect a shop, how the sync works, and the DKH REST API reference for orders, shipments and webhooks.",
};

const NAV = [
  { href: "#quickstart", label: "Quickstart" },
  { href: "#connect-etsy", label: "Connect an Etsy shop" },
  { href: "#sync", label: "How syncing works" },
  { href: "#automations", label: "Automations" },
  { href: "#api", label: "REST API" },
  { href: "#webhooks", label: "Webhooks" },
  { href: "#errors", label: "Errors & rate limits" },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="scroll-thin mt-3 overflow-x-auto rounded-xl border border-line bg-paper p-4 text-xs leading-relaxed text-ink-2">
      <code>{children}</code>
    </pre>
  );
}

function Doc({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-line pb-10">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted [&_a]:text-accent [&_code]:rounded [&_code]:bg-paper-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-accent [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink-2">
        {children}
      </div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-2">
            Documentation
          </p>
          <nav className="mt-4 space-y-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-surface hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-10">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-ink">Documentation</h1>
            <p className="mt-3 text-muted">
              Everything you need to connect a shop, understand the sync pipeline and build on top of
              the DKH API.
            </p>
          </div>

          <Doc id="quickstart" title="Quickstart">
            <ol className="ml-5 list-decimal space-y-2">
              <li>
                Create an account at <Link href="/register">/register</Link>.
              </li>
              <li>Open <strong>Dashboard → Shops</strong> and choose <strong>Connect shop</strong>.</li>
              <li>Pick your marketplace and approve the permissions on its authorization screen.</li>
              <li>Wait for the first sync to finish — listings first, then orders.</li>
              <li>Open <strong>Orders</strong>; your queue is live.</li>
            </ol>
          </Doc>

          <Doc id="connect-etsy" title="Connect an Etsy shop">
            <p>
              DKH uses the <strong>Etsy Open API v3</strong> with OAuth 2.0 and PKCE. The flow is:
            </p>
            <ol className="ml-5 list-decimal space-y-2">
              <li>
                You click <strong>Connect Etsy</strong>. DKH generates a PKCE verifier and
                redirects you to <code>https://www.etsy.com/oauth/connect</code>.
              </li>
              <li>
                Etsy shows you the requested scopes:{" "}
                <code>shops_r listings_r transactions_r transactions_w</code>.
              </li>
              <li>
                After you approve, Etsy redirects back to{" "}
                <code>/api/integrations/etsy/callback</code> with an authorization code.
              </li>
              <li>
                DKH exchanges the code for an access token and a refresh token at{" "}
                <code>https://api.etsy.com/v3/public/oauth/token</code>, then stores them encrypted.
              </li>
              <li>
                The shop record is created and the first sync starts:{" "}
                <code>/shops/&#123;shop_id&#125;/listings/active</code> then{" "}
                <code>/shops/&#123;shop_id&#125;/receipts</code>.
              </li>
            </ol>
            <p>
              <strong>Self-hosting?</strong> Set <code>ETSY_CLIENT_ID</code>,{" "}
              <code>ETSY_CLIENT_SECRET</code> and <code>ETSY_REDIRECT_URI</code> in your environment.
              The redirect URI must match the callback registered in your Etsy app exactly.
            </p>
            <Code>{`ETSY_CLIENT_ID="your-keystring"
ETSY_CLIENT_SECRET="your-shared-secret"
ETSY_REDIRECT_URI="https://yourdomain.com/api/integrations/etsy/callback"
ETSY_SCOPES="shops_r listings_r transactions_r transactions_w"`}</Code>
            <p>
              Without credentials the platform runs in <strong>demo mode</strong>: connecting a shop
              creates a simulated channel with realistic data so the workflow can be reviewed
              end-to-end.
            </p>
          </Doc>

          <Doc id="sync" title="How syncing works">
            <ul className="space-y-1.5">
              <li>Each shop is synced on a schedule (15 minutes by default) and on demand.</li>
              <li>Records are matched by the marketplace&apos;s own id, so re-syncing never duplicates.</li>
              <li>Every run creates a <strong>sync job</strong> with counts, duration and any error.</li>
              <li>Access tokens are refreshed automatically five minutes before expiry.</li>
              <li>Rate-limit responses trigger exponential backoff; the run resumes where it stopped.</li>
            </ul>
          </Doc>

          <Doc id="automations" title="Automations">
            <p>An automation is a trigger, a set of conditions and a list of actions.</p>
            <Code>{`{
  "name": "Flag high-value orders",
  "trigger": "ORDER_CREATED",
  "conditions": [{ "field": "total", "op": "gt", "value": 150 }],
  "actions": [
    { "type": "SET_PRIORITY", "value": "HIGH" },
    { "type": "ADD_TAG", "value": "vip" }
  ]
}`}</Code>
            <p>
              Supported triggers: <code>ORDER_CREATED</code>, <code>ORDER_PAID</code>,{" "}
              <code>ORDER_SHIPPED</code>, <code>SYNC_COMPLETED</code>, <code>SCHEDULE</code>.
              Supported actions: <code>SET_STATUS</code>, <code>SET_PRIORITY</code>,{" "}
              <code>ADD_TAG</code>, <code>NOTIFY</code>, <code>PUSH_TRACKING</code> and{" "}
              <code>WEBHOOK</code>.
            </p>
          </Doc>

          <Doc id="api" title="REST API">
            <p>
              Authenticate with an API key from <strong>Dashboard → API keys</strong>. Send it as a
              bearer token.
            </p>
            <Code>{`curl https://dkh.io/api/v1/orders?status=NEW&limit=25 \\
  -H "Authorization: Bearer dkh_live_xxxxxxxxxxxx"`}</Code>
            <div className="mt-5 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper-2 text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Method</th>
                    <th className="px-4 py-2.5 font-semibold">Endpoint</th>
                    <th className="px-4 py-2.5 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    ["GET", "/api/v1/orders", "List orders, filterable by status, shop and date"],
                    ["GET", "/api/v1/orders/{id}", "Retrieve a single order with items and shipments"],
                    ["PATCH", "/api/v1/orders/{id}", "Update status, priority, tags or notes"],
                    ["POST", "/api/v1/orders/{id}/shipments", "Create a shipment and push tracking"],
                    ["GET", "/api/v1/shops", "List connected shops and their sync state"],
                    ["POST", "/api/v1/shops/{id}/sync", "Trigger an immediate sync"],
                    ["GET", "/api/v1/products", "List synced listings"],
                  ].map(([method, path, description]) => (
                    <tr key={path + method}>
                      <td className="px-4 py-2.5 font-mono text-accent">{method}</td>
                      <td className="px-4 py-2.5 font-mono text-ink-2">{path}</td>
                      <td className="px-4 py-2.5 text-muted">{description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Doc>

          <Doc id="webhooks" title="Webhooks — not available yet">
            <p className="border border-line border-l-4 border-l-amber-600 bg-amber-500/10 px-4 py-3 text-amber-900">
              <strong>Outbound webhooks are not implemented.</strong> You can register an endpoint
              in <strong>Dashboard → API keys</strong> and it will be stored against your account,
              but DKH does not deliver events to it today. Poll{" "}
              <code>GET /api/v1/orders</code> instead until this ships.
            </p>
            <p>
              When it does ship, deliveries will be signed with HMAC-SHA256 in an{" "}
              <code>X-DKH-Signature</code> header and cover{" "}
              <code>order.created</code>, <code>order.updated</code>, <code>order.shipped</code> and{" "}
              <code>shop.sync_failed</code>. We will announce it here and by email before enabling
              it.
            </p>
          </Doc>

          <Doc id="errors" title="Errors & rate limits">
            <ul className="space-y-1.5">
              <li><code>400</code> — malformed request</li>
              <li><code>401</code> — missing or invalid API key</li>
              <li><code>403</code> — key lacks the required scope</li>
              <li><code>404</code> — resource not found or not yours</li>
              <li><code>429</code> — rate limited; check the <code>Retry-After</code> header</li>
              <li><code>5xx</code> — our problem; safe to retry with backoff</li>
            </ul>
            <p>API keys are limited to 120 requests per minute per account.</p>
          </Doc>
        </div>
      </div>
    </div>
  );
}
