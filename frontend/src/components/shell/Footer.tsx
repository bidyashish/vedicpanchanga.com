import { useI18n } from "@/i18n";
import { AdSlot } from "@/components/shell/AdSlot";
import { CONTACT_EMAIL } from "@/lib/contact";

const GITHUB_URL = "https://github.com/bidyashish/vedicpanchanga.com";

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
        <p className="mt-2 text-center text-mini text-ink-soft flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
          <a href="/privacy" className="hover:text-saffron-dark hover:underline">
            Privacy
          </a>
          <span aria-hidden="true">·</span>
          <a href="/terms" className="hover:text-saffron-dark hover:underline">
            Terms
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-saffron-dark hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-saffron-dark hover:underline inline-flex items-center gap-1"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.17.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.2-1.48 3.16-1.17 3.16-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.37-5.25 5.65.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .3.21.66.79.55C20.22 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
