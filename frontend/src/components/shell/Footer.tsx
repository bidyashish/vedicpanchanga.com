import { useI18n } from "@/i18n";
import { AdSlot } from "@/components/shell/AdSlot";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-12 pt-6 pb-10 border-t border-parchment-200">
      <div className="max-w-screen-3xl mx-auto px-3 sm:px-6 lg:px-8">
        <AdSlot slot="footer" minHeight={100} className="mb-8" />
        <div className="divider-ornate max-w-md mx-auto mb-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold">{t("shubham")}</span>
        </div>
        <p className="text-center text-xs text-ink-soft">
          {t("computed_with")} ·{" "}
          <a href="/" className="text-crimson hover:underline">
            vedicpanchanga.com
          </a>
        </p>
      </div>
    </footer>
  );
}
