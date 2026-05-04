// Astronomical-name translations + native digits.
//
// Mirrors backend/pdf/core/i18n.py — same key shape (`planet_sun`,
// `sign_aries`, `nak_ashwini`) so both layers translate the same names with
// the same keys. Kept separate from i18n.tsx so the UI-string dictionary
// doesn't get bloated with the 49 astro names per language.

import { useI18n } from "@/i18n";

// Devanagari & Tamil routinely co-render with their native digits. CJK and
// European locales conventionally keep Latin digits for technical values
// (degrees, times, years), so we don't substitute there.
const NATIVE_DIGITS: Record<string, string> = {
  hi: "०१२३४५६७८९",
  ta: "௦௧௨௩௪௫௬௭௮௯",
};

type Dict = Record<string, string>;

const HI: Dict = {
  // Planets
  planet_ascendant: "लग्न",
  planet_sun: "सूर्य",
  planet_moon: "चन्द्र",
  planet_mars: "मंगल",
  planet_mercury: "बुध",
  planet_jupiter: "गुरु",
  planet_venus: "शुक्र",
  planet_saturn: "शनि",
  planet_rahu: "राहु",
  planet_ketu: "केतु",
  // Signs
  sign_aries: "मेष",
  sign_taurus: "वृषभ",
  sign_gemini: "मिथुन",
  sign_cancer: "कर्क",
  sign_leo: "सिंह",
  sign_virgo: "कन्या",
  sign_libra: "तुला",
  sign_scorpio: "वृश्चिक",
  sign_sagittarius: "धनु",
  sign_capricorn: "मकर",
  sign_aquarius: "कुम्भ",
  sign_pisces: "मीन",
  // Nakshatras
  nak_ashwini: "अश्विनी",
  nak_bharani: "भरणी",
  nak_krittika: "कृत्तिका",
  nak_rohini: "रोहिणी",
  nak_mrigashira: "मृगशिरा",
  nak_ardra: "आर्द्रा",
  nak_punarvasu: "पुनर्वसु",
  nak_pushya: "पुष्य",
  nak_ashlesha: "अश्लेषा",
  nak_magha: "मघा",
  nak_purva_phalguni: "पूर्वा फाल्गुनी",
  nak_uttara_phalguni: "उत्तरा फाल्गुनी",
  nak_hasta: "हस्त",
  nak_chitra: "चित्रा",
  nak_swati: "स्वाति",
  nak_vishakha: "विशाखा",
  nak_anuradha: "अनुराधा",
  nak_jyeshtha: "ज्येष्ठा",
  nak_mula: "मूल",
  nak_purva_ashadha: "पूर्वाषाढ़ा",
  nak_uttara_ashadha: "उत्तराषाढ़ा",
  nak_shravana: "श्रवण",
  nak_dhanishta: "धनिष्ठा",
  nak_shatabhisha: "शतभिषा",
  nak_purva_bhadrapada: "पूर्वा भाद्रपद",
  nak_uttara_bhadrapada: "उत्तरा भाद्रपद",
  nak_revati: "रेवती",
};

const TA: Dict = {
  planet_ascendant: "லக்னம்",
  planet_sun: "சூரியன்",
  planet_moon: "சந்திரன்",
  planet_mars: "செவ்வாய்",
  planet_mercury: "புதன்",
  planet_jupiter: "குரு",
  planet_venus: "சுக்கிரன்",
  planet_saturn: "சனி",
  planet_rahu: "ராகு",
  planet_ketu: "கேது",
  sign_aries: "மேஷம்",
  sign_taurus: "ரிஷபம்",
  sign_gemini: "மிதுனம்",
  sign_cancer: "கடகம்",
  sign_leo: "சிம்மம்",
  sign_virgo: "கன்னி",
  sign_libra: "துலாம்",
  sign_scorpio: "விருச்சிகம்",
  sign_sagittarius: "தனுசு",
  sign_capricorn: "மகரம்",
  sign_aquarius: "கும்பம்",
  sign_pisces: "மீனம்",
  nak_ashwini: "அஸ்வினி",
  nak_bharani: "பரணி",
  nak_krittika: "கிருத்திகை",
  nak_rohini: "ரோகிணி",
  nak_mrigashira: "மிருகசீரிடம்",
  nak_ardra: "திருவாதிரை",
  nak_punarvasu: "புனர்பூசம்",
  nak_pushya: "பூசம்",
  nak_ashlesha: "ஆயில்யம்",
  nak_magha: "மகம்",
  nak_purva_phalguni: "பூரம்",
  nak_uttara_phalguni: "உத்திரம்",
  nak_hasta: "அஸ்தம்",
  nak_chitra: "சித்திரை",
  nak_swati: "சுவாதி",
  nak_vishakha: "விசாகம்",
  nak_anuradha: "அனுஷம்",
  nak_jyeshtha: "கேட்டை",
  nak_mula: "மூலம்",
  nak_purva_ashadha: "பூராடம்",
  nak_uttara_ashadha: "உத்திராடம்",
  nak_shravana: "திருவோணம்",
  nak_dhanishta: "அவிட்டம்",
  nak_shatabhisha: "சதயம்",
  nak_purva_bhadrapada: "பூரட்டாதி",
  nak_uttara_bhadrapada: "உத்திரட்டாதி",
  nak_revati: "ரேவதி",
};

const ZH: Dict = {
  planet_ascendant: "上升点",
  planet_sun: "太阳",
  planet_moon: "月亮",
  planet_mars: "火星",
  planet_mercury: "水星",
  planet_jupiter: "木星",
  planet_venus: "金星",
  planet_saturn: "土星",
  planet_rahu: "罗睺",
  planet_ketu: "计都",
  sign_aries: "白羊座",
  sign_taurus: "金牛座",
  sign_gemini: "双子座",
  sign_cancer: "巨蟹座",
  sign_leo: "狮子座",
  sign_virgo: "处女座",
  sign_libra: "天秤座",
  sign_scorpio: "天蝎座",
  sign_sagittarius: "射手座",
  sign_capricorn: "摩羯座",
  sign_aquarius: "水瓶座",
  sign_pisces: "双鱼座",
};

const JA: Dict = {
  planet_ascendant: "アセンダント",
  planet_sun: "太陽",
  planet_moon: "月",
  planet_mars: "火星",
  planet_mercury: "水星",
  planet_jupiter: "木星",
  planet_venus: "金星",
  planet_saturn: "土星",
  planet_rahu: "ラーフ",
  planet_ketu: "ケートゥ",
  sign_aries: "牡羊座",
  sign_taurus: "牡牛座",
  sign_gemini: "双子座",
  sign_cancer: "蟹座",
  sign_leo: "獅子座",
  sign_virgo: "乙女座",
  sign_libra: "天秤座",
  sign_scorpio: "蠍座",
  sign_sagittarius: "射手座",
  sign_capricorn: "山羊座",
  sign_aquarius: "水瓶座",
  sign_pisces: "魚座",
};

const ES: Dict = {
  planet_ascendant: "Ascendente",
  planet_sun: "Sol",
  planet_moon: "Luna",
  planet_mars: "Marte",
  planet_mercury: "Mercurio",
  planet_jupiter: "Júpiter",
  planet_venus: "Venus",
  planet_saturn: "Saturno",
  planet_rahu: "Rahu",
  planet_ketu: "Ketu",
  sign_aries: "Aries",
  sign_taurus: "Tauro",
  sign_gemini: "Géminis",
  sign_cancer: "Cáncer",
  sign_leo: "Leo",
  sign_virgo: "Virgo",
  sign_libra: "Libra",
  sign_scorpio: "Escorpio",
  sign_sagittarius: "Sagitario",
  sign_capricorn: "Capricornio",
  sign_aquarius: "Acuario",
  sign_pisces: "Piscis",
};

const DE: Dict = {
  planet_ascendant: "Aszendent",
  planet_sun: "Sonne",
  planet_moon: "Mond",
  planet_mars: "Mars",
  planet_mercury: "Merkur",
  planet_jupiter: "Jupiter",
  planet_venus: "Venus",
  planet_saturn: "Saturn",
  planet_rahu: "Rahu",
  planet_ketu: "Ketu",
  sign_aries: "Widder",
  sign_taurus: "Stier",
  sign_gemini: "Zwillinge",
  sign_cancer: "Krebs",
  sign_leo: "Löwe",
  sign_virgo: "Jungfrau",
  sign_libra: "Waage",
  sign_scorpio: "Skorpion",
  sign_sagittarius: "Schütze",
  sign_capricorn: "Steinbock",
  sign_aquarius: "Wassermann",
  sign_pisces: "Fische",
};

const PT: Dict = {
  planet_ascendant: "Ascendente",
  planet_sun: "Sol",
  planet_moon: "Lua",
  planet_mars: "Marte",
  planet_mercury: "Mercúrio",
  planet_jupiter: "Júpiter",
  planet_venus: "Vénus",
  planet_saturn: "Saturno",
  planet_rahu: "Rahu",
  planet_ketu: "Ketu",
  sign_aries: "Carneiro",
  sign_taurus: "Touro",
  sign_gemini: "Gémeos",
  sign_cancer: "Caranguejo",
  sign_leo: "Leão",
  sign_virgo: "Virgem",
  sign_libra: "Balança",
  sign_scorpio: "Escorpião",
  sign_sagittarius: "Sagitário",
  sign_capricorn: "Capricórnio",
  sign_aquarius: "Aquário",
  sign_pisces: "Peixes",
};

const FR: Dict = {
  planet_ascendant: "Ascendant",
  planet_sun: "Soleil",
  planet_moon: "Lune",
  planet_mars: "Mars",
  planet_mercury: "Mercure",
  planet_jupiter: "Jupiter",
  planet_venus: "Vénus",
  planet_saturn: "Saturne",
  planet_rahu: "Rahu",
  planet_ketu: "Ketu",
  sign_aries: "Bélier",
  sign_taurus: "Taureau",
  sign_gemini: "Gémeaux",
  sign_cancer: "Cancer",
  sign_leo: "Lion",
  sign_virgo: "Vierge",
  sign_libra: "Balance",
  sign_scorpio: "Scorpion",
  sign_sagittarius: "Sagittaire",
  sign_capricorn: "Capricorne",
  sign_aquarius: "Verseau",
  sign_pisces: "Poissons",
};

const DICTS: Record<string, Dict> = {
  hi: HI,
  ta: TA,
  zh: ZH,
  ja: JA,
  es: ES,
  de: DE,
  pt: PT,
  fr: FR,
};

// Normalize "Purva Phalguni" → "purva_phalguni" so callers can pass the
// English name straight from the API and we resolve it to a key.
function toKey(prefix: string, name: string): string {
  return `${prefix}_${name.toLowerCase().replace(/\s+/g, "_")}`;
}

function lookup(prefix: string, name: string, lang: string): string {
  const dict = DICTS[lang];
  if (!dict) return name;
  return dict[toKey(prefix, name)] ?? name;
}

function toNativeDigits(value: string | number | null | undefined, lang: string): string {
  const s = String(value ?? "-");
  const digits = NATIVE_DIGITS[lang];
  if (!digits) return s;
  return s.replace(/[0-9]/g, (d) => digits[Number(d)]);
}

// Hook bound to the active language. Consumers call num/planet/sign/nakshatra
// without threading lang through every callsite.
export function useAstro() {
  const { lang } = useI18n();
  return {
    num: (v: string | number | null | undefined) => toNativeDigits(v, lang),
    planet: (n: string) => lookup("planet", n, lang),
    sign: (n: string) => lookup("sign", n, lang),
    nakshatra: (n: string) => lookup("nak", n, lang),
  };
}
