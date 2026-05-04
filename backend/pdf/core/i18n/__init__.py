"""Label dictionary for the printable PDF (9 languages).

Only labels that appear on the printed page live here. The renderer picks
the script font (Latin / Devanagari / Tamil / SC / JP) per text run, so
values such as dates or numerals can stay Latin even on a Hindi or Chinese
page.

Sanskrit/Jyotisha technical terms (Tithi, Nakshatra, Yoga, Lagna,
Ashtakavarga, Vimshottari Dasha, etc.) are written in plain ASCII (no IAST
diacritics) across all locales that use a Latin script - that's how these
words appear in everyday English-language Vedic/Hindu publications, and
matches the rest of the app.

Per-locale dictionaries live in ``locales/{en,hi,ta,zh,ja,es,de,pt,fr}.py``;
this module just glues them together and exposes the translation helpers.
"""

from __future__ import annotations

from typing import Dict

from .locales.de import LABELS as DE
from .locales.en import LABELS as EN
from .locales.es import LABELS as ES
from .locales.fr import LABELS as FR
from .locales.hi import LABELS as HI
from .locales.ja import LABELS as JA
from .locales.pt import LABELS as PT
from .locales.ta import LABELS as TA
from .locales.zh import LABELS as ZH

LOCALES: Dict[str, Dict[str, str]] = {
    "en": EN,
    "hi": HI,
    "ta": TA,
    "zh": ZH,
    "ja": JA,
    "es": ES,
    "de": DE,
    "pt": PT,
    "fr": FR,
}


def t(lang: str, key: str) -> str:
    locale = LOCALES.get(lang) or EN
    return locale.get(key) or EN.get(key) or key


# Convenience translators. Each composes the dict key from the input rather
# than maintaining a parallel mapping; that's what the old PLANET_KEY_BY_NAME
# / SIGN_KEYS_BY_ID / ABBR_KEY_BY_ABBR / WEEKDAY_KEYS structures were doing
# by hand. Returns the input unchanged if the key isn't in the dictionary.

_WEEKDAY_BY_INDEX = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)

_SIGN_BY_ID = (
    None,  # 1-indexed
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces",
)


def tr_planet(lang: str, name: str) -> str:
    """Translate an English planet name (e.g. "Sun") to the target locale."""
    return t(lang, f"planet_{name.lower()}") if name else ""


def tr_sign(lang: str, sign_id: int) -> str:
    """Translate a 1-12 sign id to the target locale."""
    if not 1 <= sign_id <= 12:
        return ""
    return t(lang, f"sign_{_SIGN_BY_ID[sign_id]}")


def tr_abbr(lang: str, abbr: str) -> str:
    """Translate a 2-letter planet abbreviation (e.g. "Su") to the locale."""
    return t(lang, f"abbr_{abbr.lower()}") if abbr else ""


def tr_weekday(lang: str, weekday_index: int) -> str:
    """Translate a Python `datetime.weekday()` index (0=Mon..6=Sun)."""
    return t(lang, _WEEKDAY_BY_INDEX[weekday_index])


def tr_nakshatra(lang: str, name: str) -> str:
    """Translate an English nakshatra name (e.g. "Purva Phalguni") to the locale."""
    if not name:
        return ""
    key = f"nak_{name.lower().replace(' ', '_')}"
    out = t(lang, key)
    return name if out == key else out


# Devanagari & Tamil routinely co-render with their native digits. Other
# locales conventionally keep Latin digits for numeric data, so we don't
# substitute there. Mirrors frontend src/i18n/astro.ts NATIVE_DIGITS.
_NATIVE_DIGITS: Dict[str, str] = {
    "hi": "०१२३४५६७८९",
    "ta": "௦௧௨௩௪௫௬௭௮௯",
}

_LATIN_DIGITS = "0123456789"


def t_num(lang: str, value) -> str:
    """Replace ASCII digits with the locale's native digit set (hi/ta).

    Returns the stringified value unchanged for locales without a native
    digit table, and "" for None.
    """
    if value is None:
        return ""
    s = str(value)
    digits = _NATIVE_DIGITS.get(lang)
    if not digits:
        return s
    return s.translate(str.maketrans(_LATIN_DIGITS, digits))
