import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { Clock, LifeBuoy, Mail } from "lucide-react";

import { Card } from "@/components/ui";
import { siteConfig } from "@/lib/site-config";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the WrL team about the Etsy integration, support or billing.",
};

export default function ContactPage() {
  const details = [
    {
      icon: Mail,
      label: "Support",
      value: siteConfig.supportEmail,
      hint: "Monitored mailbox — the fastest way to reach a person",
    },
    ...(siteConfig.businessPhone
      ? [{ icon: LifeBuoy, label: "Phone", value: siteConfig.businessPhone, hint: "Mon–Fri, 09:00–18:00 (GMT+7)" }]
      : []),
    ...(siteConfig.businessAddress
      ? [{ icon: LifeBuoy, label: "Address", value: siteConfig.businessAddress, hint: "Registered address" }]
      : []),
  ];

  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to a human">
        Questions about connecting your Etsy shop, something not working, or a feature you need?
        Send a message and we will come back to you.
      </PageHero>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-5 lg:px-8">
          <div className="lg:col-span-2">
            <h2 className="text-lg text-ink">How to reach us</h2>
            <div className="mt-5 space-y-3">
              {details.map((detail) => (
                <Card key={detail.label} className="flex items-start gap-4 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-line text-accent">
                    <detail.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="label">{detail.label}</p>
                    <p className="truncate text-sm font-medium text-ink">{detail.value}</p>
                    <p className="text-xs text-muted-2">{detail.hint}</p>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="mt-6 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <Clock className="h-4 w-4 text-accent" /> Response times
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                We aim to answer every message within one business day. If something is broken and
                orders are not syncing, say so in the subject line and we will look at it first.
              </p>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="p-6 sm:p-8">
              <h2 className="text-lg text-ink">Send us a message</h2>
              <p className="mt-1 text-sm text-muted">
                Every submission creates a ticket our support team can track.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
