import { useEffect, useRef, useState } from "react";
import { LANGUAGES, useI18n, type LangId } from "@/i18n";

// Visual approach:
//   Custom button shows a rotating animated label (decorative, attention-grabbing).
//   A native <select> sits on top with opacity 0 - it owns clicks, focus, keyboard
//   nav, and the dropdown popup. That keeps a11y and the OS-native picker free,
//   while the visible chrome can run an animation the native widget can't.
// Height + radius match ThemeToggle (h-8, rounded-sm) so the row aligns cleanly.

const ROTATE_MS = 2400;

const SHELL =
  "relative inline-flex items-center bg-white border border-parchment-200 hover:border-saffron text-ink rounded-sm transition-colors h-8 focus-within:border-saffron focus-within:ring-2 focus-within:ring-saffron/30";

export function LanguageSwitcher({ testId = "lang-switcher" }: { testId?: string }) {
  const { lang, setLang } = useI18n();
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLang(e.target.value as LangId);
    setPaused(true);
  };

  const [animIndex, setAnimIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    tickRef.current = window.setInterval(() => {
      setAnimIndex((i) => (i + 1) % LANGUAGES.length);
    }, ROTATE_MS);
    return () => {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
    };
  }, [paused]);

  // After a manual selection, hold for a beat, then resume rotating.
  useEffect(() => {
    if (!paused) return;
    const id = window.setTimeout(() => setPaused(false), 5000);
    return () => window.clearTimeout(id);
  }, [paused, lang]);

  const display = LANGUAGES[animIndex];
  const current = LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0];

  return (
    <>
      {/* Mobile: compact - native script only, narrow */}
      <div
        className={`${SHELL} ${paused ? "" : "lang-ring-pulse"} sm:hidden text-sm pl-2.5 pr-7`}
        dir="ltr"
        onMouseEnter={() => setPaused(true)}
        onFocus={() => setPaused(true)}
      >
        <span
          key={`m-${animIndex}`}
          className={`font-semibold leading-none ${paused ? "" : "lang-rotate-in"}`}
          aria-hidden="true"
        >
          {paused ? current.native : display.native}
        </span>
        <Chevron />
        <select
          data-testid={`${testId}-mobile`}
          value={lang}
          onChange={onChange}
          aria-label="Language"
          dir="ltr"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.native}
            </option>
          ))}
        </select>
      </div>

      {/* sm and up: native + label, animated */}
      <div
        className={`${SHELL} ${paused ? "" : "lang-ring-pulse"} hidden sm:inline-flex text-sm pl-3 pr-8 overflow-hidden`}
        dir="ltr"
        onMouseEnter={() => setPaused(true)}
        onFocus={() => setPaused(true)}
      >
        <span
          key={`d-${animIndex}-${paused ? "p" : "r"}`}
          className={`font-semibold whitespace-nowrap leading-none ${paused ? "" : "lang-rotate-in"}`}
          aria-hidden="true"
        >
          {paused ? `${current.native} · ${current.label}` : `${display.native} · ${display.label}`}
        </span>
        <Chevron />
        <select
          data-testid={testId}
          value={lang}
          onChange={onChange}
          aria-label="Language"
          dir="ltr"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.native} {"·"} {l.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-saffron"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
