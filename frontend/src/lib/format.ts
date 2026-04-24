import type { LangId } from "@/i18n";

const LANG_TO_LOCALE: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  sa: "sa-IN",
  ta: "ta-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  te: "te-IN",
};

export function localeFor(lang: LangId | string | undefined): string {
  if (!lang) return "en-IN";
  return LANG_TO_LOCALE[lang] ?? "en-IN";
}

export function formatTime(iso?: string | null, tz?: string, locale = "en-IN"): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });
}

export function formatTimeWithDate(
  iso?: string | null,
  tz?: string,
  refDate?: string,
  locale = "en-IN",
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const timePart = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });
  if (!refDate) return timePart;
  const refDay = new Date(refDate + "T00:00:00").toLocaleDateString("en-CA", {
    timeZone: tz,
  });
  const isoDay = d.toLocaleDateString("en-CA", { timeZone: tz });
  if (refDay === isoDay) return timePart;
  const shortDate = d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    timeZone: tz,
  });
  return `${timePart}, ${shortDate}`;
}

export function formatTimeRange(
  startIso?: string,
  endIso?: string,
  tz?: string,
  locale = "en-IN",
): string {
  if (!startIso || !endIso) return "—";
  try {
    return `${formatTime(startIso, tz, locale)} — ${formatTime(endIso, tz, locale)}`;
  } catch {
    return "—";
  }
}

export function hoursToHMS(h?: number): string {
  if (!h && h !== 0) return "—";
  const totalSec = Math.round(h * 3600);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${hh}h ${String(mm).padStart(2, "0")}m ${String(ss).padStart(2, "0")}s`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatBirthDate(iso: string, tz: string, locale = "en-IN"): string {
  return new Date(iso).toLocaleString(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: tz,
  });
}

export function formatLongDate(iso: string, locale = "en-IN"): string {
  return new Date(iso + "T12:00:00").toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(iso: string, locale = "en-IN"): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDayMonthYear(iso: string, locale = "en-IN"): string {
  return new Date(iso + "T12:00:00").toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
