// Simple i18n dictionary. Keys used across Kundali + Panchang UI.
// New languages can be added: register in LANGUAGES below; missing keys fall
// back to English automatically (see the `t` helper).
export const LANGUAGES = [
    { id: "en", label: "English",    native: "EN" },
    { id: "hi", label: "हिन्दी",     native: "हिं" },
    { id: "sa", label: "संस्कृतम्",   native: "सं" },
    { id: "ta", label: "தமிழ்",      native: "த" },
    { id: "bn", label: "বাংলা",      native: "বা" },
    { id: "mr", label: "मराठी",       native: "म" },
    { id: "gu", label: "ગુજરાતી",    native: "ગુ" },
    { id: "te", label: "తెలుగు",     native: "తె" },
];

export const translations = {
    en: {
        // Brand
        brand_name: "VedicPanchanga",
        brand_domain: "vedicpanchanga.com",
        brand_tagline: "Sidereal · Lahiri",

        // Header
        app_title: "Jyotiṣa Kuṇḍalī",
        app_subtitle: "A Vedic birth chart — drawn in the North Indian tradition",
        sidereal_lahiri: "Sidereal · Lahiri",
        jyotisha: "॥ ज्योतिष ॥",
        shubham: "॥ शुभम् ॥",
        computed_with: "Computed with Swiss Ephemeris · Whole-Sign Houses",
        language: "Language",

        // Top nav
        nav_kundali: "Kuṇḍalī · Birth Chart",
        nav_panchang: "Pañcāṅga · Today",
        nav_muhurta: "Muhūrta · Finder",

        // Muhurta
        muhurta_title: "Muhūrta Finder",
        muhurta_subtitle: "Find auspicious windows for any undertaking",
        muhurta_purpose: "Purpose",
        muhurta_start_date: "Start Date",
        muhurta_end_date: "End Date",
        muhurta_native_filter: "Native Filters (optional)",
        muhurta_native_sub: "For Chandrabalam & Tārabalam checks",
        muhurta_birth_rashi: "Birth Rāśi (Moon sign)",
        muhurta_birth_nak: "Birth Nakṣatra (Janma Nakshatra)",
        muhurta_min_score: "Minimum Score",
        muhurta_find: "Find Muhūrtas",
        muhurta_searching: "Scanning heavens...",
        muhurta_no_matches: "No auspicious days found in this range. Try a wider range or lower minimum score.",
        muhurta_score: "Score",
        muhurta_reasons: "Favourable",
        muhurta_cautions: "Cautions",
        muhurta_abhijit: "Abhijit",
        muhurta_rahu: "Rāhu Kāla",
        muhurta_sunrise_sunset: "Sunrise — Sunset",
        muhurta_results: "Recommended Days",
        muhurta_days_scanned: "days scanned",
        muhurta_matches_found: "matches found",
        muhurta_location: "Location",
        muhurta_none: "— None —",

        // Form
        birth_details: "Birth Details",
        enter_native_time_place: "Enter the native's time & place of birth",
        date_of_birth: "Date of Birth",
        time_of_birth: "Time of Birth",
        place_of_birth: "Place of Birth",
        search_city: "Search city...",
        ayanamsa: "Ayanāṁśa",
        latitude: "Latitude",
        longitude: "Longitude",
        generate_kundali: "Generate Kundali",
        casting_chart: "Casting Chart...",
        chart_style: "Chart Style",
        north_indian: "North Indian",
        south_indian: "South Indian",

        // Birth header
        local: "Local",
        timezone: "Timezone",
        julian_day: "Julian Day",
        unnamed_native: "Unnamed Native",

        // Chart tabs
        tab_d1_rashi: "D1 · Rāśi",
        tab_d1_sub: "Birth Chart",
        tab_d2_hora: "D2 · Horā",
        tab_d2_sub: "Wealth",
        tab_d9_nav: "D9 · Navāṁśa",
        tab_d9_sub: "Destiny / Marriage",
        rashi_chart_d1: "Rāśi Chart (D1)",
        hora_chart_d2: "Horā Chart (D2)",
        navamsa_chart_d9: "Navāṁśa Chart (D9)",
        lagna_caption: "Lagna (Ascendant) is highlighted · Houses proceed anti-clockwise",

        // Planets table
        graha_positions: "Graha Positions",
        th_body: "Body",
        th_sign: "Sign",
        th_degree: "Degree",
        th_sign_lord: "Sign Lord",
        th_nakshatra: "Nakshatra",
        th_pada: "Pada",
        th_house: "House",
        th_retro: "R",

        // Dasha
        dasha_title: "Vimshottari Mahādaśā",
        dasha_subtitle: "Full 120-year planetary cycle from birth",
        dasha_lord: "Mahādaśā Lord",
        dasha_years: "Years",
        dasha_from: "From",
        dasha_to: "To",

        // Ashtakavarga
        ashtakavarga_title: "Aṣṭakavarga",
        ashtakavarga_sub: "Bhinnāṣṭakavarga per planet and Sarvāṣṭakavarga totals across the 12 signs",
        th_planet: "Planet",
        th_total: "Total",
        sav: "SAV",

        // Panchang
        panchang_title: "Daily Drik Panchānga",
        panchang_stamp: "॥ पञ्चाङ्ग ॥",
        place: "Place",
        date: "Date",
        show_panchang: "Show Panchang",
        loading: "Loading...",
        use_my_location: "Use My Location",
        sun_moon: "Sunrise & Sunset · Moonrise & Moonset",
        sunrise: "Sunrise",
        sunset: "Sunset",
        moonrise: "Moonrise",
        moonset: "Moonset",
        panchang_limbs: "Panchānga",
        panchang_limbs_sub: "Five Limbs",
        tithi: "Tithi",
        nakshatra_label: "Nakṣatra",
        yoga: "Yoga",
        karana: "Karaṇa",
        vara: "Vāra",
        paksha: "Pakṣa",
        upto: "upto",
        lunar_month_title: "Lunar Month, Saṁvat and Saṁvatsara",
        vikram_samvat: "Vikram Samvat",
        shaka_samvat: "Shaka Samvat",
        gujarati_samvat: "Gujarati Samvat",
        chandramasa_p: "Chandramāsa (Pūrṇimānta)",
        chandramasa_a: "Chandramāsa (Amānta)",
        nirayana_month: "Nirayaṇa Solar Month",
        pravishte: "Pravishte / Gate",
        rashi_nak_title: "Rāśi & Nakṣatra",
        moonsign: "Moonsign (Chandra Rāśi)",
        nakshatra_pada_title: "Nakṣatra Pada",
        sunsign: "Sunsign (Sūrya Rāśi)",
        surya_nakshatra: "Sūrya Nakṣatra",
        ritu_ayana: "Ritu & Ayana",
        drik_ritu: "Drik Ṛtu",
        vedic_ritu: "Vedic Ṛtu",
        drik_ayana: "Drik Ayana",
        vedic_ayana: "Vedic Ayana",
        dinaman: "Dinamāna",
        ratriman: "Rātrimāna",
        madhyahna: "Madhyāhna",
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
        kali_year: "Kaliyuga Year",
        kali_ahargana: "Kali Ahargaṇa",
        mjd: "Modified Julian Day",
        rata_die: "Rata Die",
        lahiri_ayanamsha: "Lahiri Ayanāṁśa",
        national_civil_date: "National Civil Date (Śaka)",
        national_nirayana_date: "National Nirayana Date",
    },
    hi: {
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

        nav_kundali: "कुण्डली · जन्म चक्र",
        nav_panchang: "पञ्चाङ्ग · आज",
        nav_muhurta: "मुहूर्त · खोज",

        // Muhurta
        muhurta_title: "मुहूर्त खोज",
        muhurta_subtitle: "किसी भी कार्य हेतु शुभ समय ज्ञात करें",
        muhurta_purpose: "प्रयोजन",
        muhurta_start_date: "प्रारम्भ दिनांक",
        muhurta_end_date: "अन्तिम दिनांक",
        muhurta_native_filter: "जातक विवरण (वैकल्पिक)",
        muhurta_native_sub: "चन्द्रबल व ताराबल हेतु",
        muhurta_birth_rashi: "जन्म राशि (चन्द्र राशि)",
        muhurta_birth_nak: "जन्म नक्षत्र",
        muhurta_min_score: "न्यूनतम अंक",
        muhurta_find: "मुहूर्त खोजें",
        muhurta_searching: "ग्रह-गणना चल रही है...",
        muhurta_no_matches: "इस अवधि में कोई शुभ दिन नहीं मिला। अवधि बढ़ाएँ या न्यूनतम अंक घटाएँ।",
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
        search_city: "नगर खोजें...",
        ayanamsa: "अयनांश",
        latitude: "अक्षांश",
        longitude: "देशांतर",
        generate_kundali: "कुण्डली बनाएँ",
        casting_chart: "कुण्डली बन रही है...",
        chart_style: "चक्र शैली",
        north_indian: "उत्तर भारतीय",
        south_indian: "दक्षिण भारतीय",

        local: "स्थानीय",
        timezone: "समय क्षेत्र",
        julian_day: "जूलियन दिवस",
        unnamed_native: "अज्ञात जातक",

        tab_d1_rashi: "डी१ · राशि",
        tab_d1_sub: "जन्म कुण्डली",
        tab_d2_hora: "डी२ · होरा",
        tab_d2_sub: "धन",
        tab_d9_nav: "डी९ · नवांश",
        tab_d9_sub: "भाग्य / विवाह",
        rashi_chart_d1: "राशि चक्र (डी१)",
        hora_chart_d2: "होरा चक्र (डी२)",
        navamsa_chart_d9: "नवांश चक्र (डी९)",
        lagna_caption: "लग्न (उदय) प्रमुख रूप से दर्शाया है · भाव वामावर्त चलते हैं",

        graha_positions: "ग्रह स्थिति",
        th_body: "ग्रह",
        th_sign: "राशि",
        th_degree: "अंश",
        th_sign_lord: "राशि स्वामी",
        th_nakshatra: "नक्षत्र",
        th_pada: "पाद",
        th_house: "भाव",
        th_retro: "व",

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
        loading: "लोड हो रहा है...",
        use_my_location: "मेरा स्थान उपयोग करें",
        sun_moon: "सूर्योदय व सूर्यास्त · चन्द्रोदय व चन्द्रास्त",
        sunrise: "सूर्योदय",
        sunset: "सूर्यास्त",
        moonrise: "चन्द्रोदय",
        moonset: "चन्द्रास्त",
        panchang_limbs: "पञ्चाङ्ग",
        panchang_limbs_sub: "पाँच अङ्ग",
        tithi: "तिथि",
        nakshatra_label: "नक्षत्र",
        yoga: "योग",
        karana: "करण",
        vara: "वार",
        paksha: "पक्ष",
        upto: "तक",
        lunar_month_title: "चान्द्रमास, सम्वत् व सम्वत्सर",
        vikram_samvat: "विक्रम सम्वत्",
        shaka_samvat: "शक सम्वत्",
        gujarati_samvat: "गुजराती सम्वत्",
        chandramasa_p: "चान्द्रमास (पूर्णिमान्त)",
        chandramasa_a: "चान्द्रमास (अमान्त)",
        nirayana_month: "निरयन सौर मास",
        pravishte: "प्रविष्टे / गते",
        rashi_nak_title: "राशि व नक्षत्र",
        moonsign: "चन्द्र राशि",
        nakshatra_pada_title: "नक्षत्र पाद",
        sunsign: "सूर्य राशि",
        surya_nakshatra: "सूर्य नक्षत्र",
        ritu_ayana: "ऋतु व अयन",
        drik_ritu: "दृक् ऋतु",
        vedic_ritu: "वैदिक ऋतु",
        drik_ayana: "दृक् अयन",
        vedic_ayana: "वैदिक अयन",
        dinaman: "दिनमान",
        ratriman: "रात्रिमान",
        madhyahna: "मध्याह्न",
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
        kali_year: "कलियुग वर्ष",
        kali_ahargana: "कलि अहर्गण",
        mjd: "संशोधित जूलियन दिवस",
        rata_die: "राता डाइ",
        lahiri_ayanamsha: "लाहिड़ी अयनांश",
        national_civil_date: "राष्ट्रीय शक दिनांक",
        national_nirayana_date: "राष्ट्रीय निरयन दिनांक",
    },
};

import React, { createContext, useContext, useState, useEffect } from "react";

const I18nContext = createContext({ lang: "en", t: (k) => k, setLang: () => {} });

export function I18nProvider({ children }) {
    const [lang, setLang] = useState(() => localStorage.getItem("jk_lang") || "en");
    useEffect(() => { localStorage.setItem("jk_lang", lang); }, [lang]);
    const t = (key) => translations[lang]?.[key] ?? translations.en[key] ?? key;
    return (
        <I18nContext.Provider value={{ lang, setLang, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    return useContext(I18nContext);
}

export function LanguageSwitcher({ testId = "lang-switcher" }) {
    const { lang, setLang } = useI18n();
    return (
        <div className="relative inline-block">
            <select
                data-testid={testId}
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label="Language"
                className="appearance-none bg-[#FCFAF5] border border-[#C5A059] text-[#2C241B] text-xs font-semibold tracking-wider rounded-sm pl-2.5 pr-7 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D35400] focus:border-[#D35400] hover:bg-[#F4F1E8]"
            >
                {LANGUAGES.map((l) => (
                    <option
                        key={l.id}
                        value={l.id}
                        data-testid={`${testId}-opt-${l.id}`}
                    >
                        {l.native} · {l.label}
                    </option>
                ))}
            </select>
            <svg
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[#8B1E0F]"
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
                <polyline points="6 9 12 15 18 9" />
            </svg>
        </div>
    );
}
