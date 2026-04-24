import type { ReactNode } from "react";

export function Section({
  title,
  subtitle,
  children,
  testId,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section data-testid={testId} className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 mb-3 pb-2 border-b border-parchment-200">
        <h3 className="heading-section">{title}</h3>
        {subtitle && <span className="eyebrow-accent">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}
