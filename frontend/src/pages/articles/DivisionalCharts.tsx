import { useI18n } from "@/i18n";
import { Section } from "@/components/panchang/Section";
import { richText } from "@/lib/richText";
import { ArticleLayout } from "./ArticleLayout";

const SITE = "https://vedicpanchanga.com";

export function DivisionalCharts() {
  const { t } = useI18n();
  return (
    <ArticleLayout
      title={t("art_vargas_title")}
      intro={t("art_vargas_intro")}
      crumbs={[
        { label: t("link_kundali_calc"), href: "/kundali" },
        { label: t("learn_kundali_title"), href: "/learn/kundali" },
      ]}
      seo={{
        title: "Divisional Charts (Vargas) Explained: Navamsa D9, D10 and More · Vedic Panchanga",
        description:
          "A beginner's guide to Vedic divisional charts (vargas): what D1, D9 Navamsa, D10 and other D-charts are for, how they are calculated, and why the Navamsa is so important.",
        canonical: `${SITE}/learn/vargas`,
        keywords:
          "divisional charts, vargas, navamsa, d9 chart, d10 chart, dashamsa, vargottama, vedic astrology divisional charts",
      }}
    >
      <Section title={t("art_vargas_h1")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_vargas_p1")}</p>
          <p>{t("art_vargas_p2")}</p>
        </div>
      </Section>

      <Section title={t("art_vargas_h2")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_vargas_p3")}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t("art_vargas_li1")}</li>
            <li>{t("art_vargas_li2")}</li>
            <li>{t("art_vargas_li3")}</li>
            <li>{t("art_vargas_li4")}</li>
            <li>{t("art_vargas_li5")}</li>
            <li>{t("art_vargas_li6")}</li>
          </ul>
        </div>
      </Section>

      <Section title={t("art_vargas_h3")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_vargas_p4")}</p>
        </div>
      </Section>

      <Section title={t("art_vargas_h4")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            {richText(t("art_vargas_p5"), [{ label: t("link_kundali_calc"), href: "/kundali" }])}
          </p>
        </div>
      </Section>

      <Section title={t("art_vargas_h5")}>
        <div className="space-y-4 text-meta text-ink leading-relaxed">
          <div>
            <p className="font-semibold">{t("art_vargas_faq1_q")}</p>
            <p>{t("art_vargas_faq1_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_vargas_faq2_q")}</p>
            <p>{t("art_vargas_faq2_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_vargas_faq3_q")}</p>
            <p>{t("art_vargas_faq3_a")}</p>
          </div>
        </div>
      </Section>
    </ArticleLayout>
  );
}
