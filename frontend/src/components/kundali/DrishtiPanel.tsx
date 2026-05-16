import { useState } from "react";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { planetColor } from "@/lib/planets";
import { SIGN_NAMES } from "@/lib/planets";
import type { DrishtiData } from "@/types/api";

interface Props {
  drishti: DrishtiData;
  selectedPlanet: string | null;
  onSelectPlanet: (abbr: string | null) => void;
}

function strengthLabel(t: (k: string) => string, strength: number): string {
  if (strength >= 95) return t("drishti_full");
  if (strength >= 71) return t("drishti_strong");
  if (strength >= 31) return t("drishti_medium");
  return t("drishti_weak");
}

function strengthColor(strength: number): string {
  if (strength >= 95) return "var(--success)";
  if (strength >= 71) return "var(--accent-amber)";
  if (strength >= 31) return "var(--ink-soft)";
  return "var(--ink-soft)";
}

export function DrishtiPanel({ drishti, selectedPlanet, onSelectPlanet }: Props) {
  const { t } = useI18n();
  const a = useAstro();
  const [expanded, setExpanded] = useState(false);
  const planets = Object.values(drishti.by_planet);

  return (
    <div data-testid="drishti-panel" className="card p-4 sm:p-5">
      <button
        type="button"
        className="w-full flex items-center justify-between"
        onClick={() => setExpanded((v) => !v)}
      >
        <h3 className="heading-section">{t("drishti_title")}</h3>
        <span
          className="text-ink-soft transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          &#9660;
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 pb-3 border-b border-parchment-200">
            {planets.map((p) => {
              const isActive = selectedPlanet === p.abbr;
              return (
                <button
                  key={p.abbr}
                  type="button"
                  onClick={() => onSelectPlanet(isActive ? null : p.abbr)}
                  className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm font-semibold transition-all"
                  style={{
                    color: planetColor(p.abbr),
                    backgroundColor: isActive
                      ? "color-mix(in oklab, " + planetColor(p.abbr) + " 16%, transparent)"
                      : "transparent",
                    outline: isActive ? `2px solid ${planetColor(p.abbr)}` : "1px solid var(--border)",
                  }}
                >
                  {a.planet(p.name)}
                  {p.retrograde && (
                    <span className="text-mini" style={{ color: "var(--accent-amber)" }}>R</span>
                  )}
                  {p.combust && (
                    <span className="text-mini" style={{ color: "var(--danger)" }}>C</span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedPlanet && drishti.by_planet[selectedPlanet] && (
            <SelectedPlanetDetail
              planet={drishti.by_planet[selectedPlanet]}
              mutual={drishti.mutual}
            />
          )}

          {!selectedPlanet && (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="eyebrow-lg border-b border-parchment-200">
                    <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
                      {t("col_body")}
                    </th>
                    <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
                      {t("drishti_house")}
                    </th>
                    <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
                      {t("col_aspects")}
                    </th>
                    <th className="py-2 font-bold whitespace-nowrap text-start">
                      {t("drishti_benefic")}/{t("drishti_malefic")}
                    </th>
                  </tr>
                </thead>
                <tbody className="text-meta">
                  {planets.map((p) => (
                    <tr
                      key={p.abbr}
                      className="border-b border-parchment-200 last:border-0 cursor-pointer hover:bg-parchment-50 transition-colors"
                      onClick={() => onSelectPlanet(p.abbr)}
                    >
                      <td
                        className="py-2 pe-3 font-semibold whitespace-nowrap text-start"
                        style={{ color: planetColor(p.abbr) }}
                      >
                        {a.planet(p.name)}
                      </td>
                      <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                        {a.num(p.house)}
                      </td>
                      <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                        {p.aspected_houses.map((h) => a.num(h)).join(", ")}
                      </td>
                      <td className="py-2 whitespace-nowrap text-start">
                        <span
                          className="inline-block rounded-2xs px-2 py-0.5 text-mini font-bold"
                          style={{
                            color: p.benefic ? "var(--success)" : "var(--danger)",
                            backgroundColor: p.benefic
                              ? "color-mix(in oklab, var(--success) 14%, transparent)"
                              : "color-mix(in oklab, var(--danger) 14%, transparent)",
                          }}
                        >
                          {p.benefic ? t("drishti_benefic") : t("drishti_malefic")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {drishti.mutual.length > 0 && (
            <div className="pt-3 border-t border-parchment-200">
              <h4 className="eyebrow-lg font-bold mb-2">{t("drishti_mutual")}</h4>
              <div className="flex flex-wrap gap-2">
                {drishti.mutual.map((m) => (
                  <span
                    key={`${m.planet1}-${m.planet2}`}
                    className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: "color-mix(in oklab, var(--primary) 10%, transparent)",
                      color: "var(--ink)",
                    }}
                  >
                    {a.planet(m.planet1)} &#8644; {a.planet(m.planet2)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DetailProps {
  planet: DrishtiData["by_planet"][string];
  mutual: DrishtiData["mutual"];
}

function SelectedPlanetDetail({ planet, mutual }: DetailProps) {
  const { t } = useI18n();
  const a = useAstro();
  const mutualPartners = mutual
    .filter((m) => m.planet1 === planet.name || m.planet2 === planet.name)
    .map((m) => (m.planet1 === planet.name ? m.planet2 : m.planet1));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-serif text-lg font-bold" style={{ color: planetColor(planet.abbr) }}>
          {a.planet(planet.name)}
        </span>
        <span
          className="inline-block rounded-2xs px-2 py-0.5 text-mini font-bold"
          style={{
            color: planet.benefic ? "var(--success)" : "var(--danger)",
            backgroundColor: planet.benefic
              ? "color-mix(in oklab, var(--success) 14%, transparent)"
              : "color-mix(in oklab, var(--danger) 14%, transparent)",
          }}
        >
          {planet.benefic ? t("drishti_benefic") : t("drishti_malefic")}
        </span>
        {planet.retrograde && (
          <span
            className="inline-block rounded-2xs px-2 py-0.5 text-mini font-bold"
            style={{
              color: "var(--accent-amber)",
              backgroundColor: "color-mix(in oklab, var(--accent-amber) 16%, transparent)",
            }}
          >
            {t("pill_retrograde")}
          </span>
        )}
        {planet.combust && (
          <span
            className="inline-block rounded-2xs px-2 py-0.5 text-mini font-bold"
            style={{
              color: "var(--danger)",
              backgroundColor: "color-mix(in oklab, var(--danger) 14%, transparent)",
            }}
          >
            {t("pill_combust")}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="eyebrow-lg border-b border-parchment-200">
              <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
                {t("drishti_to")} {t("drishti_house")}
              </th>
              <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
                {t("col_sign")}
              </th>
              <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
                {t("col_aspects")}
              </th>
              <th className="py-2 font-bold whitespace-nowrap text-start">
                {t("drishti_strength")}
              </th>
            </tr>
          </thead>
          <tbody className="text-meta">
            {planet.details.map((d) => (
              <tr key={d.to_house} className="border-b border-parchment-200 last:border-0">
                <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                  {a.num(d.to_house)}
                </td>
                <td className="py-2 pe-3 whitespace-nowrap text-start">
                  {a.sign(SIGN_NAMES[d.to_sign - 1])}
                </td>
                <td className="py-2 pe-3 whitespace-nowrap text-start">
                  <span className="inline-flex items-center gap-1">
                    {d.aspect_type === "special" ? "⇒" : "→"}
                    <span className="text-mini">
                      {d.aspect_type === "special"
                        ? t("drishti_special")
                        : t("drishti_standard")}
                    </span>
                  </span>
                </td>
                <td className="py-2 whitespace-nowrap text-start">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: strengthColor(d.strength) }}
                    />
                    <span className="num tabular-nums">{a.num(d.strength)}%</span>
                    <span className="text-mini text-ink-soft">
                      {strengthLabel(t, d.strength)}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mutualPartners.length > 0 && (
        <p className="text-sm text-ink-soft">
          {t("drishti_mutual")}: {mutualPartners.map((p) => a.planet(p)).join(", ")}
        </p>
      )}
    </div>
  );
}
