import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { formatHHMM, formatShortDate } from "@/lib/format";
import type { SavedChart } from "@/types/api";

type SortKey = "name" | "updated_at";
type SortDir = "asc" | "desc";

interface Props {
  charts: SavedChart[];
  limit: number;
  loading: boolean;
  onOpen: (chart: SavedChart) => void;
  onEdit: (chart: SavedChart) => void;
  onDelete: (chart: SavedChart) => void;
}

const TH = "py-2 px-2 font-bold whitespace-nowrap text-start";
const TD = "py-2 px-2 align-middle";

/** Searchable, sortable table of the signed-in user's saved charts. */
export function SavedChartTable({ charts, limit, loading, onOpen, onEdit, onDelete }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Search and sort on the label the user sees, so untitled charts (empty name)
  // behave like "Untitled chart" rather than sorting as an empty string.
  const fallback = t("saved_name_fallback");
  const rows = useMemo(() => {
    const label = (c: SavedChart) => c.name || fallback;
    const q = query.trim().toLowerCase();
    const filtered = q
      ? charts.filter((c) => `${label(c)} ${c.place_name}`.toLowerCase().includes(q))
      : charts;
    const sign = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) =>
      sortKey === "name"
        ? sign * label(a).localeCompare(label(b), undefined, { sensitivity: "base" })
        : sign * a.updated_at.localeCompare(b.updated_at),
    );
  }, [charts, query, sortKey, sortDir, fallback]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const genderLabel = (sex: string | null) => {
    const s = (sex ?? "").toLowerCase();
    if (s.startsWith("m")) return t("gender_male");
    if (s.startsWith("f")) return t("gender_female");
    return "-";
  };

  const sortHeader = (key: SortKey, label: string) => {
    const active = key === sortKey;
    return (
      <th
        scope="col"
        className={TH}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${active ? "text-ink" : ""}`}
        >
          {label}
          <span aria-hidden="true" className="text-[10px] leading-none">
            {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      </th>
    );
  };

  const confirmDelete = (c: SavedChart) => {
    if (window.confirm(t("saved_delete_confirm"))) onDelete(c);
  };

  return (
    <div data-testid="saved-chart-table" className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("saved_search")}
          aria-label={t("saved_search")}
          className="field sm:flex-1"
          data-testid="saved-chart-search"
        />
        <span className="text-mini text-ink-soft whitespace-nowrap">
          {t("saved_count").replace("{0}", String(charts.length)).replace("{1}", String(limit))}
        </span>
      </div>

      {loading && charts.length === 0 && (
        <p className="text-mini text-ink-soft italic">{t("saved_loading")}</p>
      )}
      {!loading && charts.length === 0 && (
        <p className="text-mini text-ink-soft">{t("saved_empty")}</p>
      )}
      {charts.length > 0 && rows.length === 0 && (
        <p className="text-mini text-ink-soft">{t("saved_no_match")}</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto border border-parchment-200 rounded-sm">
          <table className="w-full border-collapse text-meta">
            <thead>
              <tr className="eyebrow-lg border-b border-parchment-200">
                <th scope="col" className={`${TH} w-8`}>
                  #
                </th>
                {sortHeader("name", t("saved_col_name"))}
                <th scope="col" className={TH}>
                  {t("gender")}
                </th>
                <th scope="col" className={TH}>
                  {t("date")}
                </th>
                <th scope="col" className={TH}>
                  {t("col_time")}
                </th>
                <th scope="col" className={TH}>
                  {t("place")}
                </th>
                <th scope="col" className={TH}>
                  {t("saved_col_action")}
                </th>
                {sortHeader("updated_at", t("saved_col_last_saved"))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr
                  key={c.id}
                  className="border-b border-parchment-200 last:border-b-0"
                  data-testid="saved-chart-row"
                >
                  <td className={`${TD} num text-ink-soft`}>{i + 1}</td>
                  <td className={`${TD} font-semibold text-ink`}>
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="text-start transition-colors hover:text-saffron"
                      title={t("saved_open")}
                    >
                      {c.name || fallback}
                    </button>
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>{genderLabel(c.sex)}</td>
                  {/* Noon avoids the UTC-midnight rollback that shifts bare dates a day west of Greenwich. */}
                  <td className={`${TD} num whitespace-nowrap`} dir="ltr">
                    {formatShortDate(`${c.birth_date}T12:00:00`)}
                  </td>
                  <td className={`${TD} num whitespace-nowrap`} dir="ltr">
                    {formatHHMM(c.birth_time)}
                  </td>
                  <td className={`${TD} max-w-[16rem] truncate`} title={c.place_name}>
                    {c.place_name || "-"}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => onOpen(c)}
                        className="text-saffron hover:underline"
                      >
                        {t("saved_open")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(c)}
                        className="text-saffron hover:underline"
                      >
                        {t("saved_edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(c)}
                        className="text-rose hover:underline"
                      >
                        {t("saved_delete")}
                      </button>
                    </div>
                  </td>
                  <td className={`${TD} num whitespace-nowrap`} dir="ltr">
                    {formatShortDate(c.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
