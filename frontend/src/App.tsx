import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { NotificationBanner } from "@/components/shell/NotificationBanner";
import { Footer } from "@/components/shell/Footer";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { applySeo } from "@/lib/seo";
import { fetchGeoIP } from "@/lib/api";
import { loadAdSense } from "@/lib/adsense";
import { loadGtag } from "@/lib/gtag";
import type { LocationChoice } from "@/types/api";

const KundaliPage = lazy(() =>
  import("@/pages/KundaliPage").then((m) => ({ default: m.KundaliPage })),
);
const PanchangPage = lazy(() =>
  import("@/pages/PanchangPage").then((m) => ({ default: m.PanchangPage })),
);
const MuhurtaPage = lazy(() =>
  import("@/pages/MuhurtaPage").then((m) => ({ default: m.MuhurtaPage })),
);
const TransitsPage = lazy(() =>
  import("@/pages/TransitsPage").then((m) => ({ default: m.TransitsPage })),
);
const FrequencyPage = lazy(() =>
  import("@/pages/FrequencyPage").then((m) => ({ default: m.FrequencyPage })),
);
const PrivacyPage = lazy(() =>
  import("@/pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() => import("@/pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const WhatIsKundali = lazy(() =>
  import("@/pages/articles/WhatIsKundali").then((m) => ({ default: m.WhatIsKundali })),
);
const NinePlanets = lazy(() =>
  import("@/pages/articles/NinePlanets").then((m) => ({ default: m.NinePlanets })),
);
const UnderstandingPanchang = lazy(() =>
  import("@/pages/articles/UnderstandingPanchang").then((m) => ({
    default: m.UnderstandingPanchang,
  })),
);

export type View =
  | "kundali"
  | "panchang"
  | "muhurta"
  | "transits"
  | "frequency"
  | "privacy"
  | "terms"
  | "learn-kundali"
  | "learn-planets"
  | "learn-panchang";

const MONETIZED_VIEWS = new Set<View>([
  "panchang",
  "kundali",
  "muhurta",
  "transits",
  "frequency",
  "learn-kundali",
  "learn-planets",
  "learn-panchang",
]);

const SITE = "https://vedicpanchanga.com";

const VIEW_PATH: Record<View, string> = {
  panchang: "/",
  kundali: "/kundali",
  muhurta: "/muhurta",
  transits: "/transits",
  frequency: "/frequency",
  privacy: "/privacy",
  terms: "/terms",
  "learn-kundali": "/learn/kundali",
  "learn-planets": "/learn/planets",
  "learn-panchang": "/learn/panchang",
};

const SEO_BY_VIEW: Record<
  View,
  { title: string; description: string; canonical: string; keywords?: string }
> = {
  panchang: {
    title: "Vedic Panchanga - Free Drik Panchang, Kundali & Muhurta Calculator",
    description:
      "Free Vedic Panchanga calculator: daily Drik Panchang, North & South Indian Kundali (birth chart), Vimshottari Dasha, divisional charts, and Muhurta finder. Sidereal Lahiri, Swiss Ephemeris precision.",
    canonical: `${SITE}/`,
    keywords:
      "vedic panchanga, drik panchang, panchang today, tithi, nakshatra, yoga, karana, sunrise sunset, hindu calendar, jyotisha",
  },
  kundali: {
    title: "Free Kundali - North & South Indian Birth Chart Calculator · Vedic Panchanga",
    description:
      "Generate a Kundali (Vedic birth chart) in North or South Indian style: planetary positions, 16 divisional charts, Vimshottari Dasha, Ashtakavarga. Lahiri ayanamsa, Swiss Ephemeris precision.",
    canonical: `${SITE}/kundali`,
    keywords:
      "kundali, birth chart, vedic astrology, jyotish, navamsa, vimshottari dasha, ashtakavarga, divisional charts, north indian chart, south indian chart, planetary positions",
  },
  muhurta: {
    title: "Muhurta Finder - Auspicious Timings for Any Undertaking · Vedic Panchanga",
    description:
      "Find auspicious muhurta windows by purpose, date range and location. Purpose-based scoring with explainable reasons; native filters for Chandrabalam and Tarabalam.",
    canonical: `${SITE}/muhurta`,
    keywords:
      "muhurta, shubh muhurat, auspicious time, vedic timing, chandrabalam, tarabalam, electional astrology, griha pravesh muhurat, vivah muhurat",
  },
  transits: {
    title: "Planetary Transits - Sign, Nakshatra & Retrograde Timeline · Vedic Panchanga",
    description:
      "Year-long Vedic planetary transit timeline: sign ingresses, nakshatra changes, retrograde stations for all 12 planets including Uranus, Neptune, Pluto. Sidereal Lahiri.",
    canonical: `${SITE}/transits`,
    keywords:
      "planetary transits, gochar, saturn transit, jupiter transit, rahu ketu transit, retrograde planets, nakshatra transit, vedic astrology transits",
  },
  frequency: {
    title:
      "Free Healing Frequency Generator - Solfeggio, Chakra, OM & Navagraha Tones · Vedic Panchanga",
    description:
      "Free online healing frequency generator with Solfeggio tones (174-963 Hz), 7 Chakra frequencies, Vedic OM (136.1 Hz), Navagraha planetary tones, Schumann resonance, and White/Pink/Brown noise. Sine, square, sawtooth and triangle waveforms. No download needed.",
    canonical: `${SITE}/frequency`,
    keywords:
      "healing frequency generator, solfeggio frequencies, 528 hz, 432 hz, chakra healing tones, om frequency, 136.1 hz, navagraha frequency, schumann resonance, white noise generator, pink noise, brown noise, sound healing, meditation tones, frequency therapy, binaural tones",
  },
  privacy: {
    title: "Privacy Policy · Vedic Panchanga",
    description: "How vedicpanchanga.com handles your data.",
    canonical: `${SITE}/privacy`,
  },
  terms: {
    title: "Terms of Use · Vedic Panchanga",
    description: "Terms governing the use of vedicpanchanga.com.",
    canonical: `${SITE}/terms`,
  },
  "learn-kundali": {
    title: "What Is a Kundali? Beginner's Guide to the Vedic Birth Chart · Vedic Panchanga",
    description:
      "A clear beginner's guide to the kundali (Vedic birth chart): what it is, how the ascendant, houses, signs and planets fit together, and how to read a janam kundali step by step.",
    canonical: `${SITE}/learn/kundali`,
    keywords:
      "what is a kundali, janam kundali, vedic birth chart, lagna, ascendant, rashi, houses in astrology, how to read kundali",
  },
  "learn-planets": {
    title: "The 9 Planets (Navagraha) in Vedic Astrology · Vedic Panchanga",
    description:
      "A complete beginner's guide to the nine planets (navagraha) in Vedic astrology: what the Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu signify in a kundali.",
    canonical: `${SITE}/learn/planets`,
    keywords:
      "navagraha, nine planets vedic astrology, grahas, planet significations, karaka, benefic malefic planets",
  },
  "learn-panchang": {
    title: "Understanding Panchang: Tithi, Nakshatra, Yoga, Karana, Vara · Vedic Panchanga",
    description:
      "A beginner's guide to the panchang (Hindu almanac): what tithi, nakshatra, yoga, karana and vara mean, how they are calculated, and how to read the daily panchang.",
    canonical: `${SITE}/learn/panchang`,
    keywords:
      "what is panchang, panchanga, tithi, nakshatra, yoga, karana, vara, hindu calendar, drik panchang",
  },
};

const DEFAULT_LOCATION: LocationChoice = {
  place_name: "Ujjain, Madhya Pradesh, India",
  latitude: 23.1765,
  longitude: 75.7885,
  timezone: "Asia/Kolkata",
};

function viewFromPath(): View {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  switch (path) {
    case "/kundali":
      return "kundali";
    case "/muhurta":
      return "muhurta";
    case "/transits":
      return "transits";
    case "/frequency":
      return "frequency";
    case "/privacy":
      return "privacy";
    case "/terms":
      return "terms";
    case "/learn/kundali":
      return "learn-kundali";
    case "/learn/planets":
      return "learn-planets";
    case "/learn/panchang":
      return "learn-panchang";
    case "/panchang":
      return "panchang";
    case "/":
      return "panchang";
    default:
      return "panchang";
  }
}

// Migrate any old hash-style URL (`/#panchang`) to the new clean path on
// first load so external links and indexed search results don't break.
function migrateHashOnce(): View | null {
  const hash = window.location.hash.replace("#", "");
  if (!hash) return null;
  const allowed: View[] = ["kundali", "panchang", "muhurta", "transits", "frequency"];
  const v = allowed.includes(hash as View) ? (hash as View) : null;
  if (!v) return null;
  window.history.replaceState(null, "", VIEW_PATH[v] + window.location.search);
  return v;
}

function PageSkeleton() {
  return (
    <div className="pt-3 sm:pt-4 pb-8 flex items-center justify-center py-16">
      <MandalaLoader size={56} />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>(() => migrateHashOnce() ?? viewFromPath());
  const [sharedLocation, setSharedLocation] = useState<LocationChoice>(DEFAULT_LOCATION);

  // Push the new path whenever the view changes from in-app navigation.
  // Drop query params so the URL stays clean; share links are built on demand.
  useEffect(() => {
    const desiredPath = VIEW_PATH[view];
    if (window.location.pathname === desiredPath) return;
    window.history.pushState(null, "", desiredPath);
  }, [view]);

  // Browser back/forward → re-derive the view from the URL.
  useEffect(() => {
    const sync = () => setView(viewFromPath());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const geoFetchedRef = useRef(false);
  useEffect(() => {
    if (geoFetchedRef.current) return;
    geoFetchedRef.current = true;
    fetchGeoIP().then((geo) => {
      if (geo) {
        setSharedLocation({
          place_name: geo.place_name,
          latitude: geo.latitude,
          longitude: geo.longitude,
          timezone: null,
        });
      }
    });
  }, []);

  // Keep <title>, <meta>, canonical link in sync with the current route.
  useEffect(() => {
    applySeo(SEO_BY_VIEW[view]);
  }, [view]);

  useEffect(() => {
    if (!MONETIZED_VIEWS.has(view)) return;
    const id = window.setTimeout(() => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => loadAdSense());
      } else {
        loadAdSense();
      }
    }, 3000);
    return () => window.clearTimeout(id);
  }, [view]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => loadGtag());
      } else {
        loadGtag();
      }
    }, 2000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          import("@/pages/KundaliPage");
          import("@/pages/MuhurtaPage");
        });
      }
    }, 5000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="parchment-bg min-h-screen flex flex-col">
      <NotificationBanner />
      <TopBar view={view} setView={setView} />

      <main className="flex-1 max-w-screen-3xl w-full mx-auto px-3 sm:px-6 lg:px-8">
        <Suspense fallback={<PageSkeleton />}>
          {view === "kundali" && (
            <KundaliPage sharedLocation={sharedLocation} onLocationChange={setSharedLocation} />
          )}
          {view === "panchang" && <PanchangPage defaultLocation={sharedLocation} />}
          {view === "muhurta" && <MuhurtaPage defaultLocation={sharedLocation} />}
          {view === "transits" && <TransitsPage defaultLocation={sharedLocation} />}
          {view === "frequency" && <FrequencyPage />}
          {view === "privacy" && <PrivacyPage />}
          {view === "terms" && <TermsPage />}
          {view === "learn-kundali" && <WhatIsKundali />}
          {view === "learn-planets" && <NinePlanets />}
          {view === "learn-panchang" && <UnderstandingPanchang />}
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
