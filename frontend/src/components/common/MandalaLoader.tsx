export function MandalaLoader({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="mandala-loader"
      fill="none"
      aria-label="Loading"
      role="img"
    >
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={32}
            y1={32}
            x2={32 + Math.cos(a) * 28}
            y2={32 + Math.sin(a) * 28}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.6"
          />
        );
      })}
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </svg>
  );
}
