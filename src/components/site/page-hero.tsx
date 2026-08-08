import type { ReactNode } from "react";

/**
 * Shared hero band for the marketing pages. Same azure field as the home page
 * so every public page reads as one product rather than a stack of templates.
 */
export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="bg-brand-sweep relative overflow-hidden text-white">
      <div className="surface-dots absolute inset-0 opacity-50" aria-hidden />
      <div
        className="absolute -right-32 -top-32 h-[380px] w-[380px] rounded-full bg-sky-400/20 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p className="label !text-sky-300">{eyebrow}</p>
        <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">{title}</h1>
        {children ? (
          <div className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
