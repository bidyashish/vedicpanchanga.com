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

// Returns the Intl locale tag for the given language, with the native
// numbering extension applied for ta/hi/bn/ne so date and time formatters
// emit native digits without callers having to remember which locales need
// the -u-nu- suffix.
export function localeFor(lang: LangId | string | undefined): string {
  if (!lang) return "en-IN";
  const base = LANG_TO_LOCALE[lang] ?? "en-IN";
  const ext = NUMBERING_SYSTEM[lang];
  return ext ? `${base}-u-nu-${ext}` : base;
}

// Read the active language from <html lang>, kept in sync by I18nProvider.
function activeLang(): string {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang || "en";
}

// Native numbering systems for langs where Intl's default locale would
// otherwise emit Latin digits. Forcing the numbering system via locale
// extension (-u-nu-<id>) keeps digits and other parts in the same script.
const NUMBERING_SYSTEM: Record<string, string> = {
  hi: "deva",
  ne: "deva",
  ta: "tamldec",
  bn: "beng",
};

// AM/PM in native script for langs where Intl ships English dayPeriod data
// (ta, hi, bn). For ne/ar/fa, Intl returns the proper script natively.
const MERIDIEM_NATIVE: Record<string, { am: string; pm: string }> = {
  hi: { am: "पू.", pm: "अप." },
  ta: { am: "மு.ப.", pm: "பி.ப." },
  bn: { am: "পূ.", pm: "অপ." },
};

// Compact h/m/s suffix per language. Used by hoursToHMS to keep dinamana /
// ratrimana readable in native script. Falls back to "h/m/s" when missing.
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

function timeLocale(lang: string): string {
  // English forces en-US so the meridiem renders as uppercase "AM"/"PM"
  // (en-IN would give lowercase "am"/"pm").
  if (lang === "en") return "en-US";
  const base = LANG_TO_LOCALE[lang] ?? "en-IN";
  const ext = NUMBERING_SYSTEM[lang];
  return ext ? `${base}-u-nu-${ext}` : base;
}

function activeLocale(): string {
  return timeLocale(activeLang());
}

// Single render path for all Intl-driven date/time output. Applies the active
// language's locale, native numbering, and (when hour12 is set) substitutes
// the dayPeriod for ta/hi/bn since Intl ships English "AM/PM" there.
function formatIntl(d: Date, opts: Intl.DateTimeFormatOptions): string {
  const lang = activeLang();
  const locale = timeLocale(lang);
  const meridiem = MERIDIEM_NATIVE[lang];
  if (!opts.hour12 || !meridiem) {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  }
  const parts = new Intl.DateTimeFormat(locale, opts).formatToParts(d);
  return parts
    .map((p) => {
      if (p.type === "dayPeriod") {
        return /^a/i.test(p.value) ? meridiem.am : meridiem.pm;
      }
      return p.value;
    })
    .join("");
}

// Convert ASCII digits to the active language's native script. Used by
// hoursToHMS where we build the string ourselves rather than asking Intl.
function toNativeDigits(s: string): string {
  const lang = activeLang();
  const sys = NUMBERING_SYSTEM[lang];
  if (!sys) return s;
  const baseTable: Record<string, string> = {
    deva: "०१२३४५६७८९",
    tamldec: "௦௧௨௩௪௫௬௭௮௯",
    beng: "০১২৩৪৫৬৭৮৯",
  };
  const digits = baseTable[sys];
  if (!digits) return s;
  return s.replace(/[0-9]/g, (d) => digits[Number(d)]);
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

// 24-hour wall-clock helper in Latin "HH:MM" form. Always returns Latin
// digits because the panchang page sends this string to the backend as
// `birth_time` - localized digits would fail server-side parsing. Callers
// that want the native-script form for display should wrap with a.num().
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

// Render a duration as "Hh MMm SSs" with native digits + native unit
// abbreviations when the active locale is ta/hi/bn/ne/ar/fa/zh/ja. Falls back
// to "h/m/s" otherwise. Used for Dinamana / Ratrimana on the panchang page.
export function hoursToHMS(h?: number): string {
  if (!h && h !== 0) return "-";
  const totalSec = Math.round(h * 3600);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const lang = activeLang();
  const sfx = HMS_SUFFIX[lang] ?? { h: "h", m: "m", s: "s" };
  const raw = `${hh}${sfx.h} ${String(mm).padStart(2, "0")}${sfx.m} ${String(ss).padStart(2, "0")}${sfx.s}`;
  return toNativeDigits(raw);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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

export { activeLang, activeLocale };
