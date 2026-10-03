import { useI18n } from "@/i18n";
import { formatShortDate } from "@/lib/format";
import type { SavedChart } from "@/types/api";

interface Props {
  charts: SavedChart[];
  limit: number;
  loading: boolean;
  onOpen: (chart: SavedChart) => void;
  onDelete: (chart: SavedChart) => void;
  compact?: boolean;
}

export function SavedChartList({ charts, limit, loading, onOpen, onDelete, compact }: Props) {
  const { t } = useI18n();

  return (
    <div data-testid="saved-chart-list">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className={compact ? "field-label mb-0" : "heading-section mb-0"}>
          {t("saved_title")}
        </h3>
        <span className="text-mini text-ink-soft">
          {t("saved_count").replace("{0}", String(charts.length)).replace("{1}", String(limit))}
        </span>
      </div>
      {loading && charts.length === 0 && (
        <p className="text-mini text-ink-soft italic">{t("saved_loading")}</p>
      )}
      {!loading && charts.length === 0 && (
        <p className="text-mini text-ink-soft">{t("saved_empty")}</p>
      )}
      {charts.length > 0 && (
        <ul className="divide-y divide-parchment-200 border border-parchment-200 rounded-sm">
          {charts.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-2.5 py-2">
              <button
                type="button"
                onClick={() => onOpen(c)}
                className="flex-1 min-w-0 text-start hover:text-saffron transition-colors"
                title={t("saved_open")}
              >
                <div className="text-meta text-ink font-semibold truncate">
                  {c.name || t("saved_name_fallback")}
                </div>
                <div className="text-mini text-ink-soft truncate" dir="ltr">
                  {formatShortDate(c.birth_date)} · {c.birth_time}
                  {c.place_name ? ` · ${c.place_name}` : ""}
                </div>
              </button>
              <button
                type="button"
                aria-label={t("saved_delete")}
                title={t("saved_delete")}
                onClick={() => {
                  if (window.confirm(t("saved_delete_confirm"))) onDelete(c);
                }}
                className="shrink-0 p-1 text-ink-soft hover:text-rose transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
