import type { LangId } from "@/i18n";

const VARGA_NAMES_DEVA: Record<number, string> = {
  1: "राशि",
  2: "होरा",
  3: "द्रेक्काण",
  4: "चतुर्थांश",
  7: "सप्तांश",
  9: "नवांश",
  10: "दशांश",
  12: "द्वादशांश",
  16: "षोडशांश",
  20: "विंशांश",
  24: "चतुर्विंशांश",
  27: "भांश",
  30: "त्रिंशांश",
  40: "खवेदांश",
  45: "अक्षवेदांश",
  60: "षष्ट्यंश",
};

const VARGA_SUBTITLE_DEVA: Record<number, string> = {
  1: "देह · शरीर",
  2: "धन",
  3: "भ्राता · पराक्रम",
  4: "सुख · गृह",
  7: "संतान",
  9: "भाग्य · दाम्पत्य",
  10: "कर्म · आजीविका",
  12: "माता-पिता",
  16: "वाहन · सुख",
  20: "आध्यात्मिक प्रगति",
  24: "विद्या · शिक्षा",
  27: "बल-निर्बल",
  30: "अनिष्ट",
  40: "मातृ-वंश",
  45: "पितृ-वंश",
  60: "पूर्व-जन्म कर्म",
};

const DEVA_LANGS = new Set(["hi", "sa", "mr"]);

export function vargaName(division: number, fallback: string, lang: LangId | string): string {
  if (DEVA_LANGS.has(lang) && VARGA_NAMES_DEVA[division]) {
    return VARGA_NAMES_DEVA[division];
  }
  return fallback;
}

export function vargaSubtitle(
  division: number,
  fallback: string | undefined,
  lang: LangId | string,
): string | undefined {
  if (DEVA_LANGS.has(lang) && VARGA_SUBTITLE_DEVA[division]) {
    return VARGA_SUBTITLE_DEVA[division];
  }
  return fallback;
}
