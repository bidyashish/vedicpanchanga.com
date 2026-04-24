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
    <section data-testid={testId} className="card card-lift p-5 lg:p-6">
      <div className="flex items-baseline justify-between mb-3 border-b border-parchment-200/70 pb-2">
        <h3 className="font-serif text-xl lg:text-2xl text-crimson tracking-wide">{title}</h3>
        {subtitle && (
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">{subtitle}</span>
        )}
      </div>
      {children}
    </section>
  );
}
