import type { Metadata } from "next";
import { Building2, Clock, Mail, MessageSquare, Phone } from "lucide-react";

import { Card } from "@/components/ui";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the DKH team about integrations, support or partnerships.",
};

const DETAILS = [
  { icon: Mail, label: "Email", value: "support@dkh.io", hint: "General support & integrations" },
  { icon: MessageSquare, label: "Sales", value: "sales@dkh.io", hint: "Plans, volume pricing, demos" },
  { icon: Phone, label: "Phone", value: "+84 28 7300 1234", hint: "Mon–Fri, 09:00–18:00 (GMT+7)" },
  { icon: Building2, label: "Office", value: "Ho Chi Minh City, Vietnam", hint: "District 1, Nguyen Hue" },
];

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Contact</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Talk to a human
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Questions about connecting a marketplace, migrating from another tool, or a custom
            integration? Send a message and we will come back to you.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-5 lg:px-8">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-ink">Ways to reach us</h2>
            <div className="mt-5 space-y-3">
              {DETAILS.map((detail) => (
                <Card key={detail.label} className="flex items-start gap-4 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-none bg-accent-soft text-accent ring-1 ring-accent">
                    <detail.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-2">{detail.label}</p>
                    <p className="text-sm font-medium text-ink">{detail.value}</p>
                    <p className="text-xs text-muted-2">{detail.hint}</p>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="mt-6 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <Clock className="h-4 w-4 text-accent" /> Response times
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                <li>Starter — within 2 business days</li>
                <li>Growth — within 1 business day</li>
                <li>Scale — within 4 business hours</li>
              </ul>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-ink">Send us a message</h2>
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
