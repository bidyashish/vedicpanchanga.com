import type { LangId } from "@/i18n";

const LANG_TO_LOCALE: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  bn: "bn-IN",
  ne: "ne-NP",
  zh: "zh-CN",
  ja: "ja-JP",
  es: "es-ES",
  de: "de-DE",
  pt: "pt-PT",
  fr: "fr-FR",
  ru: "ru-RU",
  ar: "ar-SA",
  fa: "fa-IR",
  he: "he-IL",
};

// All locales pin `-u-nu-latn` so numeric values stay in Latin digits;
// only labels (weekdays, months, astronomical names) get translated.
const baseLocale = (lang: string) => LANG_TO_LOCALE[lang] ?? "en-IN";

export function localeFor(lang: LangId | string | undefined): string {
  return lang ? `${baseLocale(lang)}-u-nu-latn` : "en-IN";
}

function activeLang(): string {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang || "en";
}

// Used by hoursToHMS so dinamana / ratrimana read naturally in script.
const HMS_SUFFIX: Record<string, { h: string; m: string; s: string }> = {
  hi: { h: "घं", m: "मि", s: "से" },
  ne: { h: "घं", m: "मि", s: "से" },
  ta: { h: "ம", m: "நி", s: "வி" },
  bn: { h: "ঘ", m: "মি", s: "সে" },
  ar: { h: "س", m: "د", s: "ث" },
  fa: { h: "س", m: "د", s: "ث" },
  zh: { h: "时", m: "分", s: "秒" },
  ja: { h: "時", m: "分", s: "秒" },
};

// English forces en-US so the meridiem is uppercase "AM"/"PM" (en-IN gives
// lowercase). All other languages use their LANG_TO_LOCALE entry.
function timeLocale(lang: string): string {
  const base = lang === "en" ? "en-US" : baseLocale(lang);
  return `${base}-u-nu-latn`;
}

// Localized weekdays/months but English AM/PM, so dayPeriod text never
// disagrees with the Latin digits we're rendering alongside it.
function formatIntl(d: Date, opts: Intl.DateTimeFormatOptions): string {
  const locale = timeLocale(activeLang());
  if (!opts.hour12) return new Intl.DateTimeFormat(locale, opts).format(d);
  const ampm =
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true, timeZone: opts.timeZone })
      .formatToParts(d)
      .find((p) => p.type === "dayPeriod")?.value ?? "AM";
  return new Intl.DateTimeFormat(locale, opts)
    .formatToParts(d)
    .map((p) => (p.type === "dayPeriod" ? ampm : p.value))
    .join("");
}

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
};

export function formatTime(iso?: string | null, tz?: string): string {
  if (!iso) return "-";
  return formatIntl(new Date(iso), { ...TIME_OPTS, timeZone: tz });
}

// "HH:MM" -> "05:35 AM" for display; the underlying form value stays "05:35".
export function formatHHMM(hhmm?: string | null): string {
  if (!hhmm) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return hhmm;
  const h = Math.min(Math.max(+m[1], 0), 23);
  const mm = Math.min(Math.max(+m[2], 0), 59);
  const d = new Date();
  d.setHours(h, mm, 0, 0);
  return formatIntl(d, TIME_OPTS);
}

export function meridiemLabels(): { am: string; pm: string } {
  return { am: "AM", pm: "PM" };
}

export function formatTimeWithDate(iso?: string | null, tz?: string, refDate?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const timePart = formatIntl(d, { ...TIME_OPTS, timeZone: tz });
  if (!refDate) return timePart;
  const refDay = new Date(refDate + "T00:00:00").toLocaleDateString("en-CA", {
    timeZone: tz,
  });
  const isoDay = d.toLocaleDateString("en-CA", { timeZone: tz });
  if (refDay === isoDay) return timePart;
  const suffix = formatIntl(d, { day: "numeric", month: "short", timeZone: tz });
  return `${timePart}, ${suffix}`;
}

export function formatTimeRange(startIso?: string, endIso?: string, tz?: string): string {
  if (!startIso || !endIso) return "-";
  try {
    return `${formatTime(startIso, tz)} - ${formatTime(endIso, tz)}`;
  } catch {
    return "-";
  }
}

// 24-hour "HH:MM" in Latin digits - sent to the backend as `birth_time`.
export function nowTimeInTz(tz?: string): string {
  try {
    return new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
  } catch {
    return "12:00";
  }
}

export function nowTimeWithSecondsInTz(tz?: string): string {
  try {
    return new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: tz,
    });
  } catch {
    return "12:00:00";
  }
}

// "Hh MMm SSs" for Dinamana / Ratrimana; unit labels translated, digits Latin.
export function hoursToHMS(h?: number): string {
  if (!h && h !== 0) return "-";
  const totalSec = Math.round(h * 3600);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const sfx = HMS_SUFFIX[activeLang()] ?? { h: "h", m: "m", s: "s" };
  return `${hh}${sfx.h} ${String(mm).padStart(2, "0")}${sfx.m} ${String(ss).padStart(2, "0")}${sfx.s}`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatBirthDate(iso: string, tz: string): string {
  return formatIntl(new Date(iso), {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: tz,
    hour12: true,
  });
}

export function formatLongDate(iso: string): string {
  return formatIntl(new Date(iso + "T12:00:00"), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  return formatIntl(new Date(iso), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDayMonthYear(iso: string): string {
  return formatIntl(new Date(iso + "T12:00:00"), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
