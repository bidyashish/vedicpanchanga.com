"""Vimshottari Antardasha and Pratyantar sub-period computations.

For the first Mahadasha we reconstruct its conceptual start from the
balance years (the lord was already running before birth) so the full
9-antardasha table can be emitted; pre-birth sub-periods get their elapsed
flag from the caller via end-date comparison.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from calculator import DASHA_SEQUENCE, DASHA_YEARS, _add_years


def _antardashas_for(
    md_lord: str,
    md_total_years: float,
    md_concept_start: datetime,
) -> List[Dict[str, Any]]:
    seq_start = DASHA_SEQUENCE.index(md_lord)
    out: List[Dict[str, Any]] = []
    cur = md_concept_start
    for j in range(9):
        ad_lord = DASHA_SEQUENCE[(seq_start + j) % 9]
        ad_yrs = md_total_years * DASHA_YEARS[ad_lord] / 120.0
        ad_end = _add_years(cur, ad_yrs)
        out.append(
            {
                "lord": ad_lord,
                "start": cur.isoformat(),
                "end": ad_end.isoformat(),
                "years": round(ad_yrs, 6),
            }
        )
        cur = ad_end
    return out


def compute_antardashas(
    mahadashas: List[Dict[str, Any]],
    birth_dt_utc: datetime,
) -> List[Dict[str, Any]]:
    """Return the input mahadasha list with a nested `antardashas` array per period."""
    enriched: List[Dict[str, Any]] = []
    for i, md in enumerate(mahadashas):
        lord = md["lord"]
        total_yrs = float(DASHA_YEARS[lord])
        if i == 0:
            elapsed = total_yrs - float(md["years"])
            concept_start = _add_years(birth_dt_utc, -elapsed)
        else:
            concept_start = datetime.fromisoformat(md["start"])
        ad_list = _antardashas_for(lord, total_yrs, concept_start)
        enriched.append({**md, "antardashas": ad_list})
    return enriched


def compute_pratyantars(antardasha: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Return the 9 Pratyantar sub-periods inside a single Antardasha."""
    ad_lord = antardasha["lord"]
    ad_yrs = float(antardasha["years"])
    ad_start = datetime.fromisoformat(antardasha["start"])
    seq_start = DASHA_SEQUENCE.index(ad_lord)
    out: List[Dict[str, Any]] = []
    cur = ad_start
    for j in range(9):
        pd_lord = DASHA_SEQUENCE[(seq_start + j) % 9]
        pd_yrs = ad_yrs * DASHA_YEARS[pd_lord] / 120.0
        pd_end = _add_years(cur, pd_yrs)
        out.append(
            {
                "lord": pd_lord,
                "start": cur.isoformat(),
                "end": pd_end.isoformat(),
                "years": round(pd_yrs, 6),
            }
        )
        cur = pd_end
    return out
