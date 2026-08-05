"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Field, Input } from "@/components/ui";
import { registerAction, type AuthState } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full py-2.5">
      {pending ? "Creating account…" : "Create free account"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(registerAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Full name">
        <Input name="name" required autoComplete="name" placeholder="Jane Cooper" />
      </Field>

      <Field label="Work email">
        <Input name="email" type="email" required autoComplete="email" placeholder="jane@yourshop.com" />
      </Field>

      <Field label="Shop or company (optional)">
        <Input name="company" placeholder="Little Thistle Studio" />
      </Field>

      <Field label="Password" hint="At least 8 characters.">
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>

      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-400">
        <input
          type="checkbox"
          name="terms"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-ink-600 bg-ink-900"
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="text-brand-400 hover:text-brand-300">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brand-400 hover:text-brand-300">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <Submit />
    </form>
  );
}
