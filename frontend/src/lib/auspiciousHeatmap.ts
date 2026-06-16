// Auspicious-time heatmap model.
//
// Slices the day (sunrise -> sunset) and night (sunset -> next sunrise) into
// fixed-length blocks and scores each block by overlapping it with the panchang
// windows the backend already returns (Rahu Kalam, Abhijit, Nalla Neram, Hora,
// Tyajyam, ...). No backend call is needed - everything here is derived from a
// PanchangData payload that is already in the client.
//
// Each overlapping event contributes its weight; positives and negatives are
// pooled separately with a diminishing factor (see scoreEvents) so one slot
// covered by several windows of the same family doesn't run away. The block is
// then bucketed into one of five categories. Weights are adapted from github
// issue #92 and kept as named constants so they are easy to tune.

import type { PanchangData } from "@/types/api";

export type HeatCategory =
  | "highly-auspicious"
  | "auspicious"
  | "neutral"
  | "inauspicious"
  | "highly-inauspicious";

// An event id is a stable, translatable key; `labelKey` resolves via t().
export interface HeatEvent {
  id: string;
  labelKey: string;
  startMs: number;
  endMs: number;
  weight: number;
}

export interface HeatSlot {
  startMs: number;
  endMs: number;
  score: number;
  category: HeatCategory;
  // Event ids that overlap this slot, ordered strongest-effect first.
  events: { id: string; labelKey: string; weight: number }[];
}

export interface HeatStrip {
  // "day" = sunrise..sunset, "night" = sunset..next sunrise.
  period: "day" | "night";
  startMs: number;
  endMs: number;
  slots: HeatSlot[];
}

export interface BestWindow {
  startMs: number;
  endMs: number;
  score: number;
}

export interface HeatmapModel {
  day: HeatStrip | null;
  night: HeatStrip | null;
  best: BestWindow | null;
  // True when at least one slot carries a non-neutral event - lets the UI hide
  // the whole card when there is nothing meaningful to show.
  hasSignal: boolean;
}

// ---- Scoring weights (adapted from issue #92). Positive = auspicious. ----
// Magnitudes are deliberately moderate: classical "avoid" windows (Tyajyam,
// Rahu Kalam, ...) each cover 1-2 hours, so if any single one pinned a slot to
// the darkest tier the whole day would read as a wall of red. Instead a lone
// strong negative lands a slot in "inauspicious", and only *stacking* (e.g.
// Tyajyam during Rahu Kalam) pushes it to "highly-inauspicious". See
// scoreSlot() for how positives and negatives are combined.
const W = {
  amrita_yoga: 50,
  sarvartha_siddhi: 45,
  abhijit: 45,
  brahma_muhurta: 30,
  nalla_neram: 30,
  amrit_kalam: 30,
  ravi_yoga: 25,
  shubha_hora: 18,
  gowri_shubha: 12,
  vijay_muhurta: 18,
  godhuli: 12,
  // Negatives
  tyajyam: -45,
  durmuhurtam: -45,
  rahu_kalam: -45,
  yamaganda: -40,
  varjyam: -35,
  gulika: -30,
  bhadra: -25,
  gowri_ashubha: -14,
} as const;

const SLOT_MINUTES = 15;
const SLOT_MS = SLOT_MINUTES * 60_000;

// Hora lords / Gowri labels considered benefic.
const SHUBHA_HORA = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);
const SHUBHA_GOWRI = new Set(["Amridha", "Dhanam", "Sugam", "Labam"]);

function ms(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function pushWindow(
  out: HeatEvent[],
  id: string,
  labelKey: string,
  weight: number,
  start?: string | null,
  end?: string | null,
): void {
  const a = ms(start);
  const b = ms(end);
  if (a === null || b === null || b <= a) return;
  out.push({ id, labelKey, startMs: a, endMs: b, weight });
}

// Collect every scored window from the panchang payload as flat HeatEvents.
function collectEvents(data: PanchangData): HeatEvent[] {
  const ev: HeatEvent[] = [];
  const aus = data.auspicious_timings ?? {};
  const inaus = data.inauspicious_timings ?? {};

  // Auspicious single windows
  pushWindow(ev, "abhijit", "heat_ev_abhijit", W.abhijit, aus.abhijit?.start, aus.abhijit?.end);
  pushWindow(
    ev,
    "brahma_muhurta",
    "heat_ev_brahma",
    W.brahma_muhurta,
    aus.brahma_muhurta?.start,
    aus.brahma_muhurta?.end,
  );
  pushWindow(
    ev,
    "vijay_muhurta",
    "heat_ev_vijay",
    W.vijay_muhurta,
    aus.vijay_muhurta?.start,
    aus.vijay_muhurta?.end,
  );
  pushWindow(
    ev,
    "godhuli",
    "heat_ev_godhuli",
    W.godhuli,
    aus.godhuli_muhurta?.start,
    aus.godhuli_muhurta?.end,
  );
  (aus.amrit_kalam ?? []).forEach((w) =>
    pushWindow(ev, "amrit_kalam", "heat_ev_amrit", W.amrit_kalam, w.start, w.end),
  );
  (aus.sarvartha_siddhi_yoga ?? []).forEach((w) =>
    pushWindow(ev, "sarvartha", "heat_ev_sarvartha", W.sarvartha_siddhi, w.start, w.end),
  );
  (aus.amrita_siddhi_yoga ?? []).forEach((w) =>
    pushWindow(ev, "amrita_yoga", "heat_ev_amrita", W.amrita_yoga, w.start, w.end),
  );

  // Ravi Yoga (extra)
  const ravi = data.yogas_extra?.ravi_yoga;
  if (ravi) pushWindow(ev, "ravi_yoga", "heat_ev_ravi", W.ravi_yoga, ravi.start, ravi.end);

  // Inauspicious single windows
  pushWindow(
    ev,
    "rahu_kalam",
    "heat_ev_rahu",
    W.rahu_kalam,
    inaus.rahu_kalam?.start,
    inaus.rahu_kalam?.end,
  );
  pushWindow(
    ev,
    "yamaganda",
    "heat_ev_yama",
    W.yamaganda,
    inaus.yamaganda?.start,
    inaus.yamaganda?.end,
  );
  pushWindow(
    ev,
    "gulika",
    "heat_ev_gulika",
    W.gulika,
    inaus.gulika_kalam?.start,
    inaus.gulika_kalam?.end,
  );
  (inaus.dur_muhurtam ?? []).forEach((w) =>
    pushWindow(ev, "durmuhurtam", "heat_ev_durmuhurtam", W.durmuhurtam, w.start, w.end),
  );
  (inaus.bhadra ?? []).forEach((w) =>
    pushWindow(ev, "bhadra", "heat_ev_bhadra", W.bhadra, w.start, w.end),
  );
  (inaus.varjyam ?? []).forEach((w) =>
    pushWindow(ev, "varjyam", "heat_ev_varjyam", W.varjyam, w.start, w.end),
  );

  // Tyajyam family (all negative, strongest avoid)
  const ty = data.tyajyam;
  if (ty) {
    const tyLists = [
      ty.nakshatra_tyajyam,
      ty.tithi_tyajyam,
      ty.lagna_tyajyam,
      ty.karana_tyajyam ?? [],
      ty.tithi_lagna_tyajyam ?? [],
    ];
    tyLists.forEach((list) =>
      (list ?? []).forEach((w) =>
        pushWindow(ev, "tyajyam", "heat_ev_tyajyam", W.tyajyam, w.start, w.end),
      ),
    );
    if (ty.vara_tyajyam)
      pushWindow(
        ev,
        "tyajyam",
        "heat_ev_tyajyam",
        W.tyajyam,
        ty.vara_tyajyam.start,
        ty.vara_tyajyam.end,
      );
  }

  // Nalla Neram (Tamil auspicious slices)
  (data.nalla_neram ?? []).forEach((w) =>
    pushWindow(ev, "nalla_neram", "heat_ev_nalla", W.nalla_neram, w.start, w.end),
  );

  // Hora - benefic lords only contribute a positive bump.
  const horaSegs = [...(data.hora?.day ?? []), ...(data.hora?.night ?? [])];
  horaSegs.forEach((s) => {
    if (SHUBHA_HORA.has(s.name))
      pushWindow(ev, "shubha_hora", "heat_ev_shubha_hora", W.shubha_hora, s.start, s.end);
  });

  // Gowri Panchangam - tag benefic / malefic segments.
  const gowriSegs = [...(data.gowri_panchang?.day ?? []), ...(data.gowri_panchang?.night ?? [])];
  gowriSegs.forEach((s) => {
    if (s.auspicious || SHUBHA_GOWRI.has(s.name))
      pushWindow(ev, "gowri_shubha", "heat_ev_gowri_shubha", W.gowri_shubha, s.start, s.end);
    else pushWindow(ev, "gowri_ashubha", "heat_ev_gowri_ashubha", W.gowri_ashubha, s.start, s.end);
  });

  return ev;
}

export function categoryFor(score: number): HeatCategory {
  if (score >= 60) return "highly-auspicious";
  if (score >= 25) return "auspicious";
  if (score > -25) return "neutral";
  if (score > -70) return "inauspicious";
  return "highly-inauspicious";
}

// Combine a slot's deduped events into one score. Positives and negatives are
// pooled separately: the strongest of each sign counts in full, additional ones
// of the same sign contribute at a diminishing 50% so a slot covered by several
// overlapping windows of the same family (e.g. two Tyajyam spans) doesn't run
// away, but genuine stacking (Tyajyam + Rahu Kalam) still compounds.
function scoreEvents(events: { weight: number }[]): number {
  const pos = events
    .filter((e) => e.weight > 0)
    .map((e) => e.weight)
    .sort((a, b) => b - a);
  const neg = events
    .filter((e) => e.weight < 0)
    .map((e) => e.weight)
    .sort((a, b) => a - b);
  const pool = (xs: number[]) => xs.reduce((acc, w, i) => acc + (i === 0 ? w : w * 0.5), 0);
  return pool(pos) + pool(neg);
}

// Build the slots for one [start, end] strip.
function buildStrip(
  period: "day" | "night",
  startMs: number,
  endMs: number,
  events: HeatEvent[],
): HeatStrip {
  const slots: HeatSlot[] = [];
  for (let t = startMs; t < endMs; t += SLOT_MS) {
    const slotEnd = Math.min(t + SLOT_MS, endMs);
    // Dedupe overlapping windows by id - a slot covered by two Tyajyam spans
    // counts Tyajyam once. We keep the strongest-magnitude weight per id.
    const hits: { id: string; labelKey: string; weight: number }[] = [];
    for (const e of events) {
      // Overlap test against [t, slotEnd).
      if (e.startMs < slotEnd && e.endMs > t) {
        const prev = hits.find((h) => h.id === e.id);
        if (!prev) hits.push({ id: e.id, labelKey: e.labelKey, weight: e.weight });
        else if (Math.abs(e.weight) > Math.abs(prev.weight)) prev.weight = e.weight;
      }
    }
    hits.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    const score = Math.round(scoreEvents(hits));
    slots.push({
      startMs: t,
      endMs: slotEnd,
      score,
      category: categoryFor(score),
      events: hits,
    });
  }
  return { period, startMs, endMs, slots };
}

// Longest contiguous run of auspicious-or-better slots, tie-broken by total
// score. Returns null when nothing qualifies.
function findBestWindow(strips: HeatStrip[]): BestWindow | null {
  const all = strips.flatMap((s) => s.slots);
  let best: BestWindow | null = null;
  let runStart = -1;
  let runScore = 0;
  let runLen = 0;
  const flush = (endMs: number) => {
    if (runLen > 0 && runStart >= 0) {
      const candidate: BestWindow = { startMs: runStart, endMs, score: runScore };
      if (
        !best ||
        endMs - runStart > best.endMs - best.startMs ||
        (endMs - runStart === best.endMs - best.startMs && runScore > best.score)
      )
        best = candidate;
    }
    runStart = -1;
    runScore = 0;
    runLen = 0;
  };
  for (const slot of all) {
    const good = slot.score >= 25; // auspicious or highly-auspicious
    if (good) {
      if (runStart < 0) runStart = slot.startMs;
      runScore += slot.score;
      runLen += 1;
    } else {
      flush(slot.startMs);
    }
  }
  if (runLen > 0 && all.length) flush(all[all.length - 1].endMs);
  return best;
}

export function buildHeatmap(data: PanchangData): HeatmapModel {
  const sunrise = ms(data.sun_moon?.sunrise);
  const sunset = ms(data.sun_moon?.sunset);
  const events = collectEvents(data);

  let day: HeatStrip | null = null;
  let night: HeatStrip | null = null;

  if (sunrise !== null && sunset !== null && sunset > sunrise) {
    day = buildStrip("day", sunrise, sunset, events);
  }

  // Night strip: sunset -> next sunrise. We derive next sunrise from the latest
  // event end if no explicit value is present; fall back to sunset + 12h.
  if (sunset !== null) {
    const explicitNext = ms(data.sun_moon?.moonrise) ? null : null; // no next-sunrise field
    const horaNightEnds = (data.hora?.night ?? [])
      .map((s) => ms(s.end))
      .filter((x): x is number => x !== null);
    const nextSunrise =
      explicitNext ?? (horaNightEnds.length ? Math.max(...horaNightEnds) : sunset + 12 * 3_600_000);
    if (nextSunrise > sunset) night = buildStrip("night", sunset, nextSunrise, events);
  }

  const strips = [day, night].filter((s): s is HeatStrip => s !== null);
  const best = findBestWindow(strips);
  const hasSignal = strips.some((s) => s.slots.some((sl) => sl.events.length > 0));

  return { day, night, best, hasSignal };
}
