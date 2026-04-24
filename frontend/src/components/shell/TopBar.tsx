import { MandalaMark } from "@/components/common/MandalaMark";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useI18n } from "@/i18n";
import type { View } from "@/App";

export function TopBar({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  const { t } = useI18n();
  const tabs: { id: View; label: string }[] = [
    { id: "kundali", label: t("nav_kundali") },
    { id: "panchang", label: t("nav_panchang") },
    { id: "muhurta", label: t("nav_muhurta") },
  ];
  return (
    <header
      data-testid="top-bar"
      className="sticky top-0 z-30 bg-parchment-50/92 backdrop-blur-sm border-b border-parchment-200"
    >
      <div className="max-w-screen-3xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center gap-3 sm:gap-6">
        <a
          href="/"
          data-testid="brand-logo"
          className="flex items-center gap-2 shrink-0 no-underline"
          aria-label="VedicPanchanga home"
        >
          <MandalaMark size={30} />
          <div className="leading-tight hidden sm:block">
            <div className="font-serif text-lg text-crimson font-semibold tracking-tight">
              {t("brand_name")}
            </div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-gold">
              {t("brand_tagline")}
            </div>
          </div>
        </a>

        <nav
          role="tablist"
          data-testid="main-nav"
          className="flex-1 flex justify-center gap-1 sm:gap-4 overflow-x-auto scrollbar-hide"
        >
          {tabs.map((tb) => (
            <button
              key={tb.id}
              data-testid={`nav-${tb.id}`}
              role="tab"
              aria-selected={view === tb.id}
              onClick={() => setView(tb.id)}
              className={`relative whitespace-nowrap px-3 sm:px-4 py-2 text-[13px] sm:text-sm font-serif tracking-wide transition-colors ${
                view === tb.id ? "text-crimson" : "text-ink-soft hover:text-crimson"
              }`}
            >
              {tb.label}
              {view === tb.id && (
                <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-crimson rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="shrink-0">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
