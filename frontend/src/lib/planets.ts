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

export const PLANET_COLORS: Record<string, string> = {
  Su: "#B26329",
  Mo: "#3E5E8C",
  Ma: "#B05543",
  Me: "#1B5E20",
  Ju: "#B8860B",
  Ve: "#8E44AD",
  Sa: "#4A4A4A",
  Ra: "#5D4037",
  Ke: "#5D4037",
  As: "#993D2E",
  Lg: "#993D2E",
};

export function planetTitle(abbr: string): string {
  return PLANET_LONG_NAMES[abbr] ?? abbr;
}

export function planetColor(abbr: string): string {
  return PLANET_COLORS[abbr] ?? "#2C241B";
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
