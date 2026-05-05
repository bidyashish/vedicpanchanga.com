// Astronomical-name translations + native digits.
//
// Mirrors backend/pdf/core/i18n - same key shape (`planet_sun`, `sign_aries`,
// `nak_ashwini`) so both layers translate the same names with the same keys.
// Kept separate from index.tsx so the UI-string dictionaries don't get
// bloated with the 49 astro names per language.

import { useI18n } from "@/i18n";

// Devanagari, Tamil, Bengali, Arabic-Indic, and Eastern Arabic numerals
// routinely co-render with their respective scripts. CJK and European locales
// conventionally keep Latin digits for technical values, so we don't
// substitute there. Hebrew also conventionally uses Latin digits.
const NATIVE_DIGITS: Record<string, string> = {
  hi: "०१२३४५६७८९",
  ne: "०१२३४५६७८९",
  ta: "௦௧௨௩௪௫௬௭௮௯",
  bn: "০১২৩৪৫৬৭৮৯",
  ar: "٠١٢٣٤٥٦٧٨٩",
  fa: "۰۱۲۳۴۵۶۷۸۹",
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
  // Sanskrit sign-name aliases - backend's `rashi` field uses these instead of
  // the English `name` field, and several panchang sections (Udaya Lagna,
  // Chandrabalam, Sun-/Moon-sign) read from `rashi`.
  sign_mesha: "மேஷம்",
  sign_vrishabha: "ரிஷபம்",
  sign_mithuna: "மிதுனம்",
  sign_karka: "கடகம்",
  sign_simha: "சிம்மம்",
  sign_kanya: "கன்னி",
  sign_tula: "துலாம்",
  sign_vrishchika: "விருச்சிகம்",
  sign_dhanu: "தனுசு",
  sign_makara: "மகரம்",
  sign_kumbha: "கும்பம்",
  sign_meena: "மீனம்",
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

  paksha_krishna: "கிருஷ்ண",
  paksha_shukla: "சுக்ல",
  paksha_krishna_paksha: "கிருஷ்ண பக்ஷம்",
  paksha_shukla_paksha: "சுக்ல பக்ஷம்",

  tithi_pratipada: "பிரதமை",
  tithi_dvitiya: "துவிதியை",
  tithi_dwitiya: "துவிதியை",
  tithi_tritiya: "திருதியை",
  tithi_chaturthi: "சதுர்த்தி",
  tithi_panchami: "பஞ்சமி",
  tithi_shashthi: "ஷஷ்டி",
  tithi_shashti: "ஷஷ்டி",
  tithi_saptami: "சப்தமி",
  tithi_ashtami: "அஷ்டமி",
  tithi_navami: "நவமி",
  tithi_dashami: "தசமி",
  tithi_ekadashi: "ஏகாதசி",
  tithi_dvadashi: "துவாதசி",
  tithi_dwadashi: "துவாதசி",
  tithi_trayodashi: "திரயோதசி",
  tithi_chaturdashi: "சதுர்தசி",
  tithi_amavasya: "அமாவாசை",
  tithi_purnima: "பௌர்ணமி",

  yoga_vishkumbha: "விஷ்கும்பம்",
  yoga_vishkambha: "விஷ்கும்பம்",
  yoga_priti: "ப்ரீதி",
  yoga_ayushman: "ஆயுஷ்மான்",
  yoga_saubhagya: "சௌபாக்யம்",
  yoga_shobhana: "சோபனம்",
  yoga_atiganda: "அதிகண்டம்",
  yoga_sukarma: "சுகர்மம்",
  yoga_sukarman: "சுகர்மம்",
  yoga_dhriti: "திருதி",
  yoga_shula: "சூலம்",
  yoga_ganda: "கண்டம்",
  yoga_vriddhi: "விருத்தி",
  yoga_dhruva: "துருவம்",
  yoga_vyaghata: "வ்யாகாதம்",
  yoga_harshana: "ஹர்ஷணம்",
  yoga_vajra: "வஜ்ரம்",
  yoga_siddhi: "சித்தி",
  yoga_vyatipata: "வ்யதீபாதம்",
  yoga_variyana: "வரியான்",
  yoga_variyan: "வரியான்",
  yoga_parigha: "பரிகம்",
  yoga_shiva: "சிவம்",
  yoga_siddha: "சித்தம்",
  yoga_sadhya: "சாத்யம்",
  yoga_shubha: "சுபம்",
  yoga_shukla: "சுக்லம்",
  yoga_brahma: "பிரம்மம்",
  yoga_indra: "இந்திரம்",
  yoga_vaidhriti: "வைதிருதி",

  karana_bava: "பவம்",
  karana_balava: "பாலவம்",
  karana_kaulava: "கௌலவம்",
  karana_taitila: "தைதிலம்",
  karana_gara: "கரம்",
  karana_garaja: "கரஜம்",
  karana_garija: "கரஜம்",
  karana_vanija: "வணிஜம்",
  karana_vishti: "விஷ்டி",
  karana_shakuni: "சகுனி",
  karana_chatushpada: "சதுஷ்பாதம்",
  karana_naga: "நாகம்",
  karana_kimstughna: "கிம்ஸ்துக்னம்",
  karana_kintughna: "கிம்ஸ்துக்னம்",

  vara_ravivara: "ரவிவாரம்",
  vara_somavara: "சோமவாரம்",
  vara_mangalavara: "மங்களவாரம்",
  vara_budhavara: "புதவாரம்",
  vara_guruvara: "குருவாரம்",
  vara_brihaspativara: "குருவாரம்",
  vara_shukravara: "சுக்ரவாரம்",
  vara_shanivara: "சனிவாரம்",

  month_chaitra: "சைத்திரம்",
  month_vaishakha: "வைசாகம்",
  month_jyeshtha: "ஜ்யேஷ்டம்",
  month_ashadha: "ஆஷாடம்",
  month_shravana: "சிராவணம்",
  month_bhadrapada: "பாத்ரபதம்",
  month_ashvin: "ஆச்வினம்",
  month_ashwin: "ஆச்வினம்",
  month_kartika: "கார்த்திகம்",
  month_margashirsha: "மார்கசீர்ஷம்",
  month_pausha: "பௌஷம்",
  month_magha: "மாகம்",
  month_phalguna: "பால்குனம்",

  direction_north: "வடக்கு",
  direction_south: "தெற்கு",
  direction_east: "கிழக்கு",
  direction_west: "மேற்கு",
  "direction_north-east": "வடகிழக்கு",
  "direction_north-west": "வடமேற்கு",
  "direction_south-east": "தென்கிழக்கு",
  "direction_south-west": "தென்மேற்கு",
  direction_northeast: "வடகிழக்கு",
  direction_northwest: "வடமேற்கு",
  direction_southeast: "தென்கிழக்கு",
  direction_southwest: "தென்மேற்கு",

  ritu_vasant: "வசந்தம்",
  ritu_vasanta: "வசந்தம்",
  ritu_grishma: "கிரீஷ்மம்",
  ritu_varsha: "வர்ஷம்",
  ritu_sharad: "சரத்",
  ritu_hemant: "ஹேமந்தம்",
  ritu_hemanta: "ஹேமந்தம்",
  ritu_shishir: "சிசிரம்",
  ritu_shishira: "சிசிரம்",
  ritu_sishira: "சிசிரம்",

  ayana_uttarayana: "உத்தராயணம்",
  ayana_dakshinayana: "தக்ஷிணாயனம்",

  // Gowri Panchangam segment names. The 8-name Tamil cycle is shown in the
  // Nalla Neram table - Sanskrit-derived words spelled in transliteration in
  // backend output, rendered as native Tamil in Tamil mode.
  gowri_soram: "சோரம்",
  gowri_uthi: "உதி",
  gowri_visham: "விஷம்",
  gowri_amridha: "அமிர்தம்",
  gowri_rogam: "ரோகம்",
  gowri_labam: "லாபம்",
  gowri_dhanam: "தனம்",
  gowri_sugam: "சுகம்",
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

const RU: Dict = {
  planet_ascendant: "Асцендент",
  planet_sun: "Солнце",
  planet_moon: "Луна",
  planet_mars: "Марс",
  planet_mercury: "Меркурий",
  planet_jupiter: "Юпитер",
  planet_venus: "Венера",
  planet_saturn: "Сатурн",
  planet_rahu: "Раху",
  planet_ketu: "Кету",
  sign_aries: "Овен",
  sign_taurus: "Телец",
  sign_gemini: "Близнецы",
  sign_cancer: "Рак",
  sign_leo: "Лев",
  sign_virgo: "Дева",
  sign_libra: "Весы",
  sign_scorpio: "Скорпион",
  sign_sagittarius: "Стрелец",
  sign_capricorn: "Козерог",
  sign_aquarius: "Водолей",
  sign_pisces: "Рыбы",
};

const AR: Dict = {
  planet_ascendant: "الطالع",
  planet_sun: "الشمس",
  planet_moon: "القمر",
  planet_mars: "المريخ",
  planet_mercury: "عطارد",
  planet_jupiter: "المشتري",
  planet_venus: "الزهرة",
  planet_saturn: "زحل",
  planet_rahu: "راهو",
  planet_ketu: "كيتو",
  sign_aries: "الحمل",
  sign_taurus: "الثور",
  sign_gemini: "الجوزاء",
  sign_cancer: "السرطان",
  sign_leo: "الأسد",
  sign_virgo: "العذراء",
  sign_libra: "الميزان",
  sign_scorpio: "العقرب",
  sign_sagittarius: "القوس",
  sign_capricorn: "الجدي",
  sign_aquarius: "الدلو",
  sign_pisces: "الحوت",
};

const FA: Dict = {
  planet_ascendant: "طالع",
  planet_sun: "خورشید",
  planet_moon: "ماه",
  planet_mars: "بهرام",
  planet_mercury: "تیر",
  planet_jupiter: "مشتری",
  planet_venus: "ناهید",
  planet_saturn: "کیوان",
  planet_rahu: "راهو",
  planet_ketu: "کیتو",
  sign_aries: "بره",
  sign_taurus: "گاو",
  sign_gemini: "دوپیکر",
  sign_cancer: "خرچنگ",
  sign_leo: "شیر",
  sign_virgo: "خوشه",
  sign_libra: "ترازو",
  sign_scorpio: "کژدم",
  sign_sagittarius: "کمان",
  sign_capricorn: "بزغاله",
  sign_aquarius: "دلو",
  sign_pisces: "ماهی",
};

const HE: Dict = {
  planet_ascendant: "אופק עולה",
  planet_sun: "שמש",
  planet_moon: "ירח",
  planet_mars: "מאדים",
  planet_mercury: "מרקורי",
  planet_jupiter: "צדק",
  planet_venus: "ונוס",
  planet_saturn: "שבתאי",
  planet_rahu: "ראהו",
  planet_ketu: "קטו",
  sign_aries: "טלה",
  sign_taurus: "שור",
  sign_gemini: "תאומים",
  sign_cancer: "סרטן",
  sign_leo: "אריה",
  sign_virgo: "בתולה",
  sign_libra: "מאזניים",
  sign_scorpio: "עקרב",
  sign_sagittarius: "קשת",
  sign_capricorn: "גדי",
  sign_aquarius: "דלי",
  sign_pisces: "דגים",
};

const BN: Dict = {
  planet_ascendant: "লগ্ন",
  planet_sun: "সূর্য",
  planet_moon: "চন্দ্র",
  planet_mars: "মঙ্গল",
  planet_mercury: "বুধ",
  planet_jupiter: "বৃহস্পতি",
  planet_venus: "শুক্র",
  planet_saturn: "শনি",
  planet_rahu: "রাহু",
  planet_ketu: "কেতু",
  sign_aries: "মেষ",
  sign_taurus: "বৃষ",
  sign_gemini: "মিথুন",
  sign_cancer: "কর্কট",
  sign_leo: "সিংহ",
  sign_virgo: "কন্যা",
  sign_libra: "তুলা",
  sign_scorpio: "বৃশ্চিক",
  sign_sagittarius: "ধনু",
  sign_capricorn: "মকর",
  sign_aquarius: "কুম্ভ",
  sign_pisces: "মীন",
  nak_ashwini: "অশ্বিনী",
  nak_bharani: "ভরণী",
  nak_krittika: "কৃত্তিকা",
  nak_rohini: "রোহিণী",
  nak_mrigashira: "মৃগশিরা",
  nak_ardra: "আর্দ্রা",
  nak_punarvasu: "পুনর্বসু",
  nak_pushya: "পুষ্যা",
  nak_ashlesha: "অশ্লেষা",
  nak_magha: "মঘা",
  nak_purva_phalguni: "পূর্ব ফাল্গুনী",
  nak_uttara_phalguni: "উত্তর ফাল্গুনী",
  nak_hasta: "হস্তা",
  nak_chitra: "চিত্রা",
  nak_swati: "স্বাতী",
  nak_vishakha: "বিশাখা",
  nak_anuradha: "অনুরাধা",
  nak_jyeshtha: "জ্যেষ্ঠা",
  nak_mula: "মূলা",
  nak_purva_ashadha: "পূর্বাষাঢ়া",
  nak_uttara_ashadha: "উত্তরাষাঢ়া",
  nak_shravana: "শ্রবণা",
  nak_dhanishta: "ধনিষ্ঠা",
  nak_shatabhisha: "শতভিষা",
  nak_purva_bhadrapada: "পূর্ব ভাদ্রপদ",
  nak_uttara_bhadrapada: "উত্তর ভাদ্রপদ",
  nak_revati: "রেবতী",
};

// Nepali uses Devanagari and shares Vedic vocabulary with Hindi - reuse HI.
const NE: Dict = HI;

const DICTS: Record<string, Dict> = {
  hi: HI,
  ta: TA,
  bn: BN,
  ne: NE,
  zh: ZH,
  ja: JA,
  es: ES,
  de: DE,
  pt: PT,
  fr: FR,
  ru: RU,
  ar: AR,
  fa: FA,
  he: HE,
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

// Tithi names arrive as "Krishna Pratipada" / "Shukla Chaturdashi" / "Amavasya".
// Resolve paksha + ordinal independently so we don't need 30 entries per
// locale - just 16 ordinals + 2 paksha words.
function lookupTithi(name: string, lang: string): string {
  if (!name) return name;
  const dict = DICTS[lang];
  if (!dict) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return dict[toKey("tithi", parts[0])] ?? name;
  }
  const paksha = dict[toKey("paksha", parts[0])];
  const ordinal = dict[toKey("tithi", parts.slice(1).join(" "))];
  if (paksha && ordinal) return `${paksha} ${ordinal}`;
  return name;
}

// Paksha can arrive as either "Krishna Paksha" / "Shukla Paksha" or just
// "Krishna" / "Shukla". Try the full form first, fall back to the bare word.
function lookupPaksha(name: string, lang: string): string {
  if (!name) return name;
  const dict = DICTS[lang];
  if (!dict) return name;
  return dict[toKey("paksha", name)] ?? dict[toKey("paksha", name.split(/\s+/)[0])] ?? name;
}

// Ritu values arrive as "Grishma (Summer)". The English parenthetical isn't
// useful in non-English UIs, so look up just the Sanskrit head and drop the
// suffix when the dictionary has an entry.
function lookupRitu(name: string, lang: string): string {
  if (!name) return name;
  const dict = DICTS[lang];
  if (!dict) return name;
  const head = name.split(/\s*\(/)[0].trim();
  return dict[toKey("ritu", head)] ?? name;
}

// Hook bound to the active language. Consumers call num/planet/sign/nakshatra
// (etc) without threading lang through every callsite.
export function useAstro() {
  const { lang } = useI18n();
  return {
    num: (v: string | number | null | undefined) => toNativeDigits(v, lang),
    planet: (n: string) => lookup("planet", n, lang),
    sign: (n: string) => (n ? lookup("sign", n, lang) : n),
    nakshatra: (n: string) => (n ? lookup("nak", n, lang) : n),
    tithi: (n: string) => lookupTithi(n, lang),
    paksha: (n: string) => lookupPaksha(n, lang),
    yoga: (n: string) => (n ? lookup("yoga", n, lang) : n),
    karana: (n: string) => (n ? lookup("karana", n, lang) : n),
    vara: (n: string) => (n ? lookup("vara", n, lang) : n),
    lunarMonth: (n: string) => (n ? lookup("month", n, lang) : n),
    direction: (n: string) => (n ? lookup("direction", n, lang) : n),
    ritu: (n: string) => lookupRitu(n, lang),
    ayana: (n: string) => (n ? lookup("ayana", n, lang) : n),
    samvatsara: (n: string) => n,
    gowri: (n: string) => (n ? lookup("gowri", n, lang) : n),
  };
}
