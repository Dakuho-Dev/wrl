"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Field, Input } from "@/components/ui";
import { loginAction, type AuthState } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full py-2.5">
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required placeholder="you@yourshop.com" />
      </Field>

      <Field label="Password">
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-slate-400">
          <input type="checkbox" name="remember" className="h-3.5 w-3.5 rounded border-ink-600 bg-ink-900" />
          Keep me signed in
        </label>
        <Link href="/contact" className="text-slate-400 hover:text-brand-300">
          Forgot password?
        </Link>
      </div>

      <Submit />
    </form>
  );
}
