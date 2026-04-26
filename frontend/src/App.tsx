import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Footer } from "@/components/shell/Footer";
import { AdSlot } from "@/components/shell/AdSlot";
import { KundaliPage } from "@/pages/KundaliPage";
import { PanchangPage } from "@/pages/PanchangPage";
import { MuhurtaPage } from "@/pages/MuhurtaPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { applySeo } from "@/lib/seo";
import type { LocationChoice } from "@/types/api";

export type View = "kundali" | "panchang" | "muhurta" | "privacy" | "terms";

const SITE = "https://vedicpanchanga.com";

const VIEW_PATH: Record<View, string> = {
  kundali: "/",
  panchang: "/panchang",
  muhurta: "/muhurta",
  privacy: "/privacy",
  terms: "/terms",
};

const SEO_BY_VIEW: Record<View, { title: string; description: string; canonical: string }> = {
  kundali: {
    title: "Vedic Panchanga — Free Drik Panchang, Kundali & Muhūrta Calculator",
    description:
      "Free Vedic Panchanga calculator: daily Drik Panchang, North & South Indian Kundali (birth chart), Vimśottarī Daśā, divisional charts, and Muhūrta finder. Sidereal Lahiri, Swiss Ephemeris precision.",
    canonical: `${SITE}/`,
  },
  panchang: {
    title: "Daily Drik Panchang — Tithi, Nakshatra, Yoga, Karana · Vedic Panchanga",
    description:
      "Daily Drik Panchang for any date and location: tithi, nakshatra, yoga, karana, sunrise/sunset, Rāhu kāla, Abhijit muhūrta, Chandrabalam and Tārabalam.",
    canonical: `${SITE}/panchang`,
  },
  muhurta: {
    title: "Muhūrta Finder — Auspicious Timings for Any Undertaking · Vedic Panchanga",
    description:
      "Find auspicious muhūrta windows by purpose, date range and location. Purpose-based scoring with explainable reasons; native filters for Chandrabalam and Tārabalam.",
    canonical: `${SITE}/muhurta`,
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
};

const DEFAULT_LOCATION: LocationChoice = {
  place_name: "New Delhi, India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
};

function viewFromPath(): View {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  switch (path) {
    case "/panchang":
      return "panchang";
    case "/muhurta":
      return "muhurta";
    case "/privacy":
      return "privacy";
    case "/terms":
      return "terms";
    case "/kundali":
      return "kundali";
    case "/":
      return "kundali";
    default:
      return "kundali";
  }
}

// Migrate any old hash-style URL (`/#panchang`) to the new clean path on
// first load so external links and indexed search results don't break.
function migrateHashOnce(): View | null {
  const hash = window.location.hash.replace("#", "");
  if (!hash) return null;
  const allowed: View[] = ["kundali", "panchang", "muhurta"];
  const v = allowed.includes(hash as View) ? (hash as View) : null;
  if (!v) return null;
  window.history.replaceState(null, "", VIEW_PATH[v] + window.location.search);
  return v;
}

export default function App() {
  const [view, setView] = useState<View>(() => migrateHashOnce() ?? viewFromPath());
  const [sharedLocation, setSharedLocation] = useState<LocationChoice>(DEFAULT_LOCATION);

  // Push the new path whenever the view changes from in-app navigation.
  useEffect(() => {
    const desiredPath = VIEW_PATH[view];
    if (window.location.pathname === desiredPath) return;
    window.history.pushState(null, "", desiredPath + window.location.search);
  }, [view]);

  // Browser back/forward → re-derive the view from the URL.
  useEffect(() => {
    const sync = () => setView(viewFromPath());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const handleLocationChange = useCallback((loc: LocationChoice) => {
    setSharedLocation(loc);
  }, []);

  const isLegal = view === "privacy" || view === "terms";

  // Keep <title>, <meta>, canonical link in sync with the current route.
  useEffect(() => {
    applySeo(SEO_BY_VIEW[view]);
  }, [view]);

  return (
    <div className="parchment-bg min-h-screen flex flex-col">
      <TopBar view={view} setView={setView} />

      {/* Slim leaderboard ad — only on desktop, never displaces mobile/tablet content */}
      {!isLegal && (
        <div className="hidden xl:block max-w-screen-3xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          <AdSlot slot="header" minHeight={60} className="mb-3" />
        </div>
      )}

      <main className="flex-1 max-w-screen-3xl w-full mx-auto px-3 sm:px-6 lg:px-8">
        {view === "kundali" && (
          <KundaliPage sharedLocation={sharedLocation} onLocationChange={handleLocationChange} />
        )}
        {view === "panchang" && <PanchangPage defaultLocation={sharedLocation} />}
        {view === "muhurta" && <MuhurtaPage defaultLocation={sharedLocation} />}
        {view === "privacy" && <PrivacyPage />}
        {view === "terms" && <TermsPage />}
      </main>

      <Footer />
    </div>
  );
}
