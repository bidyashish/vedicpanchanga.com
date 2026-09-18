import { useI18n } from "@/i18n";
import { Section } from "@/components/panchang/Section";
import { richText } from "@/lib/richText";
import { ArticleLayout } from "./ArticleLayout";

const SITE = "https://vedicpanchanga.com";

export function MoonSignVsSunSign() {
  const { t } = useI18n();
  return (
    <ArticleLayout
      title={t("art_rashi_title")}
      intro={t("art_rashi_intro")}
      crumbs={[
        { label: t("link_kundali_calc"), href: "/kundali" },
        { label: t("learn_nakshatras_title"), href: "/learn/nakshatras" },
      ]}
      seo={{
        title: "Moon Sign vs Sun Sign: Why Vedic Astrology Uses the Moon · Vedic Panchanga",
        description:
          "Why your Vedic Moon sign (Chandra Rashi) differs from your Western Sun sign: the sidereal vs tropical zodiac, the ayanamsa, and which sign to read for what.",
        canonical: `${SITE}/learn/rashi`,
        keywords:
          "moon sign vs sun sign, chandra rashi, rashi, sidereal vs tropical, ayanamsa, vedic vs western astrology, moon sign meaning",
      }}
    >
      <Section title={t("art_rashi_h1")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_rashi_p1")}</p>
        </div>
      </Section>

      <Section title={t("art_rashi_h2")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            {richText(t("art_rashi_p2"), [{ label: t("link_dasha_guide"), href: "/learn/dasha" }])}
          </p>
        </div>
      </Section>

      <Section title={t("art_rashi_h3")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_rashi_p3")}</p>
          <p>{t("art_rashi_p4")}</p>
        </div>
      </Section>

      <Section title={t("art_rashi_h4")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            {richText(t("art_rashi_p5"), [{ label: t("link_kundali_calc"), href: "/kundali" }])}
          </p>
        </div>
      </Section>

      <Section title={t("art_rashi_h5")}>
        <div className="space-y-4 text-meta text-ink leading-relaxed">
          <div>
            <p className="font-semibold">{t("art_rashi_faq1_q")}</p>
            <p>{t("art_rashi_faq1_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_rashi_faq2_q")}</p>
            <p>{t("art_rashi_faq2_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_rashi_faq3_q")}</p>
            <p>{t("art_rashi_faq3_a")}</p>
          </div>
        </div>
      </Section>
    </ArticleLayout>
  );
}
