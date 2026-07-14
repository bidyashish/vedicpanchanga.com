"""Compare the local muhurta finder against DrikPanchang's published lists.

Run from backend/ with the venv active:

    python tests/compare_drik.py

Reference data below is transcribed from
https://www.drikpanchang.com/shubh-dates/shubh-marriage-dates-with-muhurat.html
(New Delhi, 2026). Update DRIK_MARRIAGE_2026 if you re-check the source.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from muhurta import find_muhurtas  # noqa: E402

DELHI = {"latitude": 28.6139, "longitude": 77.2090, "timezone_name": "Asia/Kolkata"}

# DrikPanchang marriage muhurat dates for New Delhi, 2026 (full year).
DRIK_MARRIAGE_2026 = {
    "2026-02-05",
    "2026-02-06",
    "2026-02-08",
    "2026-02-10",
    "2026-02-12",
    "2026-02-14",
    "2026-02-19",
    "2026-02-20",
    "2026-02-21",
    "2026-02-24",
    "2026-02-25",
    "2026-02-26",
    "2026-03-02",
    "2026-03-03",
    "2026-03-04",
    "2026-03-07",
    "2026-03-08",
    "2026-03-09",
    "2026-03-11",
    "2026-03-12",
    "2026-04-15",
    "2026-04-20",
    "2026-04-21",
    "2026-04-25",
    "2026-04-26",
    "2026-04-27",
    "2026-04-28",
    "2026-04-29",
    "2026-05-01",
    "2026-05-03",
    "2026-05-05",
    "2026-05-06",
    "2026-05-07",
    "2026-05-08",
    "2026-05-13",
    "2026-05-14",
    "2026-06-21",
    "2026-06-22",
    "2026-06-23",
    "2026-06-24",
    "2026-06-25",
    "2026-06-26",
    "2026-06-27",
    "2026-06-29",
    "2026-07-01",
    "2026-07-06",
    "2026-07-07",
    "2026-07-11",
    "2026-11-21",
    "2026-11-24",
    "2026-11-25",
    "2026-11-26",
    "2026-12-02",
    "2026-12-03",
    "2026-12-04",
    "2026-12-05",
    "2026-12-06",
    "2026-12-11",
    "2026-12-12",
}


def month_range(year: int, month: int):
    from calendar import monthrange

    last = monthrange(year, month)[1]
    return f"{year}-{month:02d}-01", f"{year}-{month:02d}-{last:02d}"


def main() -> int:
    year = 2026
    print(f"Marriage muhurta comparison vs DrikPanchang, New Delhi {year}")
    print(f"{'Month':<6} {'Drik':>4} {'Ours':>4}  extra-vs-drik / missed-vs-drik")
    print("-" * 78)

    total_extra, total_missed = 0, 0
    for month in range(1, 13):
        start, end = month_range(year, month)
        res = find_muhurtas("marriage", start, end, **DELHI)
        ours = {m["date"] for m in res["muhurtas"]}
        drik = {d for d in DRIK_MARRIAGE_2026 if d.startswith(f"{year}-{month:02d}")}
        extra = sorted(ours - drik)
        missed = sorted(drik - ours)
        total_extra += len(extra)
        total_missed += len(missed)
        flag = "" if not extra and not missed else "  <-- diff"
        print(
            f"{start[:7]:<6} {len(drik):>4} {len(ours):>4}  "
            f"+{[d[8:] for d in extra]} / -{[d[8:] for d in missed]}{flag}"
        )

    print("-" * 78)
    print(f"days we list that Drik rejects: {total_extra}")
    print(f"days Drik lists that we reject: {total_missed}")
    print(
        "\nNote: exact parity is not expected. Drik additionally applies "
        "lagna shuddhi,\nBalya/Vriddha tara periods around combustion, and "
        "regional month rules. The\nveto rules should eliminate the big "
        "blocks (Jul 12+, Aug-Nov 20, Kharmas)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
