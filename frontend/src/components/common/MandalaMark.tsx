export function MandalaMark({ size = 28 }: { size?: number }) {
  // Single accent color stays warm — gives the brand identity a pop without
  // introducing a second hue across the rest of the UI.
  const accent = "rgb(var(--accent-sun-rgb))";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
      <circle cx="32" cy="32" r="20" stroke={accent} strokeWidth="1.4" opacity="0.85" />
      <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={32 + Math.cos(a) * 6}
            y1={32 + Math.sin(a) * 6}
            x2={32 + Math.cos(a) * 27}
            y2={32 + Math.sin(a) * 27}
            stroke="currentColor"
            strokeWidth="0.85"
            opacity="0.45"
          />
        );
      })}
      <circle cx="32" cy="32" r="3" fill={accent} />
    </svg>
  );
}
