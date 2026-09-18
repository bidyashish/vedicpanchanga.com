import type { ReactNode } from "react";

/** Column wrapper for one limb (tithi, nakshatra, ...) of the panchang. */
export function LimbCol({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p
        className="eyebrow-lg mb-1.5 pb-1 border-b"
        style={{ color: accent, borderColor: "var(--border)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
