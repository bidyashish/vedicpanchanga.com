import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import type { PanchangData } from "@/types/api";
import { Section } from "./Section";
import { TimeBand } from "./TimeBand";

/** Inauspicious windows of the day: Rahu kalam through Ganda Mula. */
export function InauspiciousTimings({
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
    <Section title={t("inauspicious_title")} testId="section-inauspicious">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <TimeBand
          testId="band-rahu"
          title={t("muhurta_rahu_kalam")}
          window={data.inauspicious_timings.rahu_kalam}
          color="var(--danger)"
          desc={t("muhurta_rahu_kalam_desc")}
          tz={tz}
          refDate={refDate}
        />
        <TimeBand
          testId="band-yamaganda"
          title={t("muhurta_yamaganda")}
          window={data.inauspicious_timings.yamaganda}
          color="var(--accent-sun)"
          desc={t("muhurta_yamaganda_desc")}
          tz={tz}
          refDate={refDate}
        />
        <TimeBand
          testId="band-gulika"
          title={t("muhurta_gulika")}
          window={data.inauspicious_timings.gulika_kalam}
          color="var(--ink-soft)"
          desc={t("muhurta_gulika_desc")}
          tz={tz}
          refDate={refDate}
        />
        {(data.inauspicious_timings.dur_muhurtam ?? []).map((dm, i) => (
          <TimeBand
            key={i}
            testId={`band-dur-${i}`}
            title={`${t("muhurta_dur")} #${a.num(dm.muhurta_number)}`}
            window={dm}
            color="var(--danger)"
            desc={t("muhurta_dur_desc")}
            tz={tz}
            refDate={refDate}
          />
        ))}
        {(data.inauspicious_timings.bhadra ?? []).map((b, i) => (
          <TimeBand
            key={`b-${i}`}
            testId={`band-bhadra-${i}`}
            title={t("muhurta_bhadra")}
            window={b}
            color="var(--danger)"
            desc={t("muhurta_bhadra_desc")}
            tz={tz}
            refDate={refDate}
          />
        ))}
        {(data.inauspicious_timings.varjyam ?? []).map((v, i) => (
          <TimeBand
            key={`v-${i}`}
            testId={`band-varjyam-${i}`}
            title={t("muhurta_varjyam")}
            window={v}
            color="var(--danger)"
            desc={`${t("muhurta_varjyam_desc")} · ${a.nakshatra(v.nakshatra ?? "")}`}
            tz={tz}
            refDate={refDate}
          />
        ))}
        {data.yogas_extra?.ganda_mula && (
          <TimeBand
            testId="band-ganda-mula"
            title={t("muhurta_ganda_mula")}
            window={{
              start: data.sun_moon.sunrise,
              end: data.yogas_extra.ganda_mula.ends_at,
            }}
            color="var(--danger)"
            desc={`${t("muhurta_moon_in")} ${a.nakshatra(data.yogas_extra.ganda_mula.nakshatra)} · ${t("muhurta_ganda_mula_desc")}`}
            tz={tz}
            refDate={refDate}
          />
        )}
      </div>
    </Section>
  );
}
