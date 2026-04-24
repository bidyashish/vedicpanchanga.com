import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const LANGUAGES = [
  { id: "en", label: "English", native: "EN" },
  { id: "hi", label: "हिन्दी", native: "हिं" },
  { id: "sa", label: "संस्कृतम्", native: "सं" },
  { id: "ta", label: "தமிழ்", native: "த" },
  { id: "bn", label: "বাংলা", native: "বা" },
  { id: "mr", label: "मराठी", native: "म" },
  { id: "gu", label: "ગુજરાતી", native: "ગુ" },
  { id: "te", label: "తెలుగు", native: "తె" },
] as const;

export type LangId = (typeof LANGUAGES)[number]["id"];

type Dict = Record<string, string>;

const en: Dict = {
  brand_name: "VedicPanchanga",
  brand_domain: "vedicpanchanga.com",
  brand_tagline: "Sidereal · Lahiri",
  app_title: "Jyotiṣa Kuṇḍalī",
  app_subtitle: "Vedic birth chart drawn in the North-Indian tradition",
  sidereal_lahiri: "Sidereal · Lahiri",
  jyotisha: "॥ ज्योतिष ॥",
  shubham: "॥ शुभम् ॥",
  computed_with: "Computed with Swiss Ephemeris · Whole-Sign Houses",
  language: "Language",

  nav_kundali: "Kuṇḍalī",
  nav_panchang: "Pañcāṅga",
  nav_muhurta: "Muhūrta",

  muhurta_title: "Muhūrta Finder",
  muhurta_subtitle: "Find auspicious windows for any undertaking",
  muhurta_purpose: "Purpose",
  muhurta_start_date: "Start Date",
  muhurta_end_date: "End Date",
  muhurta_native_filter: "Native Filters (optional)",
  muhurta_native_sub: "For Chandrabalam & Tārabalam checks",
  muhurta_birth_rashi: "Birth Rāśi (Moon sign)",
  muhurta_birth_nak: "Birth Nakṣatra",
  muhurta_min_score: "Minimum Score",
  muhurta_find: "Find Muhūrtas",
  muhurta_searching: "Scanning heavens…",
  muhurta_no_matches: "No auspicious days found. Try a wider range or lower minimum score.",
  muhurta_score: "Score",
  muhurta_reasons: "Favourable",
  muhurta_cautions: "Cautions",
  muhurta_abhijit: "Abhijit",
  muhurta_rahu: "Rāhu Kāla",
  muhurta_sunrise_sunset: "Sunrise — Sunset",
  muhurta_results: "Recommended Days",
  muhurta_days_scanned: "days scanned",
  muhurta_matches_found: "matches",
  muhurta_location: "Location",
  muhurta_none: "— None —",

  birth_details: "Birth Details",
  enter_native_time_place: "Enter the native's time & place of birth",
  date_of_birth: "Date of Birth",
  time_of_birth: "Time of Birth",
  place_of_birth: "Place of Birth",
  search_city: "Search city…",
  ayanamsa: "Ayanāṁśa",
  latitude: "Latitude",
  longitude: "Longitude",
  generate_kundali: "Generate Kundali",
  casting_chart: "Casting Chart…",
  chart_style: "Chart Style",
  north_indian: "North Indian",
  south_indian: "South Indian",

  local: "Local",
  timezone: "Timezone",
  julian_day: "Julian Day",
  unnamed_native: "Unnamed Native",
  graha_positions: "Graha Positions",
  lagna_caption: "Lagna (Ascendant) is highlighted · Houses proceed anti-clockwise",

  dasha_title: "Vimshottari Mahādaśā",
  dasha_subtitle: "Full 120-year planetary cycle from birth",
  dasha_lord: "Mahādaśā Lord",
  dasha_years: "Years",
  dasha_from: "From",
  dasha_to: "To",

  ashtakavarga_title: "Aṣṭakavarga",
  ashtakavarga_sub: "Bhinnāṣṭakavarga per planet and Sarvāṣṭakavarga totals across the 12 signs",
  th_planet: "Planet",
  th_total: "Total",
  sav: "SAV",

  panchang_title: "Daily Drik Panchānga",
  panchang_stamp: "॥ पञ्चाङ्ग ॥",
  place: "Place",
  date: "Date",
  show_panchang: "Show Panchang",
  loading: "Loading…",
  use_my_location: "Use My Location",
  sunrise: "Sunrise",
  sunset: "Sunset",
  moonrise: "Moonrise",
  moonset: "Moonset",
  auspicious_title: "Auspicious Timings (Śubha)",
  inauspicious_title: "Inauspicious Timings (Aśubha)",
  udaya_lagna_title: "Udaya Lagna Muhūrta",
  udaya_lagna_sub: "Ascendant transits for the day",
  chandrabalam_title: "Chandrabalam",
  chandrabalam_sub: "Good Moon-strength for these Rāśi",
  tarabalam_title: "Tārabalam",
  tarabalam_sub: "Good Star-strength for these Nakṣatra",
  shool_vasa_title: "Shool & Vāsa",
  shool_vasa_sub: "Directional guidance",
  disha_shool: "Diśā Śūla",
  rahu_vasa: "Rāhu Vāsa",
  chandra_vasa: "Chandra Vāsa",
  calendars_title: "Other Calendars & Epoch",

  reading_heavens: "Reading the celestial clock…",
  consulting_heavens: "Consulting the heavens…",
  advertisement: "Advertisement",
};

const hi: Dict = {
  brand_name: "वैदिक पञ्चाङ्ग",
  brand_domain: "vedicpanchanga.com",
  brand_tagline: "सायन · लाहिड़ी",
  app_title: "ज्योतिष कुण्डली",
  app_subtitle: "उत्तर भारतीय परम्परा में निर्मित वैदिक जन्म-कुण्डली",
  sidereal_lahiri: "सायन · लाहिड़ी",
  jyotisha: "॥ ज्योतिष ॥",
  shubham: "॥ शुभम् ॥",
  computed_with: "स्विस एफ़ेमेरिस से गणना · पूर्ण राशि भाव",
  language: "भाषा",

  nav_kundali: "कुण्डली",
  nav_panchang: "पञ्चाङ्ग",
  nav_muhurta: "मुहूर्त",

  muhurta_title: "मुहूर्त खोज",
  muhurta_subtitle: "किसी भी कार्य हेतु शुभ समय ज्ञात करें",
  muhurta_purpose: "प्रयोजन",
  muhurta_start_date: "प्रारम्भ दिनांक",
  muhurta_end_date: "अन्तिम दिनांक",
  muhurta_native_filter: "जातक विवरण (वैकल्पिक)",
  muhurta_native_sub: "चन्द्रबल व ताराबल हेतु",
  muhurta_birth_rashi: "जन्म राशि",
  muhurta_birth_nak: "जन्म नक्षत्र",
  muhurta_min_score: "न्यूनतम अंक",
  muhurta_find: "मुहूर्त खोजें",
  muhurta_searching: "ग्रह-गणना चल रही है…",
  muhurta_no_matches: "कोई शुभ दिन नहीं मिला। अवधि बढ़ाएँ या न्यूनतम अंक घटाएँ।",
  muhurta_score: "अंक",
  muhurta_reasons: "शुभ कारण",
  muhurta_cautions: "सावधानी",
  muhurta_abhijit: "अभिजित",
  muhurta_rahu: "राहु काल",
  muhurta_sunrise_sunset: "सूर्योदय — सूर्यास्त",
  muhurta_results: "संस्तुत दिनांक",
  muhurta_days_scanned: "दिन जाँचे",
  muhurta_matches_found: "परिणाम",
  muhurta_location: "स्थान",
  muhurta_none: "— कोई नहीं —",

  birth_details: "जन्म विवरण",
  enter_native_time_place: "जातक का जन्म समय व स्थान दर्ज करें",
  date_of_birth: "जन्म तिथि",
  time_of_birth: "जन्म समय",
  place_of_birth: "जन्म स्थान",
  search_city: "नगर खोजें…",
  ayanamsa: "अयनांश",
  latitude: "अक्षांश",
  longitude: "देशांतर",
  generate_kundali: "कुण्डली बनाएँ",
  casting_chart: "कुण्डली बन रही है…",
  chart_style: "चक्र शैली",
  north_indian: "उत्तर भारतीय",
  south_indian: "दक्षिण भारतीय",

  local: "स्थानीय",
  timezone: "समय क्षेत्र",
  julian_day: "जूलियन दिवस",
  unnamed_native: "अज्ञात जातक",
  graha_positions: "ग्रह स्थिति",
  lagna_caption: "लग्न (उदय) प्रमुख रूप से दर्शाया है · भाव वामावर्त चलते हैं",

  dasha_title: "विंशोत्तरी महादशा",
  dasha_subtitle: "जन्म से १२० वर्षीय पूर्ण ग्रह चक्र",
  dasha_lord: "महादशा स्वामी",
  dasha_years: "वर्ष",
  dasha_from: "से",
  dasha_to: "तक",

  ashtakavarga_title: "अष्टकवर्ग",
  ashtakavarga_sub: "ग्रहवार भिन्नाष्टकवर्ग एवं १२ राशियों पर सर्वाष्टकवर्ग योग",
  th_planet: "ग्रह",
  th_total: "योग",
  sav: "सर्वाष्टक",

  panchang_title: "दैनिक दृक् पञ्चाङ्ग",
  panchang_stamp: "॥ पञ्चाङ्ग ॥",
  place: "स्थान",
  date: "दिनांक",
  show_panchang: "पञ्चाङ्ग दिखाएँ",
  loading: "लोड हो रहा है…",
  use_my_location: "मेरा स्थान उपयोग करें",
  sunrise: "सूर्योदय",
  sunset: "सूर्यास्त",
  moonrise: "चन्द्रोदय",
  moonset: "चन्द्रास्त",
  auspicious_title: "शुभ समय",
  inauspicious_title: "अशुभ समय",
  udaya_lagna_title: "उदय लग्न मुहूर्त",
  udaya_lagna_sub: "दिन भर की लग्न गति",
  chandrabalam_title: "चन्द्रबल",
  chandrabalam_sub: "इन राशियों के लिए शुभ चन्द्रबल",
  tarabalam_title: "ताराबल",
  tarabalam_sub: "इन नक्षत्रों के लिए शुभ ताराबल",
  shool_vasa_title: "शूल व वास",
  shool_vasa_sub: "दिशा-दर्शन",
  disha_shool: "दिशा शूल",
  rahu_vasa: "राहु वास",
  chandra_vasa: "चन्द्र वास",
  calendars_title: "अन्य पञ्चाङ्ग व युग",

  reading_heavens: "आकाशीय घड़ी पढ़ी जा रही है…",
  consulting_heavens: "ग्रहों से परामर्श…",
  advertisement: "विज्ञापन",
};

export const translations: Record<string, Dict> = { en, hi };

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
  const [lang, setLang] = useState<LangId>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("jk_lang") : null;
    return (saved as LangId) || "en";
  });
  useEffect(() => {
    localStorage.setItem("jk_lang", lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
