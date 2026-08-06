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
      <section className="border-b border-line">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h1 className="text-4xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-3 text-sm text-muted-2">Last updated: {updated}</p>
          <p className="mt-5 leading-relaxed text-muted">{intro}</p>
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
      <h2 className="text-xl font-semibold text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted [&_a]:text-accent [&_a:hover]:text-accent [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink-2">
        {children}
      </div>
    </section>
  );
}
