/** Compact sunrise / sunset / moonrise / moonset tile. */
export function TimeCard({
  label,
  value,
  color,
  icon,
  testId,
}: {
  label: string;
  value: string;
  color: string;
  icon?: string;
  testId?: string;
}) {
  return (
    <div
      className="px-3 py-2 bg-parchment-50 border border-parchment-200 rounded-sm"
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span className="text-base leading-none opacity-80" style={{ color }} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="text-lead num mt-0.5 font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
