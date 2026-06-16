import { useI18n } from "@/i18n";
import { Section } from "@/components/panchang/Section";
import { richText } from "@/lib/richText";
import { ArticleLayout } from "./ArticleLayout";

const SITE = "https://vedicpanchanga.com";

export function UnderstandingPanchang() {
  const { t } = useI18n();
  return (
    <ArticleLayout
      title={t("art_panchang_title")}
      intro={t("art_panchang_intro")}
      crumbs={[
        { label: t("learn_panchang_title"), href: "/" },
        { label: t("link_muhurta_finder"), href: "/muhurta" },
      ]}
      seo={{
        title: "Understanding Panchang: Tithi, Nakshatra, Yoga, Karana, Vara · Vedic Panchanga",
        description:
          "A beginner's guide to the panchang (Hindu almanac): what tithi, nakshatra, yoga, karana and vara mean, how they are calculated, and how to read the daily panchang.",
        canonical: `${SITE}/learn/panchang`,
        keywords:
          "what is panchang, panchanga, tithi, nakshatra, yoga, karana, vara, hindu calendar, drik panchang",
      }}
    >
      <Section title={t("art_panchang_h1")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_panchang_p1")}</p>
          <p>{richText(t("art_panchang_p2"), [{ label: t("link_panchang_page"), href: "/" }])}</p>
        </div>
      </Section>

      <Section title={t("art_panchang_h2")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_panchang_p3")}</p>
          <p>{t("art_panchang_p4")}</p>
          <p>{t("art_panchang_p5")}</p>
          <p>{t("art_panchang_p6")}</p>
          <p>{t("art_panchang_p7")}</p>
        </div>
      </Section>

      <Section title={t("art_panchang_h3")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_panchang_p8")}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t("art_panchang_li1")}</li>
            <li>{t("art_panchang_li2")}</li>
            <li>{t("art_panchang_li3")}</li>
            <li>{t("art_panchang_li4")}</li>
          </ul>
        </div>
      </Section>

      <Section title={t("art_panchang_h4")}>
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>{t("art_panchang_p9")}</p>
          <p>
            {richText(t("art_panchang_p10"), [
              { label: t("link_panchang_page"), href: "/" },
              { label: t("link_muhurta_finder"), href: "/muhurta" },
            ])}
          </p>
        </div>
      </Section>
    </ArticleLayout>
  );
}
