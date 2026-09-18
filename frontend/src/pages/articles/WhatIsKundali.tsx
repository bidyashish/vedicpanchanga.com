import { useI18n } from "@/i18n";
import { Section } from "@/components/panchang/Section";
import { richText } from "@/lib/richText";
import { ArticleLayout } from "./ArticleLayout";

const SITE = "https://vedicpanchanga.com";

export function WhatIsKundali() {
  const { t } = useI18n();
  return (
    <ArticleLayout
      title={t("art_kundali_title")}
      intro={t("art_kundali_intro")}
      crumbs={[
        { label: t("link_kundali_calc"), href: "/kundali" },
        { label: t("learn_planets_title"), href: "/learn/planets" },
      ]}
      seo={{
        title: "What Is a Kundali? Beginner's Guide to the Vedic Birth Chart · Vedic Panchanga",
        description:
          "A clear beginner's guide to the kundali (Vedic birth chart): what it is, how the ascendant, houses, signs and planets fit together, and how to read a janam kundali step by step.",
        canonical: `${SITE}/learn/kundali`,
        keywords:
          "what is a kundali, janam kundali, vedic birth chart, lagna, ascendant, rashi, houses in astrology, how to read kundali, north indian chart",
      }}
    >
      <Section title={t("art_kundali_h1")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_kundali_p1")}</p>
          <p>
            {richText(t("art_kundali_p2"), [{ label: t("link_kundali_calc"), href: "/kundali" }])}
          </p>
        </div>
      </Section>

      <Section title={t("art_kundali_h2")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_kundali_p3")}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t("art_kundali_li1")}</li>
            <li>{t("art_kundali_li2")}</li>
            <li>{t("art_kundali_li3")}</li>
            <li>{t("art_kundali_li4")}</li>
          </ul>
        </div>
      </Section>

      <Section title={t("art_kundali_h3")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_kundali_p4")}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t("art_kundali_li5")}</li>
            <li>{t("art_kundali_li6")}</li>
          </ul>
          <p>{t("art_kundali_p5")}</p>
        </div>
      </Section>

      <Section title={t("art_kundali_h4")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_kundali_p6")}</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>{t("art_kundali_ol1")}</li>
            <li>{t("art_kundali_ol2")}</li>
            <li>{t("art_kundali_ol3")}</li>
            <li>{t("art_kundali_ol4")}</li>
          </ol>
          <p>
            {richText(t("art_kundali_p7"), [
              { label: t("link_free_kundali_calc"), href: "/kundali" },
              { label: t("link_nine_planets_guide"), href: "/learn/planets" },
            ])}
          </p>
        </div>
      </Section>

      <Section title={t("art_kundali_h5")}>
        <div className="space-y-4 text-meta text-ink leading-relaxed">
          <div>
            <p className="font-semibold">{t("art_kundali_faq1_q")}</p>
            <p>{t("art_kundali_faq1_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_kundali_faq2_q")}</p>
            <p>{t("art_kundali_faq2_a")}</p>
          </div>
          <div>
            <p className="font-semibold">{t("art_kundali_faq3_q")}</p>
            <p>{t("art_kundali_faq3_a")}</p>
          </div>
        </div>
      </Section>
    </ArticleLayout>
  );
}
