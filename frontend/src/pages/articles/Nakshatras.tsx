import { useI18n } from "@/i18n";
import { Section } from "@/components/panchang/Section";
import { richText } from "@/lib/richText";
import { ArticleLayout } from "./ArticleLayout";

const SITE = "https://vedicpanchanga.com";

export function Nakshatras() {
  const { t } = useI18n();
  return (
    <ArticleLayout
      title={t("art_naks_title")}
      intro={t("art_naks_intro")}
      crumbs={[
        { label: t("link_kundali_calc"), href: "/kundali" },
        { label: t("learn_dasha_title"), href: "/learn/dasha" },
      ]}
      seo={{
        title: "The 27 Nakshatras: Your Vedic Birth Star Explained · Vedic Panchanga",
        description:
          "A beginner's guide to the 27 nakshatras (lunar mansions): what your janma nakshatra or birth star means, the four padas, and how nakshatras drive dasha, matching and muhurta.",
        canonical: `${SITE}/learn/nakshatras`,
        keywords:
          "nakshatra, 27 nakshatras, lunar mansions, birth star, janma nakshatra, pada, naksha tra meaning, vedic astrology star",
      }}
    >
      <Section title={t("art_naks_h1")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_naks_p1")}</p>
          <p>{t("art_naks_p2")}</p>
        </div>
      </Section>

      <Section title={t("art_naks_h2")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            {richText(t("art_naks_p3"), [{ label: t("link_vargas_guide"), href: "/learn/vargas" }])}
          </p>
        </div>
      </Section>

      <Section title={t("art_naks_h3")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_naks_p4")}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              {richText(t("art_naks_li1"), [
                { label: t("link_dasha_guide"), href: "/learn/dasha" },
              ])}
            </li>
            <li>{t("art_naks_li2")}</li>
            <li>{t("art_naks_li3")}</li>
            <li>{t("art_naks_li4")}</li>
          </ul>
        </div>
      </Section>

      <Section title={t("art_naks_h4")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            {richText(t("art_naks_p5"), [
              { label: t("link_kundali_calc"), href: "/kundali" },
              { label: t("link_panchang_page"), href: "/panchang" },
            ])}
          </p>
        </div>
      </Section>

      <Section title={t("art_naks_h5")}>
        <div className="space-y-4 text-meta text-ink leading-relaxed">
          <div>
            <p className="font-semibold">{t("art_naks_faq1_q")}</p>
            <p>{t("art_naks_faq1_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_naks_faq2_q")}</p>
            <p>{t("art_naks_faq2_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_naks_faq3_q")}</p>
            <p>{t("art_naks_faq3_a")}</p>
          </div>
        </div>
      </Section>
    </ArticleLayout>
  );
}
