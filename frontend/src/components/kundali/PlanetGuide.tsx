import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { PLANET_GUIDE } from "@/content/planetGuide";
import { planetColor } from "@/lib/planets";
import { richText } from "@/lib/richText";

// An evergreen, plain-language walkthrough of the nine grahas, rendered as a
// numbered guide at the bottom of the Kundali page. This turns the numeric
// chart above it into readable, educational content. All strings are i18n keys
// (pg_*) so the guide is fully localized; planet names come from useAstro.

export function PlanetGuide() {
  const { t } = useI18n();
  const a = useAstro();
  return (
    <section
      data-testid="planet-guide"
      className="card p-3 sm:p-4 lg:p-5"
      aria-labelledby="planet-guide-title"
    >
      <div className="mb-3 pb-2 border-b border-parchment-200">
        <h2 id="planet-guide-title" className="heading-section">
          {t("pg_title")}
        </h2>
        <p className="text-meta text-ink-soft mt-1 leading-relaxed">{t("pg_intro")}</p>
      </div>

      <ol className="space-y-4">
        {PLANET_GUIDE.map((p, i) => {
          const color = planetColor(p.abbr);
          return (
            <li key={p.abbr} className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center shrink-0">
                <span
                  className="grid place-items-center w-10 h-10 sm:w-11 sm:h-11 rounded-full text-xl font-semibold"
                  style={{
                    color,
                    backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
                  }}
                  aria-hidden="true"
                >
                  {p.glyph}
                </span>
                <span className="text-mini text-ink-soft mt-1 tabular-nums">
                  {t("pg_step")} {a.num(i + 1)}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-meta font-semibold text-ink">
                  <span style={{ color }}>{a.planet(p.name)}</span>
                </h3>
                <p className="text-mini font-semibold text-ink-soft mt-0.5">
                  {t(`pg_${p.key}_sig`)}
                </p>
                <p className="text-meta text-ink mt-1.5 leading-relaxed">{t(`pg_${p.key}_body`)}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-mini text-ink-soft mt-5 pt-3 border-t border-parchment-200 leading-relaxed">
        {richText(t("pg_footnote"), [
          { label: t("link_nine_planets"), href: "/learn/planets" },
          { label: t("link_what_kundali"), href: "/learn/kundali" },
        ])}
      </p>
    </section>
  );
}
