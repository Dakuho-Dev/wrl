"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { submitContact, type ContactState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full py-2.5">
      {pending ? "Sending…" : "Send message"}
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState<ContactState, FormData>(submitContact, null);

  return (
    <form action={formAction} className="space-y-4">
      {state ? (
        <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <Input name="name" required placeholder="Jane Cooper" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required placeholder="jane@yourshop.com" />
        </Field>
      </div>

      <Field label="Topic">
        <Select name="category" defaultValue="GENERAL">
          <option value="GENERAL">General enquiry</option>
          <option value="INTEGRATION">Marketplace integration</option>
          <option value="TECHNICAL">Technical support</option>
          <option value="BILLING">Billing & plans</option>
        </Select>
      </Field>

      <Field label="Subject">
        <Input name="subject" required placeholder="How do I connect my Etsy shop?" />
      </Field>

      <Field label="Message">
        <Textarea name="message" required placeholder="Tell us what you need help with…" />
      </Field>

      <SubmitButton />

      <p className="text-xs leading-relaxed text-slate-500">
        By sending this form you agree that we may store and use the information provided to respond
        to your enquiry, as described in our Privacy Policy.
      </p>
    </form>
  );
}
