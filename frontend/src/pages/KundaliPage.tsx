import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { BirthForm, type BirthFormState } from "@/components/kundali/BirthForm";
import { BirthHeader } from "@/components/kundali/BirthHeader";
import { ChartTabs } from "@/components/kundali/ChartTabs";
import { PlanetsTable } from "@/components/kundali/PlanetsTable";
import { DashaTable } from "@/components/kundali/DashaTable";
import { AshtakavargaTable } from "@/components/kundali/AshtakavargaTable";
import { JaiminiSection } from "@/components/kundali/JaiminiSection";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { calculateChart, printPdf } from "@/lib/api";
import type { ChartData, LocationChoice } from "@/types/api";

// PDF ships full label sets for all 15 UI languages. Bundled fonts cover
// Latin (incl. Cyrillic), Devanagari, Tamil, SC, JP, Arabic (Persian shares
// the script), Hebrew, Bengali. Nepali reuses the Devanagari face.
type PdfLang =
  | "en"
  | "hi"
  | "ta"
  | "bn"
  | "ne"
  | "zh"
  | "ja"
  | "es"
  | "de"
  | "pt"
  | "fr"
  | "ru"
  | "ar"
  | "fa"
  | "he";
const PDF_LANGS = new Set<PdfLang>([
  "en",
  "hi",
  "ta",
  "bn",
  "ne",
  "zh",
  "ja",
  "es",
  "de",
  "pt",
  "fr",
  "ru",
  "ar",
  "fa",
  "he",
]);
const pdfLangFor = (uiLang: string): PdfLang =>
  PDF_LANGS.has(uiLang as PdfLang) ? (uiLang as PdfLang) : "en";

const DEFAULT_FORM: BirthFormState = {
  birth_date: "1990-01-01",
  birth_time: "12:00",
  place_name: "New Delhi, India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
  ayanamsa: "lahiri",
};

interface Props {
  sharedLocation: LocationChoice;
  onLocationChange: (loc: LocationChoice) => void;
}

export function KundaliPage({ sharedLocation, onLocationChange }: Props) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState<BirthFormState>(() => ({
    ...DEFAULT_FORM,
    place_name: sharedLocation.place_name,
    latitude: sharedLocation.latitude,
    longitude: sharedLocation.longitude,
    timezone: sharedLocation.timezone,
  }));
  const [data, setData] = useState<ChartData | null>(null);
  const [submittedPlaceName, setSubmittedPlaceName] = useState<string>(sharedLocation.place_name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeName, setNativeName] = useState<string>("");
  const [printing, setPrinting] = useState(false);
  const didAutoRunRef = useRef(false);

  const calculate = async (body: BirthFormState) => {
    setLoading(true);
    setError(null);
    try {
      const result = await calculateChart({
        birth_date: body.birth_date,
        birth_time: body.birth_time,
        latitude: body.latitude,
        longitude: body.longitude,
        timezone: body.timezone,
        place_name: body.place_name,
        ayanamsa: body.ayanamsa as never,
      });
      setData(result);
      setSubmittedPlaceName(body.place_name);
    } catch (e) {
      setError((e as Error).message || "Failed to compute chart");
      // Keep previous chart visible on error rather than wiping it.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didAutoRunRef.current) return;
    didAutoRunRef.current = true;
    calculate(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = () => {
    if (!Number.isFinite(form.latitude) || !Number.isFinite(form.longitude)) {
      setError("Please enter valid latitude and longitude, or pick a city.");
      return;
    }
    onLocationChange({
      place_name: form.place_name,
      latitude: form.latitude,
      longitude: form.longitude,
      timezone: form.timezone,
    });
    calculate(form);
  };

  const onPrint = async () => {
    if (!Number.isFinite(form.latitude) || !Number.isFinite(form.longitude)) {
      setError("Please enter valid latitude and longitude, or pick a city.");
      return;
    }
    // Open the tab synchronously - iOS Safari requires this inside the
    // user gesture or it blocks the popup. Crucially, no `noopener`: that
    // flag makes iOS Safari refuse to let the parent control the tab,
    // turning `newTab.location.href = url` into a silent no-op.
    const newTab = window.open("about:blank", "_blank");
    if (newTab) {
      // Show a loading hint so the user doesn't stare at an empty tab.
      try {
        newTab.document.write(
          "<!DOCTYPE html><html><head><title>Preparing PDF…</title>" +
            '<meta name="viewport" content="width=device-width,initial-scale=1">' +
            '</head><body style="margin:0;font-family:-apple-system,system-ui,sans-serif;' +
            'display:flex;align-items:center;justify-content:center;height:100vh;color:#555">' +
            "<p>Preparing PDF…</p></body></html>",
        );
      } catch {
        /* document may not be writable in edge cases */
      }
    }
    setPrinting(true);
    setError(null);
    try {
      const blob = await printPdf({
        name: nativeName,
        sex: "Male",
        birth_date: form.birth_date,
        birth_time: form.birth_time,
        latitude: form.latitude,
        longitude: form.longitude,
        timezone: form.timezone,
        place_name: form.place_name,
        ayanamsa: form.ayanamsa,
        lang: pdfLangFor(lang),
      });
      const url = URL.createObjectURL(blob);
      if (newTab && !newTab.closed) {
        // iOS Safari won't navigate a new tab directly to a blob URL via
        // location.href, but it WILL render a blob URL inside an iframe
        // hosted in that tab. Replace the loading page with an iframe
        // wrapping the PDF.
        newTab.document.open();
        newTab.document.write(
          "<!DOCTYPE html><html><head><title>Vedic Kundali</title>" +
            '<meta name="viewport" content="width=device-width,initial-scale=1">' +
            '</head><body style="margin:0;height:100vh;background:#222">' +
            `<iframe src="${url}" title="Vedic Kundali" ` +
            'style="border:0;width:100%;height:100%;display:block"></iframe>' +
            "</body></html>",
        );
        newTab.document.close();
      } else {
        // Popup was blocked entirely - fall back to an anchor click and
        // let the browser/OS pick how to handle the file (download in
        // most cases).
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.download = `vedic-kundali-${form.birth_date || "chart"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      if (newTab && !newTab.closed) newTab.close();
      setError((e as Error).message || "PDF generation failed");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <section className="pt-3 sm:pt-4 pb-8" data-testid="kundali-page">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Left sidebar — form */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="card p-4 sm:p-5 lg:sticky lg:top-16">
            <h2 className="heading-section">{t("birth_details")}</h2>
            <p className="meta mb-4">{t("enter_native_time_place")}</p>
            <div className="mb-3">
              <label className="field-label" htmlFor="native-name-input">
                {t("native_name")}
              </label>
              <input
                id="native-name-input"
                data-testid="native-name-input"
                type="text"
                value={nativeName}
                onChange={(e) => setNativeName(e.target.value)}
                className="field"
                maxLength={40}
                autoComplete="name"
              />
            </div>
            <BirthForm form={form} setForm={setForm} onSubmit={onSubmit} loading={loading} />
            <div className="mt-3">
              <button
                type="button"
                data-testid="print-pdf"
                onClick={onPrint}
                disabled={printing || loading}
                className="btn-ghost w-full"
              >
                {printing ? t("preparing_pdf") : t("print_pdf")}
              </button>
            </div>
            {error && (
              <div
                data-testid="error-banner"
                className="mt-3 border border-rose/40 bg-rose/5 text-rose text-mini px-3 py-2 rounded-sm"
              >
                {error}
              </div>
            )}
          </div>
        </aside>

        {/* Middle — chart + data */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {loading && !data && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <MandalaLoader size={48} />
              <p className="meta italic">{t("consulting_heavens")}</p>
            </div>
          )}
          {data && (
            <>
              <BirthHeader data={data} placeName={submittedPlaceName} />
              <ChartTabs data={data} />
              <PlanetsTable planets={data.planets_data} ascendant={data.ascendant} />
              <DashaTable dasha={data.dasha} dashaAntar={data.dasha_antar} />
              <JaiminiSection
                karakas={data.karakas}
                karakamsa={data.karakamsa}
                swamsa={data.swamsa}
              />
              <AshtakavargaTable ashtakavarga={data.ashtakavarga} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
