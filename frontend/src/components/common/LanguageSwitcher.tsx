import { useEffect, useState } from "react";
import { LANGUAGES, useI18n, type LangId } from "@/i18n";

// Visual approach:
//   Custom button shows a rotating animated label (decorative, attention-grabbing).
//   A native <select> sits on top with opacity 0 - it owns clicks, focus, keyboard
//   nav, and the dropdown popup. That keeps a11y and the OS-native picker free,
//   while the visible chrome can run an animation the native widget can't.
// Height + radius match ThemeToggle (h-8, rounded-sm) so the row aligns cleanly.
//
// Animation runs only on a "fresh visit" - when localStorage["jk_lang"] is empty
// at mount time - and auto-stops after 10 s. Returning visitors (or anyone who
// has already picked) see the static current selection from the start.

const ROTATE_MS = 2400;
const ANIMATE_FOR_MS = 10_000;

const SHELL =
  "relative inline-flex items-center bg-white border border-parchment-200 hover:border-saffron text-ink rounded-sm transition-colors h-8 focus-within:border-saffron focus-within:ring-2 focus-within:ring-saffron/30";

function isFreshVisit(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem("jk_lang");
}

export function LanguageSwitcher({ testId = "lang-switcher" }: { testId?: string }) {
  const { lang, setLang } = useI18n();

  const [animating, setAnimating] = useState<boolean>(isFreshVisit);
  const [animIndex, setAnimIndex] = useState(0);

  const stopAnim = () => setAnimating(false);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLang(e.target.value as LangId);
    stopAnim();
  };

  // Tick the rotating label while animating.
  useEffect(() => {
    if (!animating) return;
    const id = window.setInterval(() => {
      setAnimIndex((i) => (i + 1) % LANGUAGES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [animating]);

  // Hard cap at 10 s from mount, regardless of interaction.
  useEffect(() => {
    if (!animating) return;
    const id = window.setTimeout(stopAnim, ANIMATE_FOR_MS);
    return () => window.clearTimeout(id);
    // Run once - we don't restart the timer if animating flips off then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const display = LANGUAGES[animIndex];
  const current = LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0];
  const labelMobile = animating ? display.native : current.native;
  const labelDesktop = animating
    ? `${display.native} · ${display.label}`
    : `${current.native} · ${current.label}`;

  return (
    <>
      {/* Mobile: compact - native script only, narrow */}
      <div
        className={`${SHELL} ${animating ? "lang-ring-pulse" : ""} sm:hidden text-sm pl-2.5 pr-7`}
        dir="ltr"
        onMouseEnter={stopAnim}
        onFocus={stopAnim}
      >
        <span
          key={`m-${animating ? animIndex : "static"}`}
          className={`font-semibold leading-none ${animating ? "lang-rotate-in" : ""}`}
          aria-hidden="true"
        >
          {labelMobile}
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
        className={`${SHELL} ${animating ? "lang-ring-pulse" : ""} hidden sm:inline-flex text-sm pl-3 pr-8 overflow-hidden`}
        dir="ltr"
        onMouseEnter={stopAnim}
        onFocus={stopAnim}
      >
        <span
          key={`d-${animating ? animIndex : "static"}`}
          className={`font-semibold whitespace-nowrap leading-none ${animating ? "lang-rotate-in" : ""}`}
          aria-hidden="true"
        >
          {labelDesktop}
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
