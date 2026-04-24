import { LANGUAGES, useI18n, type LangId } from "@/i18n";

const SELECT_BASE =
  "appearance-none bg-white border border-parchment-200 hover:border-saffron text-ink font-semibold rounded-md cursor-pointer focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30 transition-colors min-h-[40px]";

export function LanguageSwitcher({ testId = "lang-switcher" }: { testId?: string }) {
  const { lang, setLang } = useI18n();
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setLang(e.target.value as LangId);

  return (
    <>
      {/* Mobile: compact — native script only, narrow */}
      <div className="relative inline-block sm:hidden">
        <select
          data-testid={`${testId}-mobile`}
          value={lang}
          onChange={onChange}
          aria-label="Language"
          className={`${SELECT_BASE} text-sm pl-2.5 pr-7 py-1.5`}
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.native}
            </option>
          ))}
        </select>
        <Chevron />
      </div>

      {/* sm and up: full label */}
      <div className="relative hidden sm:inline-block">
        <select
          data-testid={testId}
          value={lang}
          onChange={onChange}
          aria-label="Language"
          className={`${SELECT_BASE} text-sm pl-3.5 pr-9 py-2`}
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.native} · {l.label}
            </option>
          ))}
        </select>
        <Chevron />
      </div>
    </>
  );
}

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-saffron"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
