import { LANGUAGES, useI18n, type LangId } from "@/i18n";

export function LanguageSwitcher({ testId = "lang-switcher" }: { testId?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className="relative inline-block">
      <select
        data-testid={testId}
        value={lang}
        onChange={(e) => setLang(e.target.value as LangId)}
        aria-label="Language"
        className="appearance-none bg-parchment-50 border border-gold text-ink text-xs font-semibold tracking-wider rounded-sm pl-2.5 pr-7 py-1.5 cursor-pointer hover:bg-parchment-100 focus:outline-none focus:ring-1 focus:ring-saffron"
      >
        {LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.native} · {l.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-crimson"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
