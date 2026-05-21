import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { planetColor } from "@/lib/planets";
import { Modal, ModalHeader } from "@/components/ui/modal";
import type { ChartData, FriendshipCode, Planet } from "@/types/api";

interface Props {
  planet: Planet | null;
  data: ChartData;
  onClose: () => void;
}

const FRIENDSHIP_STYLE: Record<string, { bg: string; fg: string }> = {
  GF: { bg: "color-mix(in oklab, var(--success) 18%, transparent)", fg: "var(--success)" },
  F: { bg: "color-mix(in oklab, var(--success) 12%, transparent)", fg: "var(--success)" },
  N: { bg: "color-mix(in oklab, var(--ink-soft) 12%, transparent)", fg: "var(--ink-soft)" },
  E: { bg: "color-mix(in oklab, var(--accent-amber) 16%, transparent)", fg: "var(--accent-amber)" },
  GE: { bg: "color-mix(in oklab, var(--danger) 14%, transparent)", fg: "var(--danger)" },
};

export function PlanetDetailModal({ planet, data, onClose }: Props) {
  const { t } = useI18n();
  const a = useAstro();

  if (!planet) return null;

  const aspects = data.drishti?.by_planet[planet.abbr];
  const friendships = data.friendships;
  const composite = friendships?.composite[planet.name];
  const others = friendships?.planets.filter((n) => n !== planet.name) ?? [];

  const placements: { key: string; label: string; color: string; bg: string }[] = [];
  if (planet.exalted)
    placements.push({
      key: "exalted",
      label: t("pd_exalted"),
      color: "var(--success)",
      bg: "color-mix(in oklab, var(--success) 16%, transparent)",
    });
  if (planet.moolatrikona)
    placements.push({
      key: "mt",
      label: t("pd_moolatrikona"),
      color: "var(--success)",
      bg: "color-mix(in oklab, var(--success) 12%, transparent)",
    });
  if (planet.own_sign)
    placements.push({
      key: "own",
      label: t("pd_own_sign"),
      color: "var(--primary)",
      bg: "color-mix(in oklab, var(--primary) 14%, transparent)",
    });
  if (planet.vargottama)
    placements.push({
      key: "varg",
      label: t("pd_vargottama"),
      color: "var(--primary)",
      bg: "color-mix(in oklab, var(--primary) 14%, transparent)",
    });
  if (planet.digbala)
    placements.push({
      key: "dig",
      label: t("pd_digbala"),
      color: "var(--accent-amber)",
      bg: "color-mix(in oklab, var(--accent-amber) 16%, transparent)",
    });
  if (planet.debilitated)
    placements.push({
      key: "deb",
      label: t("pd_debilitated"),
      color: "var(--danger)",
      bg: "color-mix(in oklab, var(--danger) 14%, transparent)",
    });
  if (planet.retrograde)
    placements.push({
      key: "retro",
      label: t("pd_retrograde"),
      color: "var(--accent-amber)",
      bg: "color-mix(in oklab, var(--accent-amber) 16%, transparent)",
    });
  if (planet.combust)
    placements.push({
      key: "comb",
      label: t("pd_combust"),
      color: "var(--danger)",
      bg: "color-mix(in oklab, var(--danger) 14%, transparent)",
    });

  return (
    <Modal open={!!planet} onClose={onClose}>
      <div className="card p-5 sm:p-6">
        <ModalHeader onClose={onClose} closeLabel={t("pd_close")}>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold"
              style={{
                color: planetColor(planet.abbr),
                backgroundColor: `color-mix(in oklab, ${planetColor(planet.abbr)} 14%, transparent)`,
              }}
            >
              {a.abbr(planet.abbr)}
            </span>
            <div>
              <h3 className="text-base font-bold" style={{ color: planetColor(planet.abbr) }}>
                {a.planet(planet.name)}
              </h3>
              <p className="text-xs text-ink-soft">
                {a.nakshatra(planet.nakshatra)} {t("col_pada")} {a.num(planet.nakshatra_pada)}
              </p>
            </div>
          </div>
        </ModalHeader>

        {/* Position */}
        <section className="mb-4">
          <h4 className="eyebrow-lg mb-2">{t("pd_position")}</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <Row label={t("col_sign")} value={a.sign(planet.sign)} />
            <Row label={t("pd_house")} value={a.num(planet.house ?? "-")} />
            <Row label={t("pd_degree")} value={a.num(planet.dms)} mono />
            <Row label={t("pd_sign_lord")} value={a.planet(planet.sign_lord)} />
            <Row label={t("pd_nakshatra_lord")} value={a.planet(planet.nakshatra_lord)} />
          </div>
        </section>

        {/* Special placements */}
        <section className="mb-4">
          <h4 className="eyebrow-lg mb-2">{t("pd_placements")}</h4>
          {placements.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {placements.map((p) => (
                <span
                  key={p.key}
                  className="inline-block rounded-2xs px-2.5 py-1 text-xs font-bold"
                  style={{ color: p.color, backgroundColor: p.bg }}
                >
                  {p.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-soft italic">{t("pd_no_placements")}</p>
          )}
        </section>

        {/* Aspects */}
        {aspects && aspects.aspected_houses.length > 0 && (
          <section className="mb-4">
            <h4 className="eyebrow-lg mb-2">{t("pd_aspects")}</h4>
            <p className="text-sm">
              <span className="text-ink-soft">{t("pd_aspects_houses")}: </span>
              {aspects.aspected_houses.map((h) => a.num(h)).join(", ")}
            </p>
          </section>
        )}

        {/* Friendships */}
        {composite && others.length > 0 && (
          <section>
            <h4 className="eyebrow-lg mb-2">{t("pd_friendships")}</h4>
            <div className="flex flex-wrap gap-1.5">
              {others.map((other) => {
                const code = composite[other] as FriendshipCode;
                const style = FRIENDSHIP_STYLE[code] ?? FRIENDSHIP_STYLE.N;
                const label = friendships!.labels[code] ?? code;
                return (
                  <span
                    key={other}
                    className="inline-flex items-center gap-1 rounded-2xs px-2 py-1 text-xs font-medium"
                    style={{ color: style.fg, backgroundColor: style.bg }}
                    title={label}
                  >
                    <span className="font-bold">{a.planet(other)}</span>
                    <span className="opacity-70">{label}</span>
                  </span>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <span className="text-ink-soft">{label}</span>
      <span className={mono ? "num tabular-nums font-medium" : "font-medium"}>{value}</span>
    </>
  );
}
