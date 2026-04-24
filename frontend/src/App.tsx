import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Footer } from "@/components/shell/Footer";
import { AdSlot } from "@/components/shell/AdSlot";
import { KundaliPage } from "@/pages/KundaliPage";
import { PanchangPage } from "@/pages/PanchangPage";
import { MuhurtaPage } from "@/pages/MuhurtaPage";
import type { LocationChoice } from "@/types/api";

export type View = "kundali" | "panchang" | "muhurta";

const DEFAULT_LOCATION: LocationChoice = {
  place_name: "New Delhi, India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
};

export default function App() {
  const [view, setView] = useState<View>(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "panchang" || hash === "muhurta") return hash;
    return "kundali";
  });
  const [sharedLocation, setSharedLocation] = useState<LocationChoice>(DEFAULT_LOCATION);

  useEffect(() => {
    const desired = view === "kundali" ? "" : `#${view}`;
    if (window.location.hash !== desired) {
      const url = window.location.pathname + window.location.search + desired;
      window.history.replaceState(null, "", url);
    }
  }, [view]);

  const handleLocationChange = useCallback((loc: LocationChoice) => {
    setSharedLocation(loc);
  }, []);

  return (
    <div className="parchment-bg min-h-screen flex flex-col">
      <TopBar view={view} setView={setView} />

      {/* Slim leaderboard ad — only on desktop, never displaces mobile/tablet content */}
      <div className="hidden xl:block max-w-screen-3xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3">
        <AdSlot slot="header" minHeight={60} className="mb-3" />
      </div>

      <main className="flex-1 max-w-screen-3xl w-full mx-auto px-3 sm:px-6 lg:px-8">
        {view === "kundali" && (
          <KundaliPage
            sharedLocation={sharedLocation}
            onLocationChange={handleLocationChange}
          />
        )}
        {view === "panchang" && <PanchangPage defaultLocation={sharedLocation} />}
        {view === "muhurta" && <MuhurtaPage defaultLocation={sharedLocation} />}
      </main>

      <Footer />
    </div>
  );
}
