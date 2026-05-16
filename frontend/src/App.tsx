import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { NotificationBanner } from "@/components/shell/NotificationBanner";
import { Footer } from "@/components/shell/Footer";
import { KundaliPage } from "@/pages/KundaliPage";
import { PanchangPage } from "@/pages/PanchangPage";
import { MuhurtaPage } from "@/pages/MuhurtaPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { applySeo } from "@/lib/seo";
import { fetchGeoIP } from "@/lib/api";
import { loadAdSense } from "@/lib/adsense";
import type { LocationChoice } from "@/types/api";

export type View = "kundali" | "panchang" | "muhurta" | "privacy" | "terms";

const MONETIZED_VIEWS = new Set<View>(["panchang", "kundali", "muhurta"]);

const SITE = "https://vedicpanchanga.com";

const VIEW_PATH: Record<View, string> = {
  panchang: "/",
  kundali: "/kundali",
  muhurta: "/muhurta",
  privacy: "/privacy",
  terms: "/terms",
};

const SEO_BY_VIEW: Record<View, { title: string; description: string; canonical: string }> = {
  panchang: {
    title: "Vedic Panchanga - Free Drik Panchang, Kundali & Muhurta Calculator",
    description:
      "Free Vedic Panchanga calculator: daily Drik Panchang, North & South Indian Kundali (birth chart), Vimshottari Dasha, divisional charts, and Muhurta finder. Sidereal Lahiri, Swiss Ephemeris precision.",
    canonical: `${SITE}/`,
  },
  kundali: {
    title: "Free Kundali - North & South Indian Birth Chart Calculator · Vedic Panchanga",
    description:
      "Generate a Kundali (Vedic birth chart) in North or South Indian style: planetary positions, 16 divisional charts, Vimshottari Dasha, Ashtakavarga. Lahiri ayanamsa, Swiss Ephemeris precision.",
    canonical: `${SITE}/kundali`,
  },
  muhurta: {
    title: "Muhurta Finder - Auspicious Timings for Any Undertaking · Vedic Panchanga",
    description:
      "Find auspicious muhurta windows by purpose, date range and location. Purpose-based scoring with explainable reasons; native filters for Chandrabalam and Tarabalam.",
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
    case "/privacy":
      return "privacy";
    case "/terms":
      return "terms";
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
  const allowed: View[] = ["kundali", "panchang", "muhurta"];
  const v = allowed.includes(hash as View) ? (hash as View) : null;
  if (!v) return null;
  window.history.replaceState(null, "", VIEW_PATH[v] + window.location.search);
  return v;
}

export default function App() {
  const [view, setView] = useState<View>(() => migrateHashOnce() ?? viewFromPath());
  // null = geo-IP not yet resolved. Pages stay unmounted until it settles so
  // their internal `loc` snapshots seed from the geo-IP result, not Ujjain.
  const [sharedLocation, setSharedLocation] = useState<LocationChoice | null>(null);

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

  // StrictMode double-mounts the tree in dev; the ref guard makes sure we only
  // hit /api/geo-ip once per page load. Production never double-fires.
  const geoFetchedRef = useRef(false);
  useEffect(() => {
    if (geoFetchedRef.current) return;
    geoFetchedRef.current = true;
    fetchGeoIP().then((geo) => {
      setSharedLocation(
        geo
          ? {
              place_name: geo.place_name,
              latitude: geo.latitude,
              longitude: geo.longitude,
              timezone: null,
            }
          : DEFAULT_LOCATION,
      );
    });
  }, []);

  // Keep <title>, <meta>, canonical link in sync with the current route.
  useEffect(() => {
    applySeo(SEO_BY_VIEW[view]);
  }, [view]);

  // Lazy-load AdSense only after the calculator content is actually on screen
  // and only on monetized routes. AdSense's crawler hitting /privacy or /terms
  // directly will find no ad script - addresses the "ads on screens without
  // publisher-content" violation. Once injected, the script persists.
  useEffect(() => {
    if (!sharedLocation) return;
    if (!MONETIZED_VIEWS.has(view)) return;
    const id = window.setTimeout(loadAdSense, 0);
    return () => window.clearTimeout(id);
  }, [view, sharedLocation]);

  return (
    <div className="parchment-bg min-h-screen flex flex-col">
      <NotificationBanner />
      <TopBar view={view} setView={setView} />

      <main className="flex-1 max-w-screen-3xl w-full mx-auto px-3 sm:px-6 lg:px-8">
        {sharedLocation && view === "kundali" && (
          <KundaliPage sharedLocation={sharedLocation} onLocationChange={setSharedLocation} />
        )}
        {sharedLocation && view === "panchang" && <PanchangPage defaultLocation={sharedLocation} />}
        {sharedLocation && view === "muhurta" && <MuhurtaPage defaultLocation={sharedLocation} />}
        {view === "privacy" && <PrivacyPage />}
        {view === "terms" && <TermsPage />}
      </main>

      <Footer />
    </div>
  );
}
