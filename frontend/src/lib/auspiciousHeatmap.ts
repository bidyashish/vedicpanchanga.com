// Auspicious-time heatmap model.
//
// Slices the day (sunrise -> sunset) and night (sunset -> next sunrise) into
// fixed-length blocks and grades each block from the panchang windows the
// backend already returns (Rahu Kalam, Abhijit, Nalla Neram, Hora, Tyajyam,
// ...) plus the Udaya Lagna rising at that time. No backend call is needed -
// everything here is derived from a PanchangData payload that is already in
// the client.
//
// Grading is rule-based, not a blended score (github issue #92 review):
//
//   1. A block that overlaps any "block" window (Rahu Kalam, Yamagandam,
//      Gulika, Durmuhurtam, Varjyam / Nakshatra Tyajyam, Dosha periods such
//      as eclipses and Guru / Sukra Asthamanam) is Highly Inauspicious,
//      whatever favourable yogas are active.
//   2. Otherwise a block that overlaps any "avoid" window (the other Tyajyam
//      portions, Tamil-month avoidables, Bhadra, Prabalarishta Yogam) is
//      Inauspicious.
//   3. Only blocks free of both are graded by their favourable windows
//      against the mild negatives (malefic Hora, unfavourable Gowri, Marana
//      Yogam, an inauspicious running limb), using a small pooled score that
//      maps to Excellent / Good / Neutral / Inauspicious. The quality of the
//      running Nakshatra / Tithi / Karana / Yoga (issue #48 tables) only
//      tilts this score - a favourable limb never makes a slot Excellent on
//      its own.
//
// Weights only matter inside step 3 and for ordering; they are named
// constants so they are easy to tune.
//
// On top of the strips, favourableWindows() lists every span of at least
// MIN_FAVOURABLE_MINUTES graded Favourable or better, split by the rising
// Lagna - the "Favourable timings" list the Muhurta page reuses.

import type { LabelledSegment, PanchangData } from "@/types/api";

export type HeatCategory =
  | "highly-auspicious"
  | "auspicious"
  | "neutral"
  | "inauspicious"
  | "highly-inauspicious";

// How an event takes part in the verdict (see categorize()).
//   block - overrides everything: the slot is highly-inauspicious.
//   avoid - caps the slot at inauspicious.
//   soft  - mild negative, only lowers the score.
//   major - favourable muhurta / yoga window.
//   minor - favourable but weak (benefic Hora, favourable Gowri, ...).
export type HeatKind = "block" | "avoid" | "major" | "minor" | "soft";

// How the UI localizes an event's `name` (planet via useAstro().planet, a
// dosha code via t("dosha_<code>"), ...).
export type HeatNameKind =
  | "planet"
  | "gowri"
  | "nakshatra"
  | "tithi"
  | "karana"
  | "yoga"
  | "yogam"
  | "sign"
  | "dosha";

// An event id is a stable, translatable key; `labelKey` resolves via t().
// `name` is an optional backend name (Hora planet, Gowri segment, the
// nakshatra a Tyajyam belongs to, ...) shown on the timeline bars and in the
// slot detail; `nameKind` tells the UI how to localize it.
export interface HeatEvent {
  id: string;
  labelKey: string;
  kind: HeatKind;
  weight: number;
  startMs: number;
  endMs: number;
  name?: string;
  nameKind?: HeatNameKind;
}

export interface HeatHit {
  id: string;
  labelKey: string;
  kind: HeatKind;
  weight: number;
  name?: string;
  nameKind?: HeatNameKind;
}

export interface HeatSlot {
  startMs: number;
  endMs: number;
  score: number;
  category: HeatCategory;
  // Rashi name (as sent by the backend, e.g. "Mithuna") of the Udaya Lagna
  // rising at the slot midpoint; null when the payload has no lagna data.
  lagna: string | null;
  // Event ids that overlap this slot, strongest effect first.
  events: HeatHit[];
}

// Consecutive slots with the same verdict, lagna and event set, merged into
// one row for the slot-by-slot table.
export interface HeatRun {
  startMs: number;
  endMs: number;
  category: HeatCategory;
  lagna: string | null;
  events: HeatHit[];
  slotCount: number;
}

export interface HeatStrip {
  // "day" = sunrise..sunset, "night" = sunset..next sunrise.
  period: "day" | "night";
  startMs: number;
  endMs: number;
  slots: HeatSlot[];
  runs: HeatRun[];
  // Milliseconds of the strip spent in each category.
  totals: Record<HeatCategory, number>;
}

// A contiguous span graded Favourable or better, split by rising Lagna.
export interface FavourableWindow {
  startMs: number;
  endMs: number;
  // Rashi name of the Lagna rising throughout; null when the payload has no
  // lagna data.
  lagna: string | null;
  // "highly-auspicious" when every slot is Excellent, else "auspicious".
  category: HeatCategory;
}

export interface LagnaSpan {
  rashi: string;
  startMs: number;
  endMs: number;
}

export interface HeatmapModel {
  day: HeatStrip | null;
  night: HeatStrip | null;
  // Favourable spans of MIN_FAVOURABLE_MINUTES or more, in time order.
  favourable: FavourableWindow[];
  // Every window that took part, for the timeline rows.
  events: HeatEvent[];
  lagnas: LagnaSpan[];
  // True when at least one slot carries an event - lets the UI hide the
  // whole card when there is nothing meaningful to show.
  hasSignal: boolean;
}

// ---- Weights (favourable > 0, mild negatives < 0). ----
// Block / avoid windows carry a weight only so lists sort consistently; the
// verdict for them never depends on it.
const W = {
  // major favourable
  amrita_yoga: 50,
  abhijit: 50,
  sarvartha: 45,
  brahma_muhurta: 30,
  nalla_neram: 30,
  amrit_kalam: 30,
  ravi_yoga: 25,
  amritadi_amrita: 30,
  // minor favourable
  shubha_hora: 20,
  vijay_muhurta: 18,
  godhuli: 12,
  gowri_shubha: 12,
  amritadi_siddha: 12,
  // mild negatives
  ashubha_hora: -15,
  gowri_ashubha: -15,
  amritadi_marana: -20,
  // caps (avoid) and overrides (block)
  avoid: -50,
  block: -100,
} as const;

// Score thresholds for slots free of block / avoid windows.
const EXCELLENT_AT = 60;
const GOOD_AT = 25;
const INAUSPICIOUS_BELOW = -20;

// 5-minute blocks (issue #92 follow-up: 15-minute blocks hid short
// favourable spans because any overlap marks the whole block).
export const SLOT_MINUTES = 5;
const SLOT_MS = SLOT_MINUTES * 60_000;

// Shortest span worth listing under "Favourable timings".
export const MIN_FAVOURABLE_MINUTES = 30;

// ---- Quality of the running panchang limbs (issue #48 tables) ----
// Weighted by the classical importance parts (Nakshatra 4, Yoga 3, Karana 2,
// Tithi 1, scaled x2): "Highly Auspicious" adds the full weight, "Auspicious"
// half of it, "Inauspicious" subtracts the full weight as a mild negative
// and "Mixed" limbs add nothing (and are not shown). Names follow the
// backend spellings in constants.py.
type LimbClass = "high" | "good" | "mixed" | "bad";

const NAKSHATRA_CLASS: Record<string, LimbClass> = {
  Ashwini: "high",
  Rohini: "high",
  Mrigashira: "high",
  Punarvasu: "high",
  Pushya: "high",
  Hasta: "high",
  Anuradha: "high",
  Shravana: "high",
  Revati: "high",
  "Uttara Phalguni": "good",
  "Uttara Ashadha": "good",
  "Uttara Bhadrapada": "good",
  Swati: "good",
  Chitra: "good",
  Dhanishta: "good",
  Bharani: "mixed",
  Krittika: "mixed",
  Ardra: "mixed",
  "Purva Phalguni": "mixed",
  Vishakha: "mixed",
  Shatabhisha: "mixed",
  Ashlesha: "bad",
  Magha: "bad",
  Jyeshtha: "bad",
  Mula: "bad",
  "Purva Ashadha": "bad",
  "Purva Bhadrapada": "bad",
};

// Keyed by the tithi ordinal without its paksha ("Shukla Navami" -> "Navami").
const TITHI_CLASS: Record<string, LimbClass> = {
  Dwitiya: "high",
  Tritiya: "high",
  Panchami: "high",
  Saptami: "high",
  Dashami: "high",
  Ekadashi: "high",
  Trayodashi: "high",
  Pratipada: "good",
  Shashthi: "good",
  Dwadashi: "good",
  Navami: "mixed",
  Purnima: "mixed",
  Chaturthi: "bad",
  Ashtami: "bad",
  Chaturdashi: "bad",
  Amavasya: "bad",
};

const KARANA_CLASS: Record<string, LimbClass> = {
  Bava: "high",
  Balava: "high",
  Kaulava: "high",
  Taitila: "high",
  Gara: "good",
  Vanija: "good",
  Shakuni: "mixed",
  Kimstughna: "mixed",
  Vishti: "bad",
  Chatushpada: "bad",
  Naga: "bad",
};

// Shobhana, Siddhi and Shukla are missing from the issue #48 table; they are
// classed Auspicious here as in the standard nitya-yoga lists.
const YOGA_CLASS: Record<string, LimbClass> = {
  Siddha: "high",
  Shubha: "high",
  Brahma: "high",
  Indra: "high",
  Dhruva: "high",
  Harshana: "high",
  Saubhagya: "good",
  Shiva: "good",
  Sadhya: "good",
  Variyana: "good",
  Priti: "good",
  Shobhana: "good",
  Siddhi: "good",
  Shukla: "good",
  Vishkumbha: "mixed",
  Ayushman: "mixed",
  Sukarma: "mixed",
  Dhriti: "mixed",
  Vriddhi: "mixed",
  Atiganda: "bad",
  Shula: "bad",
  Ganda: "bad",
  Vyaghata: "bad",
  Vajra: "bad",
  Vyatipata: "bad",
  Parigha: "bad",
  Vaidhriti: "bad",
};

const LIMB_WEIGHT = { nakshatra: 8, yoga: 6, karana: 4, tithi: 2 } as const;

// Hora lords / Gowri labels considered benefic.
const SHUBHA_HORA = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);
const SHUBHA_GOWRI = new Set(["Amridha", "Dhanam", "Sugam", "Labam"]);

const KIND_RANK: Record<HeatKind, number> = { block: 0, avoid: 1, major: 2, minor: 3, soft: 4 };

export const CATEGORIES: HeatCategory[] = [
  "highly-auspicious",
  "auspicious",
  "neutral",
  "inauspicious",
  "highly-inauspicious",
];

function ms(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function pushWindow(
  out: HeatEvent[],
  id: string,
  labelKey: string,
  kind: HeatKind,
  weight: number,
  start?: string | null,
  end?: string | null,
  name?: string,
  nameKind?: HeatNameKind,
): void {
  const a = ms(start);
  const b = ms(end);
  if (a === null || b === null || b <= a) return;
  out.push({ id, labelKey, kind, weight, startMs: a, endMs: b, name, nameKind });
}

// One event per limb span, graded by its class. Mixed limbs emit nothing.
function pushLimb(
  out: HeatEvent[],
  id: "limb_nakshatra" | "limb_tithi" | "limb_karana" | "limb_yoga",
  nameKind: HeatNameKind,
  cls: LimbClass | undefined,
  weight: number,
  start?: string | null,
  end?: string | null,
  name?: string,
): void {
  if (!cls || cls === "mixed") return;
  if (cls === "bad") pushWindow(out, id, id, "soft", -weight, start, end, name, nameKind);
  else
    pushWindow(
      out,
      id,
      id,
      "minor",
      cls === "high" ? weight : weight / 2,
      start,
      end,
      name,
      nameKind,
    );
}

const tithiOrdinal = (name: string) => name.replace(/^(Shukla|Krishna)\s+/, "");

// Collect every window from the panchang payload as flat HeatEvents.
function collectEvents(data: PanchangData): HeatEvent[] {
  const ev: HeatEvent[] = [];
  const aus = data.auspicious_timings ?? {};
  const inaus = data.inauspicious_timings ?? {};

  // ---- Favourable single windows ----
  pushWindow(
    ev,
    "abhijit",
    "heat_ev_abhijit",
    "major",
    W.abhijit,
    aus.abhijit?.start,
    aus.abhijit?.end,
  );
  pushWindow(
    ev,
    "brahma_muhurta",
    "heat_ev_brahma",
    "major",
    W.brahma_muhurta,
    aus.brahma_muhurta?.start,
    aus.brahma_muhurta?.end,
  );
  pushWindow(
    ev,
    "vijay_muhurta",
    "heat_ev_vijay",
    "minor",
    W.vijay_muhurta,
    aus.vijay_muhurta?.start,
    aus.vijay_muhurta?.end,
  );
  pushWindow(
    ev,
    "godhuli",
    "heat_ev_godhuli",
    "minor",
    W.godhuli,
    aus.godhuli_muhurta?.start,
    aus.godhuli_muhurta?.end,
  );
  (aus.amrit_kalam ?? []).forEach((w) =>
    pushWindow(ev, "amrit_kalam", "heat_ev_amrit", "major", W.amrit_kalam, w.start, w.end),
  );
  (aus.sarvartha_siddhi_yoga ?? []).forEach((w) =>
    pushWindow(ev, "sarvartha", "heat_ev_sarvartha", "major", W.sarvartha, w.start, w.end),
  );
  (aus.amrita_siddhi_yoga ?? []).forEach((w) =>
    pushWindow(ev, "amrita_yoga", "heat_ev_amrita", "major", W.amrita_yoga, w.start, w.end),
  );
  const ravi = data.yogas_extra?.ravi_yoga;
  if (ravi) pushWindow(ev, "ravi_yoga", "heat_ev_ravi", "major", W.ravi_yoga, ravi.start, ravi.end);
  (data.nalla_neram ?? []).forEach((w) =>
    pushWindow(ev, "nalla_neram", "heat_ev_nalla", "major", W.nalla_neram, w.start, w.end),
  );

  // ---- Blocking windows (override everything) ----
  pushWindow(
    ev,
    "rahu_kalam",
    "heat_ev_rahu",
    "block",
    W.block,
    inaus.rahu_kalam?.start,
    inaus.rahu_kalam?.end,
  );
  pushWindow(
    ev,
    "yamaganda",
    "heat_ev_yama",
    "block",
    W.block,
    inaus.yamaganda?.start,
    inaus.yamaganda?.end,
  );
  pushWindow(
    ev,
    "gulika",
    "heat_ev_gulika",
    "block",
    W.block,
    inaus.gulika_kalam?.start,
    inaus.gulika_kalam?.end,
  );
  (inaus.dur_muhurtam ?? []).forEach((w) =>
    pushWindow(ev, "durmuhurtam", "heat_ev_durmuhurtam", "block", W.block, w.start, w.end),
  );
  (inaus.varjyam ?? []).forEach((w) =>
    pushWindow(ev, "varjyam", "heat_ev_varjyam", "block", W.block, w.start, w.end),
  );

  // ---- Tyajyam family and Bhadra ----
  // Nakshatra Tyajyam is the same avoidance as Varjyam (a second table for
  // the same window) so it blocks, and so do the Dosha periods (eclipses,
  // Guru / Sukra Asthamanam). The finer Tamil portions (tithi, vara, lagna,
  // tithi-lagna, karana), the Tamil-month avoidables and Bhadra cap the slot
  // at inauspicious. Labels reuse the Tyajyam section keys so both read the
  // same; Gowri Tyajyam is skipped because the Gowri rows below already
  // carry those segments.
  const ty = data.tyajyam;
  if (ty) {
    (ty.nakshatra_tyajyam ?? []).forEach((w) =>
      pushWindow(
        ev,
        "tyajyam_nakshatra",
        "tyajyam_nakshatra",
        "block",
        W.block,
        w.start,
        w.end,
        w.nakshatra,
        "nakshatra",
      ),
    );
    (ty.dosha_tyajyam ?? []).forEach((w) =>
      pushWindow(
        ev,
        "tyajyam_dosha",
        "tyajyam_dosha",
        "block",
        W.block,
        w.start,
        w.end,
        w.dosha,
        "dosha",
      ),
    );
    (ty.tithi_tyajyam ?? []).forEach((w) =>
      pushWindow(
        ev,
        "tyajyam_tithi",
        "tyajyam_tithi",
        "avoid",
        W.avoid,
        w.start,
        w.end,
        w.tithi,
        "tithi",
      ),
    );
    if (ty.vara_tyajyam)
      pushWindow(
        ev,
        "tyajyam_vara",
        "tyajyam_vara",
        "avoid",
        W.avoid,
        ty.vara_tyajyam.start,
        ty.vara_tyajyam.end,
      );
    (ty.lagna_tyajyam ?? []).forEach((w) =>
      pushWindow(
        ev,
        "tyajyam_lagna",
        "tyajyam_lagna",
        "avoid",
        W.avoid,
        w.start,
        w.end,
        w.sign,
        "sign",
      ),
    );
    (ty.tithi_lagna_tyajyam ?? []).forEach((w) =>
      pushWindow(
        ev,
        "tyajyam_tithi_lagna",
        "tyajyam_tithi_lagna",
        "avoid",
        W.avoid,
        w.start,
        w.end,
        w.sign,
        "sign",
      ),
    );
    // Karana Tyajyam for Vishti is exactly the Bhadra span below - keep the
    // other inauspicious karanas (Chatushpada, Naga) only.
    (ty.karana_tyajyam ?? [])
      .filter((w) => w.karana !== "Vishti")
      .forEach((w) =>
        pushWindow(
          ev,
          "tyajyam_karana",
          "tyajyam_karana",
          "avoid",
          W.avoid,
          w.start,
          w.end,
          w.karana,
          "karana",
        ),
      );
    (ty.tamil_month_avoidables?.windows ?? []).forEach((w) =>
      pushWindow(
        ev,
        "tyajyam_tamil_month",
        "tyajyam_tamil_month",
        "avoid",
        W.avoid,
        w.start,
        w.end,
        w.name,
        w.kind === "lagna" ? "sign" : w.kind,
      ),
    );
    // Amritadi Yogam (weekday x nakshatra): Amrita lifts strongly, Siddha
    // mildly, Marana weighs down and Prabalarishta caps at inauspicious.
    (ty.amritadi_yogam ?? []).forEach((w) => {
      const y = w.yogam;
      if (y === "Amrita")
        pushWindow(
          ev,
          "amritadi",
          "amritadi_title",
          "major",
          W.amritadi_amrita,
          w.start,
          w.end,
          y,
          "yogam",
        );
      else if (y === "Siddha")
        pushWindow(
          ev,
          "amritadi",
          "amritadi_title",
          "minor",
          W.amritadi_siddha,
          w.start,
          w.end,
          y,
          "yogam",
        );
      else if (y === "Marana")
        pushWindow(
          ev,
          "amritadi",
          "amritadi_title",
          "soft",
          W.amritadi_marana,
          w.start,
          w.end,
          y,
          "yogam",
        );
      else if (y === "Prabalarishta")
        pushWindow(ev, "amritadi", "amritadi_title", "avoid", W.avoid, w.start, w.end, y, "yogam");
    });
  }
  (inaus.bhadra ?? []).forEach((w) =>
    pushWindow(ev, "bhadra", "heat_ev_bhadra", "avoid", W.avoid, w.start, w.end),
  );

  // ---- Running limbs: Nakshatra / Tithi / Karana / Yoga quality ----
  // The *_sequence lists cover the whole local day with starts_at / ends_at.
  const pan = data.panchang;
  if (pan) {
    const w = LIMB_WEIGHT;
    (pan.nakshatra_sequence ?? []).forEach((n) => {
      if (n.name)
        pushLimb(
          ev,
          "limb_nakshatra",
          "nakshatra",
          NAKSHATRA_CLASS[n.name],
          w.nakshatra,
          n.starts_at,
          n.ends_at,
          n.name,
        );
    });
    (pan.tithi_sequence ?? []).forEach((x) => {
      if (x.name)
        pushLimb(
          ev,
          "limb_tithi",
          "tithi",
          TITHI_CLASS[tithiOrdinal(x.name)],
          w.tithi,
          x.starts_at,
          x.ends_at,
          x.name,
        );
    });
    (pan.karana_sequence ?? []).forEach((k) => {
      if (k.name)
        pushLimb(
          ev,
          "limb_karana",
          "karana",
          KARANA_CLASS[k.name],
          w.karana,
          k.starts_at,
          k.ends_at,
          k.name,
        );
    });
    (pan.yoga_sequence ?? []).forEach((y) => {
      if (y.name)
        pushLimb(
          ev,
          "limb_yoga",
          "yoga",
          YOGA_CLASS[y.name],
          w.yoga,
          y.starts_at,
          y.ends_at,
          y.name,
        );
    });
  }

  // ---- Hora: benefic lords lift, malefic lords (Sun, Mars, Saturn) weigh down ----
  const horaSegs: LabelledSegment[] = [...(data.hora?.day ?? []), ...(data.hora?.night ?? [])];
  horaSegs.forEach((s) => {
    if (SHUBHA_HORA.has(s.name))
      pushWindow(
        ev,
        "shubha_hora",
        "heat_ev_shubha_hora",
        "minor",
        W.shubha_hora,
        s.start,
        s.end,
        s.name,
        "planet",
      );
    else
      pushWindow(
        ev,
        "ashubha_hora",
        "heat_ev_ashubha_hora",
        "soft",
        W.ashubha_hora,
        s.start,
        s.end,
        s.name,
        "planet",
      );
  });

  // ---- Gowri Panchangam - favourable / unfavourable segments ----
  const gowriSegs: LabelledSegment[] = [
    ...(data.gowri_panchang?.day ?? []),
    ...(data.gowri_panchang?.night ?? []),
  ];
  gowriSegs.forEach((s) => {
    if (s.auspicious || SHUBHA_GOWRI.has(s.name))
      pushWindow(
        ev,
        "gowri_shubha",
        "heat_ev_gowri_shubha",
        "minor",
        W.gowri_shubha,
        s.start,
        s.end,
        s.name,
        "gowri",
      );
    else
      pushWindow(
        ev,
        "gowri_ashubha",
        "heat_ev_gowri_ashubha",
        "soft",
        W.gowri_ashubha,
        s.start,
        s.end,
        s.name,
        "gowri",
      );
  });

  return ev;
}

function collectLagnas(data: PanchangData): LagnaSpan[] {
  const out: LagnaSpan[] = [];
  for (const l of data.udaya_lagna ?? []) {
    const a = ms(l.start);
    const b = ms(l.end);
    if (a === null || b === null || b <= a) continue;
    out.push({ rashi: l.rashi, startMs: a, endMs: b });
  }
  return out;
}

export function lagnaAt(lagnas: LagnaSpan[], t: number): string | null {
  const hit = lagnas.find((l) => l.startMs <= t && t < l.endMs);
  return hit ? hit.rashi : null;
}

// Pooled score of the favourable and mild-negative hits: the strongest of
// each sign counts in full, the rest at a diminishing 50% so three
// overlapping favourable windows don't run away. Block / avoid hits are
// ignored here - they decide the verdict directly in categorize().
export function scoreEvents(events: HeatHit[]): number {
  const pool = (xs: number[]) => xs.reduce((acc, w, i) => acc + (i === 0 ? w : w * 0.5), 0);
  const pos = events
    .filter((e) => e.kind === "major" || e.kind === "minor")
    .map((e) => e.weight)
    .sort((a, b) => b - a);
  const neg = events
    .filter((e) => e.kind === "soft")
    .map((e) => e.weight)
    .sort((a, b) => a - b);
  return pool(pos) + pool(neg);
}

export function categorize(events: HeatHit[], score: number): HeatCategory {
  if (events.some((e) => e.kind === "block")) return "highly-inauspicious";
  if (events.some((e) => e.kind === "avoid")) return "inauspicious";
  if (score >= EXCELLENT_AT) return "highly-auspicious";
  if (score >= GOOD_AT) return "auspicious";
  if (score > INAUSPICIOUS_BELOW) return "neutral";
  return "inauspicious";
}

function emptyTotals(): Record<HeatCategory, number> {
  return {
    "highly-auspicious": 0,
    auspicious: 0,
    neutral: 0,
    inauspicious: 0,
    "highly-inauspicious": 0,
  };
}

function sameEvents(a: HeatHit[], b: HeatHit[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((h, i) => h.id === b[i].id && h.name === b[i].name);
}

// Build the slots for one [start, end] strip.
function buildStrip(
  period: "day" | "night",
  startMs: number,
  endMs: number,
  events: HeatEvent[],
  lagnas: LagnaSpan[],
): HeatStrip {
  const slots: HeatSlot[] = [];
  const totals = emptyTotals();
  for (let t = startMs; t < endMs; t += SLOT_MS) {
    const slotEnd = Math.min(t + SLOT_MS, endMs);
    // Dedupe overlapping windows by id - a slot covered by two Varjyam spans
    // counts Varjyam once.
    const hits: HeatHit[] = [];
    for (const e of events) {
      if (e.startMs < slotEnd && e.endMs > t && !hits.some((h) => h.id === e.id))
        hits.push({
          id: e.id,
          labelKey: e.labelKey,
          kind: e.kind,
          weight: e.weight,
          name: e.name,
          nameKind: e.nameKind,
        });
    }
    hits.sort(
      (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || Math.abs(b.weight) - Math.abs(a.weight),
    );
    const score = Math.round(scoreEvents(hits));
    const category = categorize(hits, score);
    totals[category] += slotEnd - t;
    slots.push({
      startMs: t,
      endMs: slotEnd,
      score,
      category,
      lagna: lagnaAt(lagnas, (t + slotEnd) / 2),
      events: hits,
    });
  }

  const runs: HeatRun[] = [];
  for (const s of slots) {
    const last = runs[runs.length - 1];
    if (
      last &&
      last.category === s.category &&
      last.lagna === s.lagna &&
      sameEvents(last.events, s.events)
    ) {
      last.endMs = s.endMs;
      last.slotCount += 1;
    } else {
      runs.push({
        startMs: s.startMs,
        endMs: s.endMs,
        category: s.category,
        lagna: s.lagna,
        events: s.events,
        slotCount: 1,
      });
    }
  }

  return { period, startMs, endMs, slots, runs, totals };
}

// Every contiguous span of auspicious-or-better slots, split where the
// rising Lagna changes, that lasts MIN_FAVOURABLE_MINUTES or more. Strips are
// walked in order (day, then night) so a span across sunset stays whole.
export function favourableWindows(strips: HeatStrip[]): FavourableWindow[] {
  const out: FavourableWindow[] = [];
  let run: HeatSlot[] = [];
  const flush = () => {
    if (run.length) {
      const startMs = run[0].startMs;
      const endMs = run[run.length - 1].endMs;
      if (endMs - startMs >= MIN_FAVOURABLE_MINUTES * 60_000)
        out.push({
          startMs,
          endMs,
          lagna: run[0].lagna,
          category: run.every((s) => s.category === "highly-auspicious")
            ? "highly-auspicious"
            : "auspicious",
        });
    }
    run = [];
  };
  for (const strip of strips) {
    for (const slot of strip.slots) {
      const good = slot.category === "auspicious" || slot.category === "highly-auspicious";
      if (!good) {
        flush();
        continue;
      }
      const last = run[run.length - 1];
      if (last && (last.lagna !== slot.lagna || last.endMs !== slot.startMs)) flush();
      run.push(slot);
    }
  }
  flush();
  return out;
}

export function buildHeatmap(data: PanchangData): HeatmapModel {
  const sunrise = ms(data.sun_moon?.sunrise);
  const sunset = ms(data.sun_moon?.sunset);
  const events = collectEvents(data);
  const lagnas = collectLagnas(data);

  let day: HeatStrip | null = null;
  let night: HeatStrip | null = null;

  if (sunrise !== null && sunset !== null && sunset > sunrise) {
    day = buildStrip("day", sunrise, sunset, events, lagnas);
  }

  // Night strip: sunset -> next sunrise. Prefer the backend's next_sunrise;
  // older payloads fall back to the end of the night Hora, then sunset + 12h.
  if (sunset !== null) {
    const horaNightEnds = (data.hora?.night ?? [])
      .map((s) => ms(s.end))
      .filter((x): x is number => x !== null);
    const nextSunrise =
      ms(data.sun_moon?.next_sunrise) ??
      (horaNightEnds.length ? Math.max(...horaNightEnds) : sunset + 12 * 3_600_000);
    if (nextSunrise > sunset) night = buildStrip("night", sunset, nextSunrise, events, lagnas);
  }

  const strips = [day, night].filter((s): s is HeatStrip => s !== null);
  const favourable = favourableWindows(strips);
  const hasSignal = strips.some((s) => s.slots.some((sl) => sl.events.length > 0));

  return { day, night, favourable, events, lagnas, hasSignal };
}
