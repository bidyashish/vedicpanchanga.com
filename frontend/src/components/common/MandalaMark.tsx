export function MandalaMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="28" stroke="#993D2E" strokeWidth="1.5" opacity="0.35" />
      <circle cx="32" cy="32" r="20" stroke="#C5A059" strokeWidth="1.5" opacity="0.7" />
      <circle cx="32" cy="32" r="12" stroke="#993D2E" strokeWidth="1.5" opacity="0.55" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={32}
            y1={32}
            x2={32 + Math.cos(a) * 28}
            y2={32 + Math.sin(a) * 28}
            stroke="#C5A059"
            strokeWidth="0.9"
            opacity="0.55"
          />
        );
      })}
      <circle cx="32" cy="32" r="3" fill="#993D2E" />
    </svg>
  );
}
