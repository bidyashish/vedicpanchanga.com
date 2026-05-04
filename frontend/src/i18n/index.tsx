import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { suggestLang } from "@/lib/api";

import en from "./locales/en";
import hi from "./locales/hi";
import ta from "./locales/ta";
import bn from "./locales/bn";
import ne from "./locales/ne";
import zh from "./locales/zh";
import ja from "./locales/ja";
import es from "./locales/es";
import de from "./locales/de";
import pt from "./locales/pt";
import fr from "./locales/fr";
import ru from "./locales/ru";
import ar from "./locales/ar";
import fa from "./locales/fa";
import he from "./locales/he";

export const LANGUAGES = [
  { id: "en", label: "English", native: "EN" },
  { id: "hi", label: "हिन्दी", native: "हिं" },
  { id: "ta", label: "தமிழ்", native: "த" },
  { id: "bn", label: "বাংলা", native: "বা" },
  { id: "ne", label: "नेपाली", native: "ने" },
  { id: "zh", label: "中文", native: "中" },
  { id: "ja", label: "日本語", native: "日" },
  { id: "es", label: "Español", native: "ES" },
  { id: "de", label: "Deutsch", native: "DE" },
  { id: "pt", label: "Português", native: "PT" },
  { id: "fr", label: "Français", native: "FR" },
  { id: "ru", label: "Русский", native: "РУ" },
  { id: "ar", label: "العربية", native: "ع" },
  { id: "fa", label: "فارسی", native: "فا" },
  { id: "he", label: "עברית", native: "עב" },
] as const;

export type LangId = (typeof LANGUAGES)[number]["id"];

type Dict = Record<string, string>;

export const translations: Record<string, Dict> = {
  en,
  hi,
  ta,
  bn,
  ne,
  zh,
  ja,
  es,
  de,
  pt,
  fr,
  ru,
  ar,
  fa,
  he,
};

const RTL_LANGS = new Set<LangId>(["ar", "fa", "he"]);

function applyDir(lang: LangId) {
  if (typeof document !== "undefined") {
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  }
}

type I18nContextValue = {
  lang: LangId;
  t: (key: string) => string;
  setLang: (l: LangId) => void;
};

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  t: (k) => k,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangId>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("jk_lang") : null;
    // Stale entries from a previous (8-language) build can carry IDs we no
    // longer ship (sa/bn/mr/gu/te). Guard against that so the dropdown
    // doesn't render an out-of-list value on first load.
    const known = new Set(LANGUAGES.map((l) => l.id));
    const initial = (saved && known.has(saved as LangId) ? (saved as LangId) : "en") as LangId;
    if (typeof document !== "undefined") {
      document.documentElement.lang = initial;
    }
    applyDir(initial);
    return initial;
  });

  // localStorage write lives inside setLang (not a separate useEffect) so the
  // geo-suggestion below can reliably tell "user has never picked" from "user
  // is on default en" - the persistence effect would otherwise stamp "en"
  // on first mount and shadow the signal.
  const setLang = useCallback((next: LangId) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
    applyDir(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("jk_lang", next);
    }
    setLangState(next);
  }, []);

  // First-load geo suggestion: if the user has never picked a language, ask
  // the backend (which reads Cloudflare's CF-IPCountry header) for a sensible
  // default. Fails silently - English stays the fallback.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("jk_lang")) return;
    const known = new Set(LANGUAGES.map((l) => l.id));
    suggestLang()
      .then((d) => {
        if (d?.lang && d.lang !== "en" && known.has(d.lang as LangId)) {
          setLang(d.lang as LangId);
        }
      })
      .catch(() => {});
  }, [setLang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
