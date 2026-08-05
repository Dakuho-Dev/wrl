import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="border-b border-ink-800/80">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h1 className="text-4xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: {updated}</p>
          <p className="mt-5 leading-relaxed text-slate-400">{intro}</p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-4xl space-y-10 px-4 sm:px-6">{children}</div>
      </section>
    </>
  );
}

export function LegalSection({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-white">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-400 [&_a]:text-brand-400 [&_a:hover]:text-brand-300 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-slate-200">
        {children}
      </div>
    </section>
  );
}
