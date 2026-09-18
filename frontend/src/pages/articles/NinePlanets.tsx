import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { Section } from "@/components/panchang/Section";
import { PLANET_GUIDE } from "@/content/planetGuide";
import { planetColor } from "@/lib/planets";
import { richText } from "@/lib/richText";
import { ArticleLayout } from "./ArticleLayout";

const SITE = "https://vedicpanchanga.com";

export function NinePlanets() {
  const { t } = useI18n();
  const a = useAstro();
  return (
    <ArticleLayout
      title={t("art_planets_title")}
      intro={t("art_planets_intro")}
      crumbs={[
        { label: t("link_kundali_calc"), href: "/kundali" },
        { label: t("learn_kundali_title"), href: "/learn/kundali" },
      ]}
      seo={{
        title: "The 9 Planets (Navagraha) in Vedic Astrology · Vedic Panchanga",
        description:
          "A complete beginner's guide to the nine planets (navagraha) in Vedic astrology: what the Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu signify in a kundali.",
        canonical: `${SITE}/learn/planets`,
        keywords:
          "navagraha, nine planets vedic astrology, grahas, planet significations, karaka, benefic malefic planets",
      }}
    >
      <Section title={t("art_planets_h1")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_planets_p1")}</p>
          <p>
            {richText(t("art_planets_p2"), [{ label: t("link_kundali_page"), href: "/kundali" }])}
          </p>
        </div>
      </Section>

      <Section title={t("art_planets_h2_list")}>
        <div className="space-y-5 text-meta text-ink leading-relaxed">
          {PLANET_GUIDE.map((p) => {
            const color = planetColor(p.abbr);
            return (
              <div key={p.abbr} className="flex gap-3 sm:gap-4">
                <span
                  className="grid place-items-center w-10 h-10 shrink-0 rounded-full text-xl font-semibold"
                  style={{
                    color,
                    backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
                  }}
                  aria-hidden="true"
                >
                  {p.glyph}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink">
                    <span style={{ color }}>{a.planet(p.name)}</span>
                  </h3>
                  <p className="text-mini font-semibold text-ink-soft mt-0.5">
                    {t(`pg_${p.key}_sig`)}
                  </p>
                  <p className="mt-1.5">{t(`pg_${p.key}_body`)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={t("art_planets_h2")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_planets_p3")}</p>
        </div>
      </Section>

      <Section title={t("art_planets_h3")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_planets_p4")}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t("art_planets_li1")}</li>
            <li>{t("art_planets_li2")}</li>
            <li>{t("art_planets_li3")}</li>
            <li>{t("art_planets_li4")}</li>
          </ul>
          <p>
            {richText(t("art_planets_p5"), [{ label: t("link_kundali_calc"), href: "/kundali" }])}
          </p>
        </div>
      </Section>

      <Section title={t("art_planets_h4")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            {richText(t("art_planets_p6"), [
              { label: t("link_kundali_beginner"), href: "/learn/kundali" },
            ])}
          </p>
        </div>
      </Section>
    </ArticleLayout>
  );
}
