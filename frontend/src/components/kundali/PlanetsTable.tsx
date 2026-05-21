import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { planetColor } from "@/lib/planets";
import type { DrishtiData, FriendshipCode, Friendships, Planet } from "@/types/api";

interface Props {
  planets: Planet[];
  ascendant: Planet;
  drishti?: DrishtiData;
  friendships?: Friendships;
  onSelectPlanet?: (abbr: string) => void;
}

type DignityLevel =
  | "exalted"
  | "moola"
  | "own"
  | "great_friend"
  | "friend"
  | "neutral"
  | "enemy"
  | "great_enemy"
  | "debilitated";

const DIGNITY_STYLE: Record<DignityLevel, { fg: string; bg: string }> = {
  exalted: { fg: "var(--success)", bg: "color-mix(in oklab, var(--success) 16%, transparent)" },
  moola: { fg: "var(--success)", bg: "color-mix(in oklab, var(--success) 12%, transparent)" },
  own: { fg: "var(--primary)", bg: "color-mix(in oklab, var(--primary) 14%, transparent)" },
  great_friend: {
    fg: "var(--primary)",
    bg: "color-mix(in oklab, var(--primary) 12%, transparent)",
  },
  friend: { fg: "var(--primary)", bg: "color-mix(in oklab, var(--primary) 10%, transparent)" },
  neutral: { fg: "var(--ink-soft)", bg: "color-mix(in oklab, var(--ink-soft) 12%, transparent)" },
  enemy: {
    fg: "var(--accent-amber)",
    bg: "color-mix(in oklab, var(--accent-amber) 16%, transparent)",
  },
  great_enemy: { fg: "var(--danger)", bg: "color-mix(in oklab, var(--danger) 12%, transparent)" },
  debilitated: { fg: "var(--danger)", bg: "color-mix(in oklab, var(--danger) 14%, transparent)" },
};

const FRIENDSHIP_TO_DIGNITY: Record<string, DignityLevel> = {
  GF: "great_friend",
  F: "friend",
  N: "neutral",
  E: "enemy",
  GE: "great_enemy",
};

function deriveDignity(p: Planet, friendships: Friendships | undefined): DignityLevel | null {
  if (p.abbr === "As" || p.abbr === "Lg") return null;
  if (p.exalted) return "exalted";
  if (p.moolatrikona) return "moola";
  if (p.own_sign) return "own";
  if (p.debilitated) return "debilitated";
  if (!friendships) return null;
  const comp = friendships.composite[p.name];
  if (!comp) return null;
  const code = comp[p.sign_lord] as FriendshipCode;
  return FRIENDSHIP_TO_DIGNITY[code] ?? null;
}

interface Badge {
  label: string;
  fg: string;
  bg: string;
}

function statusBadges(
  p: Planet,
  t: (k: string) => string,
  a: { planet: (n: string) => string },
): Badge[] {
  const out: Badge[] = [];
  const amber = "var(--accent-amber)";
  const amberBg = "color-mix(in oklab, var(--accent-amber) 16%, transparent)";
  const danger = "var(--danger)";
  const dangerBg = "color-mix(in oklab, var(--danger) 14%, transparent)";
  const success = "var(--success)";
  const successBg = "color-mix(in oklab, var(--success) 14%, transparent)";
  const primary = "var(--primary)";
  const primaryBg = "color-mix(in oklab, var(--primary) 14%, transparent)";

  if (p.retrograde) out.push({ label: t("pill_retrograde"), fg: amber, bg: amberBg });
  if (p.combust) out.push({ label: t("pill_combust"), fg: danger, bg: dangerBg });
  if (p.vargottama) out.push({ label: t("pd_vargottama"), fg: primary, bg: primaryBg });
  if (p.digbala) out.push({ label: t("pd_digbala"), fg: amber, bg: amberBg });
  if (p.pushkara_bhaga) out.push({ label: t("pd_pushkara_bhaga"), fg: success, bg: successBg });
  if (p.pushkara_navamsa) out.push({ label: t("pd_pushkara_navamsa"), fg: success, bg: successBg });
  if (p.neecha_bhanga) out.push({ label: t("pd_neecha_bhanga"), fg: primary, bg: primaryBg });
  if (p.parivartana) {
    const w = p.parivartana_with ? ` (${a.planet(p.parivartana_with)})` : "";
    out.push({ label: `${t("pd_parivartana")}${w}`, fg: primary, bg: primaryBg });
  }
  if (p.mrityu_bhaga) out.push({ label: t("pd_mrityu_bhaga"), fg: danger, bg: dangerBg });
  if (p.gandanta) out.push({ label: t("pd_gandanta"), fg: danger, bg: dangerBg });
  if (p.graha_yuddha) {
    const w = p.graha_yuddha_with ? ` (${a.planet(p.graha_yuddha_with)})` : "";
    out.push({ label: `${t("pd_graha_yuddha")}${w}`, fg: danger, bg: dangerBg });
  }
  return out;
}

export function PlanetsTable({ planets, ascendant, drishti, friendships, onSelectPlanet }: Props) {
  const { t } = useI18n();
  const a = useAstro();
  const rows = [ascendant, ...planets];
  return (
    <div data-testid="planets-table" className="card p-4 sm:p-5 overflow-x-auto">
      <h3 className="heading-section mb-3">{t("graha_positions")}</h3>
      <table className="w-full text-start border-collapse">
        <thead>
          <tr className="eyebrow-lg border-b border-parchment-200">
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("col_body")}</th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("col_sign")}</th>
            <th className="py-2 pe-3 font-bold num whitespace-nowrap text-start">
              {t("col_degree")}
            </th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("col_lord")}</th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
              {t("col_nakshatra")}
            </th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start w-16">
              {t("col_pada")}
            </th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start w-16">
              {t("col_house")}
            </th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("col_dignity")}</th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("col_aspects")}</th>
            <th className="py-2 font-bold whitespace-nowrap text-start">{t("col_status")}</th>
          </tr>
        </thead>
        <tbody className="text-meta">
          {rows.map((p) => {
            const dignity = deriveDignity(p, friendships);
            const badges = statusBadges(p, t, a);
            return (
              <tr
                key={p.name}
                className={`border-b border-parchment-200 last:border-0${onSelectPlanet ? " cursor-pointer hover:bg-parchment-50 transition-colors" : ""}`}
                onClick={onSelectPlanet ? () => onSelectPlanet(p.abbr) : undefined}
              >
                <td
                  className="py-2 pe-3 font-semibold whitespace-nowrap text-start"
                  style={{ color: planetColor(p.abbr) }}
                >
                  {a.planet(p.name)}
                </td>
                <td className="py-2 pe-3 whitespace-nowrap text-start">{a.sign(p.sign)}</td>
                <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                  {a.num(p.dms)}
                </td>
                <td className="py-2 pe-3 whitespace-nowrap text-start">{a.planet(p.sign_lord)}</td>
                <td className="py-2 pe-3 whitespace-nowrap text-start">
                  {a.nakshatra(p.nakshatra)}
                </td>
                <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                  {a.num(p.nakshatra_pada)}
                </td>
                <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                  {a.num(p.house ?? "-")}
                </td>
                <td className="py-2 pe-3 whitespace-nowrap text-start">
                  {dignity && (
                    <span
                      className="inline-block rounded-2xs px-2 py-0.5 text-mini font-bold"
                      style={{
                        color: DIGNITY_STYLE[dignity].fg,
                        backgroundColor: DIGNITY_STYLE[dignity].bg,
                      }}
                    >
                      {t(`dignity_${dignity}`)}
                    </span>
                  )}
                </td>
                <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                  {drishti?.by_planet[p.abbr]?.aspected_houses.map((h) => a.num(h)).join(", ") ??
                    "-"}
                </td>
                <td className="py-2 text-start">
                  <div className="flex flex-wrap gap-1">
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className="inline-block rounded-2xs px-2 py-0.5 text-mini font-bold whitespace-nowrap"
                        style={{ color: b.fg, backgroundColor: b.bg }}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
