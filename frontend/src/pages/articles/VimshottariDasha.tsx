import { useI18n } from "@/i18n";
import { Section } from "@/components/panchang/Section";
import { richText } from "@/lib/richText";
import { ArticleLayout } from "./ArticleLayout";

const SITE = "https://vedicpanchanga.com";

export function VimshottariDasha() {
  const { t } = useI18n();
  return (
    <ArticleLayout
      title={t("art_dasha_title")}
      intro={t("art_dasha_intro")}
      crumbs={[
        { label: t("link_kundali_calc"), href: "/kundali" },
        { label: t("learn_nakshatras_title"), href: "/learn/nakshatras" },
      ]}
      seo={{
        title: "Vimshottari Dasha Explained: The Vedic Timeline of Your Life · Vedic Panchanga",
        description:
          "A beginner's guide to Vimshottari Dasha: how the 120-year planetary timeline works, the order and years of each mahadasha, antardasha and pratyantar sub-periods, and how to read your dasha.",
        canonical: `${SITE}/learn/dasha`,
        keywords:
          "vimshottari dasha, mahadasha, antardasha, pratyantar, planetary periods, dasha calculator, vedic astrology timeline, nakshatra dasha",
      }}
    >
      <Section title={t("art_dasha_h1")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_dasha_p1")}</p>
          <p>
            {richText(t("art_dasha_p2"), [
              { label: t("link_nakshatras_guide"), href: "/learn/nakshatras" },
            ])}
          </p>
        </div>
      </Section>

      <Section title={t("art_dasha_h2")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_dasha_p3")}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t("art_dasha_li1")}</li>
            <li>{t("art_dasha_li2")}</li>
            <li>{t("art_dasha_li3")}</li>
            <li>{t("art_dasha_li4")}</li>
            <li>{t("art_dasha_li5")}</li>
            <li>{t("art_dasha_li6")}</li>
            <li>{t("art_dasha_li7")}</li>
            <li>{t("art_dasha_li8")}</li>
            <li>{t("art_dasha_li9")}</li>
          </ul>
          <p>{t("art_dasha_p4")}</p>
        </div>
      </Section>

      <Section title={t("art_dasha_h3")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_dasha_p5")}</p>
          <p>{t("art_dasha_p6")}</p>
        </div>
      </Section>

      <Section title={t("art_dasha_h4")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            {richText(t("art_dasha_p7"), [{ label: t("link_kundali_calc"), href: "/kundali" }])}
          </p>
        </div>
      </Section>

      <Section title={t("art_dasha_h5")}>
        <div className="space-y-4 text-meta text-ink leading-relaxed">
          <div>
            <p className="font-semibold">{t("art_dasha_faq1_q")}</p>
            <p>{t("art_dasha_faq1_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_dasha_faq2_q")}</p>
            <p>{t("art_dasha_faq2_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_dasha_faq3_q")}</p>
            <p>{t("art_dasha_faq3_a")}</p>
          </div>
        </div>
      </Section>
    </ArticleLayout>
  );
}
