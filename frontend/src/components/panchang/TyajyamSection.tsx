import type { ReactNode } from "react";
import {
  CalendarDays,
  Hourglass,
  Landmark,
  Layers,
  Moon,
  Orbit,
  Sparkles,
  Star,
  Sunrise,
  TriangleAlert,
} from "lucide-react";
import { Section } from "@/components/panchang/Section";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { formatTimeWithDate } from "@/lib/format";
import type { PanchangData } from "@/types/api";

type Tyajyam = NonNullable<PanchangData["tyajyam"]>;

const ICON_SIZE = 15;

function Card({
  icon,
  accent,
  title,
  subtitle,
  count,
  children,
  testId,
  className,
}: {
  icon: ReactNode;
  accent: string;
  title: string;
  subtitle: string;
  count: number;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={`rounded-md border border-parchment-200 bg-parchment-50 flex flex-col ${className ?? ""}`}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-parchment-200">
        <span
          className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 text-white"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow-lg truncate" style={{ color: accent }}>
            {title}
          </p>
          <p className="meta truncate">{subtitle}</p>
        </div>
        <span className="num text-xs font-bold px-2 py-0.5 rounded-sm border border-parchment-200 bg-parchment-100 text-ink-soft shrink-0">
          {count}
        </span>
      </div>
      <div className="px-3 flex-1 max-h-72 overflow-y-auto">{children}</div>
    </div>
  );
}

function Row({
  start,
  end,
  tz,
  refDate,
  label,
  dotColor,
  testId,
}: {
  start: string;
  end: string;
  tz?: string;
  refDate?: string;
  label?: string;
  dotColor: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="py-2 border-b border-parchment-200 last:border-b-0 flex items-start gap-2"
    >
      <span
        className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <div className="min-w-0 flex-1">
        <p className="value-strong num">
          {formatTimeWithDate(start, tz, refDate)} - {formatTimeWithDate(end, tz, refDate)}
        </p>
        {label && <p className="meta">{label}</p>}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="meta py-2.5">{text}</p>;
}

export function TyajyamSection({
  tyajyam,
  tamilCalendar,
  varaName,
  tz,
  refDate,
}: {
  tyajyam: Tyajyam;
  tamilCalendar?: PanchangData["tamil_calendar"];
  varaName?: string;
  tz?: string;
  refDate?: string;
}) {
  const { t, lang } = useI18n();
  const a = useAstro();

  const nak = tyajyam.nakshatra_tyajyam ?? [];
  const tithi = tyajyam.tithi_tyajyam ?? [];
  const vara = tyajyam.vara_tyajyam;
  const amritadi = tyajyam.amritadi_yogam ?? [];
  const lagna = tyajyam.lagna_tyajyam ?? [];
  const karana = tyajyam.karana_tyajyam ?? [];
  const tithiLagna = tyajyam.tithi_lagna_tyajyam ?? [];
  const dosha = tyajyam.dosha_tyajyam ?? [];
  const gowri = tyajyam.gowri_tyajyam ?? [];
  const tamil = tyajyam.tamil_month_avoidables;

  const none = <Empty text={t("tyajyam_none")} />;

  return (
    <Section title={t("tyajyam_title")} subtitle={t("tyajyam_sub")} testId="section-tyajyam">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Card
          icon={<Star size={ICON_SIZE} />}
          accent="var(--accent-moon)"
          title={t("tyajyam_nakshatra")}
          subtitle={t("tyajyam_nakshatra_desc")}
          count={nak.length}
          testId="card-nak-tyajyam"
        >
          {nak.length
            ? nak.map((w, i) => (
                <Row
                  key={`nt-${i}`}
                  testId={`band-nak-tyajyam-${i}`}
                  start={w.start}
                  end={w.end}
                  tz={tz}
                  refDate={refDate}
                  label={a.nakshatra(w.nakshatra)}
                  dotColor="var(--accent-moon)"
                />
              ))
            : none}
        </Card>

        <Card
          icon={<Moon size={ICON_SIZE} />}
          accent="var(--primary)"
          title={t("tyajyam_tithi")}
          subtitle={t("tyajyam_tithi_desc")}
          count={tithi.length}
          testId="card-tithi-tyajyam"
        >
          {tithi.length
            ? tithi.map((w, i) => (
                <Row
                  key={`tt-${i}`}
                  testId={`band-tithi-tyajyam-${i}`}
                  start={w.start}
                  end={w.end}
                  tz={tz}
                  refDate={refDate}
                  label={a.tithi(w.tithi)}
                  dotColor="var(--primary)"
                />
              ))
            : none}
        </Card>

        <Card
          icon={<CalendarDays size={ICON_SIZE} />}
          accent="var(--warning)"
          title={t("tyajyam_vara")}
          subtitle={t("tyajyam_vara_desc")}
          count={vara ? 1 : 0}
          testId="card-vara-tyajyam"
        >
          {vara ? (
            <Row
              testId="band-vara-tyajyam"
              start={vara.start}
              end={vara.end}
              tz={tz}
              refDate={refDate}
              label={varaName}
              dotColor="var(--warning)"
            />
          ) : (
            none
          )}
        </Card>

        <Card
          icon={<Sparkles size={ICON_SIZE} />}
          accent="var(--success)"
          title={t("amritadi_title")}
          subtitle={t("amritadi_sub")}
          count={amritadi.length}
          testId="card-amritadi"
        >
          {amritadi.length
            ? amritadi.map((w, i) => (
                <Row
                  key={`ay-${i}`}
                  testId={`band-amritadi-${i}`}
                  start={w.start}
                  end={w.end}
                  tz={tz}
                  refDate={refDate}
                  label={`${a.nakshatra(w.nakshatra)} · ${t(`amritadi_${w.yogam.toLowerCase()}`)}`}
                  dotColor={
                    w.yogam === "Amrita" || w.yogam === "Siddha"
                      ? "var(--success)"
                      : "var(--danger)"
                  }
                />
              ))
            : none}
        </Card>

        <Card
          icon={<Sunrise size={ICON_SIZE} />}
          accent="var(--danger)"
          title={t("tyajyam_lagna")}
          subtitle={t("tyajyam_lagna_desc")}
          count={lagna.length}
          testId="card-lagna-tyajyam"
        >
          {lagna.length
            ? lagna.map((w, i) => (
                <Row
                  key={`lt-${i}`}
                  testId={`band-lagna-tyajyam-${i}`}
                  start={w.start}
                  end={w.end}
                  tz={tz}
                  refDate={refDate}
                  label={`${a.sign(w.sign)} (${t(`tyajyam_lagna_${w.position}`)})`}
                  dotColor="var(--danger)"
                />
              ))
            : none}
        </Card>

        <Card
          icon={<Hourglass size={ICON_SIZE} />}
          accent="var(--accent-sun)"
          title={t("tyajyam_karana")}
          subtitle={t("tyajyam_karana_desc")}
          count={karana.length}
          testId="card-karana-tyajyam"
        >
          {karana.length
            ? karana.map((w, i) => (
                <Row
                  key={`kt-${i}`}
                  testId={`band-karana-tyajyam-${i}`}
                  start={w.start}
                  end={w.end}
                  tz={tz}
                  refDate={refDate}
                  label={a.karana(w.karana)}
                  dotColor="var(--accent-sun)"
                />
              ))
            : none}
        </Card>

        <Card
          icon={<Layers size={ICON_SIZE} />}
          accent="var(--accent-amber)"
          title={t("tyajyam_tithi_lagna")}
          subtitle={t("tyajyam_tithi_lagna_desc")}
          count={tithiLagna.length}
          testId="card-tithi-lagna-tyajyam"
        >
          {tithiLagna.length
            ? tithiLagna.map((w, i) => (
                <Row
                  key={`tl-${i}`}
                  testId={`band-tithi-lagna-tyajyam-${i}`}
                  start={w.start}
                  end={w.end}
                  tz={tz}
                  refDate={refDate}
                  label={`${a.tithi(w.tithi)} + ${a.sign(w.sign)}`}
                  dotColor="var(--accent-amber)"
                />
              ))
            : none}
        </Card>

        <Card
          icon={<TriangleAlert size={ICON_SIZE} />}
          accent="var(--ink-muted)"
          title={t("tyajyam_dosha")}
          subtitle={t("tyajyam_dosha_desc")}
          count={dosha.length}
          testId="card-dosha-tyajyam"
        >
          {dosha.length
            ? dosha.map((w, i) => (
                <Row
                  key={`dt-${i}`}
                  testId={`band-dosha-tyajyam-${i}`}
                  start={w.start}
                  end={w.end}
                  tz={tz}
                  refDate={refDate}
                  label={t(`dosha_${w.dosha}`)}
                  dotColor="var(--ink-muted)"
                />
              ))
            : none}
        </Card>

        <Card
          icon={<Orbit size={ICON_SIZE} />}
          accent="var(--danger)"
          title={t("tyajyam_gowri")}
          subtitle={t("tyajyam_gowri_desc")}
          count={gowri.length}
          testId="card-gowri-tyajyam"
        >
          {gowri.length
            ? gowri.map((w, i) => (
                <Row
                  key={`gt-${i}`}
                  testId={`band-gowri-tyajyam-${i}`}
                  start={w.start}
                  end={w.end}
                  tz={tz}
                  refDate={refDate}
                  label={`${a.gowri(w.name)} · ${t(w.period === "day" ? "gowri_day" : "gowri_night")}`}
                  dotColor="var(--danger)"
                />
              ))
            : none}
        </Card>

        {tamil && (
          <Card
            icon={<Landmark size={ICON_SIZE} />}
            accent="var(--primary)"
            title={
              tamilCalendar
                ? `${t("tyajyam_tamil_month")} · ${
                    lang === "ta" ? tamilCalendar.tamil_month.ta : tamilCalendar.tamil_month.en
                  }`
                : t("tyajyam_tamil_month")
            }
            subtitle={t("tyajyam_tamil_month_desc")}
            count={tamil.windows.length}
            testId="card-tamil-month-tyajyam"
            className="sm:col-span-2 xl:col-span-3"
          >
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-x-6 py-2"
              data-testid="tamil-month-avoidables"
            >
              <p className="meta">
                <span className="label-strong">{t("tyajyam_tamil_month_tithis")}: </span>
                {tamil.avoid_tithis.map((n) => a.tithi(n)).join(", ")}
              </p>
              <p className="meta">
                <span className="label-strong">{t("tyajyam_tamil_month_naks")}: </span>
                {tamil.avoid_nakshatras.map((n) => a.nakshatra(n)).join(", ")}
              </p>
              <p className="meta">
                <span className="label-strong">{t("tyajyam_tamil_month_lagnas")}: </span>
                {tamil.avoid_lagnas.map((n) => a.sign(n)).join(", ")}
              </p>
            </div>
            {tamil.windows.length > 0 && (
              <div className="border-t border-parchment-200">
                {tamil.windows.map((w, i) => (
                  <Row
                    key={`tm-${i}`}
                    testId={`band-tamil-month-tyajyam-${i}`}
                    start={w.start}
                    end={w.end}
                    tz={tz}
                    refDate={refDate}
                    label={
                      w.kind === "tithi"
                        ? a.tithi(w.name)
                        : w.kind === "nakshatra"
                          ? a.nakshatra(w.name)
                          : a.sign(w.name)
                    }
                    dotColor="var(--primary)"
                  />
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
      {tz && (
        <p className="meta mt-3" data-testid="tyajyam-note">
          {t("tyajyam_note")} · {tz}
        </p>
      )}
    </Section>
  );
}
