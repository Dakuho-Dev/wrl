import type { ReactNode } from "react";

/**
 * Shared hero band for the marketing pages — the same rounded deep-violet card
 * the home page opens with, so every public page reads as one product rather
 * than a stack of templates.
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
    <section className="px-3 pt-4 sm:px-4">
      <div className="bg-brand-sweep relative mx-auto max-w-7xl overflow-hidden rounded-[28px] text-white">
        <div className="surface-dots absolute inset-0 opacity-50" aria-hidden />
        <div
          className="absolute -right-28 -top-32 h-[380px] w-[380px] rounded-full bg-fuchsia-400/25 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-28 -left-24 h-[320px] w-[320px] rounded-full bg-violet-500/30 blur-3xl"
          aria-hidden
        />

        <div className="animate-rise relative mx-auto max-w-3xl px-6 py-16 text-center sm:px-10 lg:py-20">
          <p className="label !text-violet-300">{eyebrow}</p>
          <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">{title}</h1>
          {children ? (
            <div className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
