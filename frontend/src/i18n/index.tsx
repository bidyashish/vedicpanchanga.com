import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import en from "./locales/en";
import hi from "./locales/hi";
import ta from "./locales/ta";
import zh from "./locales/zh";
import ja from "./locales/ja";
import es from "./locales/es";
import de from "./locales/de";
import pt from "./locales/pt";
import fr from "./locales/fr";

export const LANGUAGES = [
  { id: "en", label: "English", native: "EN" },
  { id: "hi", label: "हिन्दी", native: "हिं" },
  { id: "ta", label: "தமிழ்", native: "த" },
  { id: "zh", label: "中文", native: "中" },
  { id: "ja", label: "日本語", native: "日" },
  { id: "es", label: "Español", native: "ES" },
  { id: "de", label: "Deutsch", native: "DE" },
  { id: "pt", label: "Português", native: "PT" },
  { id: "fr", label: "Français", native: "FR" },
] as const;

export type LangId = (typeof LANGUAGES)[number]["id"];

type Dict = Record<string, string>;

export const translations: Record<string, Dict> = {
  en,
  hi,
  ta,
  zh,
  ja,
  es,
  de,
  pt,
  fr,
};

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
    return initial;
  });

  const setLang = useCallback((next: LangId) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
    setLangState(next);
  }, []);

  useEffect(() => {
    localStorage.setItem("jk_lang", lang);
  }, [lang]);

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
