import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatHour, formatTime, hoursToHM } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  buildHeatmap,
  CATEGORIES,
  categorize,
  type HeatCategory,
  type HeatEvent,
  type HeatHit,
  type HeatKind,
  type HeatRun,
  type HeatSlot,
  type HeatStrip,
  type LagnaSpan,
} from "@/lib/auspiciousHeatmap";
import type { PanchangData } from "@/types/api";

// Auspicious Time Planner for one panchang day (github issue #92).
//
//   period toggle + best window
//   15-minute strip with an hour axis
//   per-category totals (doubles as the legend)
//   detail card for the tapped block
//   timeline: one row per window type, Lagna on top
//   slot-by-slot table with verdict and recommendation
//
// All of it is derived client-side by lib/auspiciousHeatmap.ts.

// Fixed legend colours (issue #92 review): dark green (best) -> light green
// -> yellow -> orange -> dark red (blocked). Semantic, not theme-tinted, so
// the scale reads identically in light and dark mode.
const CAT_COLOR: Record<HeatCategory, string> = {
  "highly-auspicious": "#1b5e20",
  auspicious: "#7cb342",
  neutral: "#f4c20d",
  inauspicious: "#ef6c00",
  "highly-inauspicious": "#b71c1c",
};

const CAT_LABEL_KEY: Record<HeatCategory, string> = {
  "highly-auspicious": "heat_cat_highly_auspicious",
  auspicious: "heat_cat_auspicious",
  neutral: "heat_cat_neutral",
  inauspicious: "heat_cat_inauspicious",
  "highly-inauspicious": "heat_cat_highly_inauspicious",
};

const CAT_REC_KEY: Record<HeatCategory, string> = {
  "highly-auspicious": "heat_rec_highly_auspicious",
  auspicious: "heat_rec_auspicious",
  neutral: "heat_rec_neutral",
  inauspicious: "heat_rec_inauspicious",
  "highly-inauspicious": "heat_rec_highly_inauspicious",
};

// Ink colour for an event by how it takes part in the verdict.
const KIND_COLOR: Record<HeatKind, string> = {
  block: CAT_COLOR["highly-inauspicious"],
  avoid: CAT_COLOR.inauspicious,
  soft: CAT_COLOR.inauspicious,
  major: CAT_COLOR["highly-auspicious"],
  minor: "#33691e",
};

// Bars narrower than this (% of the strip) get no inline text.
const MIN_LABEL_PCT = 3.5;

const KIND_RANK: Record<HeatKind, number> = { block: 0, avoid: 1, major: 2, minor: 3, soft: 4 };

const isFavourable = (h: { kind: HeatKind }) => h.kind === "major" || h.kind === "minor";

const tint = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, transparent)`;

const iso = (ms: number) => new Date(ms).toISOString();

const pctOf = (t: number, startMs: number, endMs: number) =>
  ((t - startMs) / (endMs - startMs)) * 100;

// Epoch ms of every full local hour inside (startMs, endMs).
function hourTicks(startMs: number, endMs: number, tz?: string): number[] {
  const parts = new Intl.DateTimeFormat("en-US", {
    minute: "2-digit",
    second: "2-digit",
    timeZone: tz,
  }).formatToParts(new Date(startMs));
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  const out: number[] = [];
  for (let t = startMs + ((60 - minute) * 60 - second) * 1000; t < endMs; t += 3_600_000)
    out.push(t);
  return out;
}

function CategoryBadge({ category }: { category: HeatCategory }) {
  const { t } = useI18n();
  const color = CAT_COLOR[category];
  return (
    <span
      className="eyebrow-lg px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color, backgroundColor: tint(color, 16) }}
    >
      {t(CAT_LABEL_KEY[category])}
    </span>
  );
}

function HourAxis({
  ticks,
  startMs,
  endMs,
  tz,
}: {
  ticks: number[];
  startMs: number;
  endMs: number;
  tz?: string;
}) {
  return (
    <div className="relative h-4 text-mini num text-ink-soft" aria-hidden="true">
      {ticks.map((tk, i) => (
        <span
          key={tk}
          className={cn(
            "absolute -translate-x-1/2 whitespace-nowrap leading-none",
            i % 2 === 1 && "hidden sm:inline",
          )}
          style={{ left: `${pctOf(tk, startMs, endMs)}%` }}
        >
          {formatHour(tk, tz)}
        </span>
      ))}
    </div>
  );
}

function Strip({
  strip,
  tz,
  selected,
  onSelect,
}: {
  strip: HeatStrip;
  tz?: string;
  selected: HeatSlot | null;
  onSelect: (s: HeatSlot) => void;
}) {
  const { t } = useI18n();
  const label = strip.period === "day" ? t("heat_period_day") : t("heat_period_night");
  const ticks = useMemo(() => hourTicks(strip.startMs, strip.endMs, tz), [strip, tz]);
  return (
    <div dir="ltr">
      <HourAxis ticks={ticks} startMs={strip.startMs} endMs={strip.endMs} tz={tz} />
      <div className="flex gap-px rounded-sm overflow-hidden" role="list" aria-label={label}>
        {strip.slots.map((slot) => {
          const isSel = selected?.startMs === slot.startMs;
          return (
            <button
              key={slot.startMs}
              type="button"
              role="listitem"
              aria-label={`${formatTime(iso(slot.startMs), tz)} ${t(CAT_LABEL_KEY[slot.category])}`}
              onClick={() => onSelect(slot)}
              className="relative h-7 sm:h-8 basis-0 min-w-0 transition-transform focus:outline-none focus:z-10"
              style={{
                flexGrow: slot.endMs - slot.startMs,
                backgroundColor: CAT_COLOR[slot.category],
                outline: isSel ? "2px solid var(--ink)" : undefined,
                outlineOffset: isSel ? "-2px" : undefined,
                transform: isSel ? "scaleY(1.12)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Totals({ strip }: { strip: HeatStrip }) {
  const { t } = useI18n();
  const span = strip.endMs - strip.startMs;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" data-testid="heat-totals">
      {CATEGORIES.map((c) => {
        const ms = strip.totals[c];
        return (
          <div
            key={c}
            className="rounded-sm border border-parchment-200 bg-parchment-50 px-2.5 py-1.5 border-l-[3px]"
            style={{ borderLeftColor: CAT_COLOR[c] }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                style={{ backgroundColor: CAT_COLOR[c] }}
              />
              <span className="text-mini font-semibold text-ink truncate">
                {t(CAT_LABEL_KEY[c])}
              </span>
            </div>
            <div className="text-mini num text-ink-soft mt-0.5">
              {hoursToHM(ms / 3_600_000)} · {span > 0 ? Math.round((ms / span) * 100) : 0}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventList({ hits, mark, color }: { hits: HeatHit[]; mark: string; color: string }) {
  const { t } = useI18n();
  if (hits.length === 0) return <span className="text-mini text-ink-soft">-</span>;
  return (
    <span className="text-mini" style={{ color }}>
      {hits.map((h, i) => (
        <span key={h.id} className="inline-block me-2">
          {mark} {t(h.labelKey)}
          {i < hits.length - 1 ? "," : ""}
        </span>
      ))}
    </span>
  );
}

function SlotDetail({ slot, tz }: { slot: HeatSlot; tz?: string }) {
  const { t } = useI18n();
  const a = useAstro();
  const pos = slot.events.filter(isFavourable);
  const neg = slot.events.filter((e) => !isFavourable(e));
  return (
    <div
      className="rounded-sm border border-parchment-200 bg-parchment-50 p-3"
      data-testid="heat-slot-detail"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="value-strong num">
          {formatTime(iso(slot.startMs), tz)} - {formatTime(iso(slot.endMs), tz)}
          {slot.lagna && (
            <span className="text-meta font-normal text-ink-soft">
              {" "}
              · {t("heat_lagna")}: <span className="font-serif text-ink">{a.sign(slot.lagna)}</span>
            </span>
          )}
        </span>
        <CategoryBadge category={slot.category} />
      </div>
      <p className="meta mt-1">{t(CAT_REC_KEY[slot.category])}</p>
      {slot.events.length === 0 ? (
        <p className="meta mt-1.5">{t("heat_no_events")}</p>
      ) : (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <p className="text-mini font-semibold text-ink-soft uppercase tracking-wide mb-0.5">
              {t("heat_favourable")}
            </p>
            <EventList hits={pos} mark="✓" color={KIND_COLOR.major} />
          </div>
          <div>
            <p className="text-mini font-semibold text-ink-soft uppercase tracking-wide mb-0.5">
              {t("heat_avoid")}
            </p>
            <EventList hits={neg} mark="✗" color={KIND_COLOR.block} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Timeline (one row per window type) ----

interface Bar {
  startMs: number;
  endMs: number;
  text: string;
}

interface Row {
  id: string;
  label: string;
  color: string;
  bars: Bar[];
}

function Timeline({
  strip,
  events,
  lagnas,
  tz,
  selected,
  onSelectTime,
}: {
  strip: HeatStrip;
  events: HeatEvent[];
  lagnas: LagnaSpan[];
  tz?: string;
  selected: HeatSlot | null;
  onSelectTime: (ms: number) => void;
}) {
  const { t } = useI18n();
  const a = useAstro();
  const { startMs, endMs } = strip;
  const ticks = useMemo(() => hourTicks(startMs, endMs, tz), [startMs, endMs, tz]);

  const rows = useMemo<Row[]>(() => {
    const inRange = (e: { startMs: number; endMs: number }) =>
      e.startMs < endMs && e.endMs > startMs;
    // Bar text shows the part visible in this strip; the tooltip has the full span.
    const range = (e: { startMs: number; endMs: number }) =>
      `${formatTime(iso(Math.max(e.startMs, startMs)), tz)} - ${formatTime(iso(Math.min(e.endMs, endMs)), tz)}`;
    const out: Row[] = [];
    const lagnaBars = lagnas.filter(inRange).map((l) => ({
      startMs: l.startMs,
      endMs: l.endMs,
      text: a.sign(l.rashi),
    }));
    if (lagnaBars.length)
      out.push({ id: "lagna", label: t("heat_lagna"), color: "var(--ink)", bars: lagnaBars });

    const byId = new Map<string, HeatEvent[]>();
    for (const e of events) {
      if (!inRange(e)) continue;
      const list = byId.get(e.id);
      if (list) list.push(e);
      else byId.set(e.id, [e]);
    }
    const groups = [...byId.values()].sort(
      (x, y) => KIND_RANK[x[0].kind] - KIND_RANK[y[0].kind] || x[0].startMs - y[0].startMs,
    );
    for (const list of groups) {
      const first = list[0];
      const name = (e: HeatEvent) => {
        if (!e.name) return range(e);
        if (e.id === "shubha_hora" || e.id === "ashubha_hora") return a.planet(e.name);
        return a.gowri(e.name);
      };
      out.push({
        id: first.id,
        label: t(first.labelKey),
        color: KIND_COLOR[first.kind],
        bars: list.map((e) => ({ startMs: e.startMs, endMs: e.endMs, text: name(e) })),
      });
    }
    return out;
  }, [events, lagnas, startMs, endMs, tz, t, a]);

  return (
    <div className="overflow-x-auto" data-testid="heat-timeline">
      <div dir="ltr" className="min-w-[640px]">
        <div className="flex">
          <div className="w-28 sm:w-36 shrink-0" />
          <div className="flex-1 min-w-0">
            <HourAxis ticks={ticks} startMs={startMs} endMs={endMs} tz={tz} />
          </div>
        </div>
        {rows.map((row) => (
          <div key={row.id} className="flex items-stretch border-t border-parchment-200">
            <div
              className="w-28 sm:w-36 shrink-0 py-1.5 pe-2 text-mini font-medium truncate"
              style={{ color: row.color }}
              title={row.label}
            >
              {row.label}
            </div>
            <div className="relative flex-1 min-w-0 h-8">
              {ticks.map((tk) => (
                <span
                  key={tk}
                  className="absolute top-0 bottom-0 w-px bg-parchment-200/70"
                  style={{ left: `${pctOf(tk, startMs, endMs)}%` }}
                  aria-hidden="true"
                />
              ))}
              {selected && (
                <span
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: `${pctOf(selected.startMs, startMs, endMs)}%`,
                    width: `${pctOf(selected.endMs, startMs, endMs) - pctOf(selected.startMs, startMs, endMs)}%`,
                    backgroundColor: "color-mix(in oklab, var(--ink) 14%, transparent)",
                  }}
                  aria-hidden="true"
                />
              )}
              {row.bars.map((bar) => {
                const s = Math.max(bar.startMs, startMs);
                const e = Math.min(bar.endMs, endMs);
                const left = pctOf(s, startMs, endMs);
                const width = pctOf(e, startMs, endMs) - left;
                const full = `${formatTime(iso(bar.startMs), tz)} - ${formatTime(iso(bar.endMs), tz)}`;
                const title = `${row.label}: ${bar.text === full ? full : `${bar.text} (${full})`}`;
                return (
                  <button
                    key={bar.startMs}
                    type="button"
                    title={title}
                    aria-label={title}
                    onClick={() => onSelectTime(s)}
                    className="absolute top-1.5 bottom-1.5 rounded-[3px] px-1 text-[10px] leading-none truncate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor:
                        row.id === "lagna" ? "var(--color-parchment-100)" : tint(row.color, 18),
                      color: row.color,
                      border:
                        row.id === "lagna" ? "1px solid var(--color-parchment-200)" : undefined,
                    }}
                  >
                    {width >= MIN_LABEL_PCT ? bar.text : ""}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Slot-by-slot table ----

const TABLE_LIMIT = 12;

function RunTable({
  strip,
  tz,
  selected,
  onSelectTime,
}: {
  strip: HeatStrip;
  tz?: string;
  selected: HeatSlot | null;
  onSelectTime: (ms: number) => void;
}) {
  const { t } = useI18n();
  const a = useAstro();
  const [expanded, setExpanded] = useState(false);
  const runs = strip.runs;
  const selIdx = selected
    ? runs.findIndex((r) => r.startMs <= selected.startMs && selected.startMs < r.endMs)
    : -1;
  const showAll = expanded || selIdx >= TABLE_LIMIT;
  const shown = showAll ? runs : runs.slice(0, TABLE_LIMIT);
  const cols = "lg:grid-cols-[11.5rem_7rem_1fr_1fr_13rem]";

  return (
    <div data-testid="heat-table">
      <div className="rounded-sm border border-parchment-200 overflow-hidden">
        <div
          className={cn(
            "hidden lg:grid gap-x-3 px-3 py-1.5 bg-parchment-100 text-mini font-semibold uppercase tracking-wide text-ink-soft",
            cols,
          )}
        >
          <span>{t("col_time")}</span>
          <span>{t("heat_lagna")}</span>
          <span>{t("heat_favourable")}</span>
          <span>{t("heat_avoid")}</span>
          <span>{t("heat_result")}</span>
        </div>
        {shown.map((run: HeatRun, i) => {
          const isSel = i === selIdx;
          const pos = run.events.filter(isFavourable);
          const neg = run.events.filter((e) => !isFavourable(e));
          return (
            <button
              key={run.startMs}
              type="button"
              onClick={() => onSelectTime(run.startMs)}
              aria-pressed={isSel}
              className={cn(
                "w-full text-left grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 border-t border-parchment-200 items-start transition-colors hover:bg-parchment-100/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron",
                cols,
                isSel && "bg-parchment-100",
              )}
              style={{ boxShadow: isSel ? `inset 3px 0 0 ${CAT_COLOR[run.category]}` : undefined }}
            >
              <span className="value num whitespace-nowrap">
                {formatTime(iso(run.startMs), tz)} - {formatTime(iso(run.endMs), tz)}
              </span>
              <span className="font-serif text-ink text-end lg:text-start">
                {run.lagna ? a.sign(run.lagna) : "-"}
              </span>
              <span className="col-span-2 lg:col-span-1">
                <EventList hits={pos} mark="✓" color={KIND_COLOR.major} />
              </span>
              <span className="col-span-2 lg:col-span-1">
                <EventList hits={neg} mark="✗" color={KIND_COLOR.block} />
              </span>
              <span className="col-span-2 lg:col-span-1 flex flex-col gap-0.5 items-start">
                <CategoryBadge category={run.category} />
                <span className="meta">{t(CAT_REC_KEY[run.category])}</span>
              </span>
            </button>
          );
        })}
      </div>
      {runs.length > TABLE_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-mini font-medium text-saffron hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded-2xs"
        >
          {showAll ? t("heat_show_less") : t("heat_show_all").replace("{0}", String(runs.length))}
        </button>
      )}
    </div>
  );
}

// ---- Card ----

export function AuspiciousHeatmap({ data, tz }: { data: PanchangData; tz?: string }) {
  const { t } = useI18n();
  const a = useAstro();
  const model = useMemo(() => buildHeatmap(data), [data]);
  const [period, setPeriod] = useState<"day" | "night">("day");
  const [selected, setSelected] = useState<HeatSlot | null>(null);

  if (!model.hasSignal || (!model.day && !model.night)) return null;

  const strip = (period === "day" ? model.day : model.night) ?? model.day ?? model.night!;

  const bestColor = model.best ? CAT_COLOR[categorize([], model.best.score)] : undefined;

  const selectTime = (ms: number) => {
    const slot = strip.slots.find((s) => s.startMs <= ms && ms < s.endMs) ?? null;
    setSelected(slot);
  };
  const switchPeriod = (p: "day" | "night") => {
    setPeriod(p);
    setSelected(null);
  };

  return (
    <div data-testid="auspicious-heatmap" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {model.day && model.night ? (
          <SegmentedControl<"day" | "night">
            testId="heat-period-toggle"
            ariaLabel={t("heat_title")}
            value={strip.period}
            onChange={switchPeriod}
            options={[
              { id: "day", label: t("heat_period_day"), testId: "heat-period-day" },
              { id: "night", label: t("heat_period_night"), testId: "heat-period-night" },
            ]}
          />
        ) : (
          <span className="eyebrow-lg text-ink-soft">
            {strip.period === "day" ? t("heat_period_day") : t("heat_period_night")}
          </span>
        )}
        <span className="text-mini num text-ink-soft">
          {formatTime(iso(strip.startMs), tz)} - {formatTime(iso(strip.endMs), tz)}
        </span>
      </div>

      {model.best && (
        <div
          className="rounded-sm border-l-[3px] border border-parchment-200 bg-parchment-50 px-3 py-2"
          style={{ borderLeftColor: bestColor }}
          data-testid="heat-best-window"
        >
          <p className="eyebrow-lg" style={{ color: bestColor }}>
            {t("heat_best_window")}
          </p>
          <p className="value-strong num mt-0.5">
            {formatTime(iso(model.best.startMs), tz)} - {formatTime(iso(model.best.endMs), tz)}
            {model.best.lagnas.length > 0 && (
              <span className="text-meta font-normal text-ink-soft">
                {" "}
                · {t("heat_lagna")}:{" "}
                <span className="font-serif text-ink">
                  {model.best.lagnas.map((l) => a.sign(l)).join(", ")}
                </span>
              </span>
            )}
          </p>
        </div>
      )}

      <Strip strip={strip} tz={tz} selected={selected} onSelect={setSelected} />

      <Totals strip={strip} />

      {selected ? (
        <SlotDetail slot={selected} tz={tz} />
      ) : (
        <p className="meta">{t("heat_tap_hint")}</p>
      )}

      <div>
        <p className="eyebrow-lg text-ink-soft mb-1.5">{t("heat_timeline_title")}</p>
        <Timeline
          strip={strip}
          events={model.events}
          lagnas={model.lagnas}
          tz={tz}
          selected={selected}
          onSelectTime={selectTime}
        />
      </div>

      <div>
        <p className="eyebrow-lg text-ink-soft mb-1.5">{t("heat_table_title")}</p>
        <RunTable strip={strip} tz={tz} selected={selected} onSelectTime={selectTime} />
      </div>

      <p className="meta">{t("heat_rules")}</p>
    </div>
  );
}
