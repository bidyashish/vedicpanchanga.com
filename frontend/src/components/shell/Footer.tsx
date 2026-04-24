import { useI18n } from "@/i18n";
import { AdSlot } from "@/components/shell/AdSlot";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-12 pt-6 pb-8 border-t border-parchment-200">
      <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdSlot slot="footer" minHeight={90} className="mb-6" />
        <p className="text-center text-mini text-ink-soft">
          {t("computed_with")} ·{" "}
          <a href="/" className="text-saffron hover:text-saffron-dark font-semibold">
            vedicpanchanga.com
          </a>
        </p>
      </div>
    </footer>
  );
}
