import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Footer } from "@/components/shell/Footer";
import { AdSlot } from "@/components/shell/AdSlot";
import { KundaliPage } from "@/pages/KundaliPage";
import { PanchangPage } from "@/pages/PanchangPage";
import { MuhurtaPage } from "@/pages/MuhurtaPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import type { LocationChoice } from "@/types/api";

export type View = "kundali" | "panchang" | "muhurta" | "privacy" | "terms";

const DEFAULT_LOCATION: LocationChoice = {
  place_name: "New Delhi, India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
};

function viewFromUrl(): View {
  const path = window.location.pathname;
  if (path === "/privacy") return "privacy";
  if (path === "/terms") return "terms";
  const hash = window.location.hash.replace("#", "");
  if (hash === "panchang" || hash === "muhurta") return hash;
  return "kundali";
}

export default function App() {
  const [view, setView] = useState<View>(viewFromUrl);
  const [sharedLocation, setSharedLocation] = useState<LocationChoice>(DEFAULT_LOCATION);

  // Sync URL when view changes. Privacy/Terms are real paths; calculator
  // tabs share the root path with a hash.
  useEffect(() => {
    let desiredPath: string;
    let desiredHash: string;
    if (view === "privacy" || view === "terms") {
      desiredPath = `/${view}`;
      desiredHash = "";
    } else {
      desiredPath = "/";
      desiredHash = view === "kundali" ? "" : `#${view}`;
    }
    if (
      window.location.pathname === desiredPath &&
      window.location.hash === desiredHash
    ) {
      return;
    }
    const url = desiredPath + window.location.search + desiredHash;
    if (window.location.pathname !== desiredPath) {
      // Crossing path boundary (calculator <-> legal) — push so back works.
      window.history.pushState(null, "", url);
    } else {
      // Same path, just toggling calculator tabs — replace.
      window.history.replaceState(null, "", url);
    }
  }, [view]);

  // React to back/forward navigation and external hash changes.
  useEffect(() => {
    const sync = () => setView(viewFromUrl());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const handleLocationChange = useCallback((loc: LocationChoice) => {
    setSharedLocation(loc);
  }, []);

  const isLegal = view === "privacy" || view === "terms";

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
          <KundaliPage
            sharedLocation={sharedLocation}
            onLocationChange={handleLocationChange}
          />
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
