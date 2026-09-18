import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import type { PanchangData } from "@/types/api";
import { Section } from "./Section";
import { TimeBand } from "./TimeBand";

/** Auspicious windows of the day: Brahma muhurta through Ravi Yoga. */
export function AuspiciousTimings({
  data,
  tz,
  refDate,
}: {
  data: PanchangData;
  tz?: string;
  refDate?: string;
}) {
  const { t } = useI18n();
  const a = useAstro();
  return (
    <Section title={t("auspicious_title")} testId="section-auspicious">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <TimeBand
          testId="band-brahma"
          title={t("muhurta_brahma")}
          window={data.auspicious_timings.brahma_muhurta}
          color="var(--success)"
          desc={t("muhurta_brahma_desc")}
          tz={tz}
          refDate={refDate}
        />
        <TimeBand
          testId="band-pratah"
          title={t("muhurta_pratah_sandhya")}
          window={data.auspicious_timings.pratah_sandhya}
          color="var(--success)"
          desc={t("muhurta_pratah_sandhya_desc")}
          tz={tz}
          refDate={refDate}
        />
        <TimeBand
          testId="band-abhijit"
          title={t("muhurta_abhijit_full")}
          window={data.auspicious_timings.abhijit}
          color="var(--success)"
          desc={t("muhurta_abhijit_desc")}
          tz={tz}
          refDate={refDate}
        />
        <TimeBand
          testId="band-vijay"
          title={t("muhurta_vijay")}
          window={data.auspicious_timings.vijay_muhurta}
          color="var(--success)"
          desc={t("muhurta_vijay_desc")}
          tz={tz}
          refDate={refDate}
        />
        <TimeBand
          testId="band-godhuli"
          title={t("muhurta_godhuli")}
          window={data.auspicious_timings.godhuli_muhurta}
          color="var(--success)"
          desc={t("muhurta_godhuli_desc")}
          tz={tz}
          refDate={refDate}
        />
        <TimeBand
          testId="band-sayahna"
          title={t("muhurta_sayam_sandhya")}
          window={data.auspicious_timings.sayahna_sandhya}
          color="var(--success)"
          desc={t("muhurta_sayam_sandhya_desc")}
          tz={tz}
          refDate={refDate}
        />
        <TimeBand
          testId="band-nishita"
          title={t("muhurta_nishita")}
          window={data.auspicious_timings.nishita_muhurta}
          color="var(--success)"
          desc={t("muhurta_nishita_desc")}
          tz={tz}
          refDate={refDate}
        />
        {(data.auspicious_timings.amrit_kalam ?? []).map((amrit, i) => (
          <TimeBand
            key={`am-${i}`}
            testId={`band-amrit-${i}`}
            title={t("muhurta_amrit_kalam")}
            window={amrit}
            color="var(--success)"
            desc={`${t("muhurta_amrit_kalam_desc")} · ${a.nakshatra(amrit.nakshatra ?? "")}`}
            tz={tz}
            refDate={refDate}
          />
        ))}
        {(data.auspicious_timings.sarvartha_siddhi_yoga ?? []).map((s, i) => (
          <TimeBand
            key={`ss-${i}`}
            testId={`band-sarvartha-${i}`}
            title={t("muhurta_sarvartha")}
            window={s}
            color="var(--success)"
            desc={`${t("muhurta_sarvartha_desc")} · ${a.nakshatra(s.nakshatra ?? "")}`}
            tz={tz}
            refDate={refDate}
          />
        ))}
        {(data.auspicious_timings.amrita_siddhi_yoga ?? []).map((s, i) => (
          <TimeBand
            key={`asd-${i}`}
            testId={`band-amrita-siddhi-${i}`}
            title={t("muhurta_amrita_siddhi")}
            window={s}
            color="var(--success)"
            desc={`${t("muhurta_amrita_siddhi_desc")} · ${a.nakshatra(s.nakshatra ?? "")}`}
            tz={tz}
            refDate={refDate}
          />
        ))}
        {data.yogas_extra?.ravi_yoga && (
          <TimeBand
            testId="band-ravi-yoga"
            title={t("muhurta_ravi_yoga")}
            window={data.yogas_extra.ravi_yoga}
            color="var(--success)"
            desc={t("muhurta_ravi_yoga_desc")}
            tz={tz}
            refDate={refDate}
          />
        )}
      </div>
    </Section>
  );
}
