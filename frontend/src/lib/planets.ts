export const PLANET_LONG_NAMES: Record<string, string> = {
  Su: "Sūrya",
  Mo: "Chandra",
  Ma: "Maṅgala",
  Me: "Budha",
  Ju: "Guru",
  Ve: "Śukra",
  Sa: "Śani",
  Ra: "Rāhu",
  Ke: "Ketu",
  As: "Lagna",
  Lg: "Lagna",
};

// CSS variables resolved at draw time so the chart colours follow the
// active theme. `currentColor` falls back through `<svg color="…">`.
export const PLANET_COLORS: Record<string, string> = {
  Su: "var(--accent-sun)",
  Mo: "var(--accent-moon)",
  Ma: "var(--danger)",
  Me: "var(--success)",
  Ju: "var(--accent-amber)",
  Ve: "rgb(168 85 247)",  // violet-500 — readable in both themes
  Sa: "var(--ink-soft)",
  Ra: "var(--ink-soft)",
  Ke: "var(--ink-soft)",
  As: "var(--primary)",
  Lg: "var(--primary)",
};

export function planetTitle(abbr: string): string {
  return PLANET_LONG_NAMES[abbr] ?? abbr;
}

export function planetColor(abbr: string): string {
  return PLANET_COLORS[abbr] ?? "var(--ink)";
}

export const SIGN_SHORT = [
  "Ar", "Ta", "Ge", "Cn", "Le", "Vi",
  "Li", "Sc", "Sg", "Cp", "Aq", "Pi",
];

export const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export const SIGN_DEVA = [
  "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
  "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
];
