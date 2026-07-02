"""Label dictionary for the printable PDF (15 languages).

Only labels that appear on the printed page live here. The renderer picks
the script font (Latin / Devanagari / Tamil / SC / JP / Arabic / Hebrew /
Bengali) per text run, so values such as dates or numerals can stay Latin
even on a Hindi or Chinese page. Cyrillic (Russian) is covered by the Latin
NotoSans face. Persian uses the Arabic script. Nepali reuses Devanagari.

Sanskrit/Jyotisha technical terms (Tithi, Nakshatra, Yoga, Lagna,
Ashtakavarga, Vimshottari Dasha, etc.) are written in plain ASCII (no IAST
diacritics) across all locales that use a Latin script - that's how these
words appear in everyday English-language Vedic/Hindu publications, and
matches the rest of the app.

Per-locale dictionaries live in
``locales/{en,hi,ta,bn,ne,zh,ja,es,de,pt,fr,ru,ar,fa,he}.py``;
this module just glues them together and exposes the translation helpers.
"""

from __future__ import annotations

from typing import Dict

from .locales.ar import LABELS as AR
from .locales.bn import LABELS as BN
from .locales.de import LABELS as DE
from .locales.en import LABELS as EN
from .locales.es import LABELS as ES
from .locales.fa import LABELS as FA
from .locales.fr import LABELS as FR
from .locales.he import LABELS as HE
from .locales.hi import LABELS as HI
from .locales.ja import LABELS as JA
from .locales.ne import LABELS as NE
from .locales.pt import LABELS as PT
from .locales.ru import LABELS as RU
from .locales.ta import LABELS as TA
from .locales.zh import LABELS as ZH

LOCALES: Dict[str, Dict[str, str]] = {
    "en": EN,
    "hi": HI,
    "ta": TA,
    "bn": BN,
    "ne": NE,
    "zh": ZH,
    "ja": JA,
    "es": ES,
    "de": DE,
    "pt": PT,
    "fr": FR,
    "ru": RU,
    "ar": AR,
    "fa": FA,
    "he": HE,
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


def tr_yoga(lang: str, name: str) -> str:
    """Translate a yoga name (e.g. "Sadhya") to the locale."""
    if not name:
        return ""
    key = f"yoga_{name.lower().replace(' ', '_')}"
    out = t(lang, key)
    return name if out == key else out


def tr_karana(lang: str, name: str) -> str:
    """Translate a karana name (e.g. "Vishti") to the locale."""
    if not name:
        return ""
    key = f"karana_{name.lower().replace(' ', '_')}"
    out = t(lang, key)
    return name if out == key else out


def tr_month(lang: str, name: str) -> str:
    """Translate a lunar month name (e.g. "Vaishakha") to the locale."""
    if not name:
        return ""
    key = f"month_{name.lower().replace(' ', '_')}"
    out = t(lang, key)
    return name if out == key else out


def tr_direction(lang: str, name: str) -> str:
    """Translate a direction name (e.g. "South-East") to the locale."""
    if not name:
        return ""
    key = f"direction_{name.lower().replace(' ', '_')}"
    out = t(lang, key)
    return name if out == key else out


def tr_ayana(lang: str, name: str) -> str:
    """Translate an ayana name ("Uttarayana"/"Dakshinayana") to the locale."""
    if not name:
        return ""
    key = f"ayana_{name.lower().replace(' ', '_')}"
    out = t(lang, key)
    return name if out == key else out


def tr_gowri(lang: str, name: str) -> str:
    """Translate a Gowri segment name (e.g. "Amridha") to the locale."""
    if not name:
        return ""
    key = f"gowri_{name.lower().replace(' ', '_')}"
    out = t(lang, key)
    return name if out == key else out


def tr_karaka(lang: str, name: str) -> str:
    """Translate a Jaimini karaka role (e.g. "Atmakaraka") to the locale."""
    if not name:
        return ""
    key = f"karaka_{name.lower().replace(' ', '_')}"
    out = t(lang, key)
    return name if out == key else out


def tr_paksha(lang: str, name: str) -> str:
    """Translate a paksha. Backend ships either "Krishna Paksha"/"Shukla
    Paksha" or the bare "Krishna"/"Shukla" - try the full key, then the
    bare word."""
    if not name:
        return ""
    key = f"paksha_{name.lower().replace(' ', '_')}"
    out = t(lang, key)
    if out != key:
        return out
    bare = name.split()[0].lower()
    bare_key = f"paksha_{bare}"
    out = t(lang, bare_key)
    return name if out == bare_key else out


def tr_ritu(lang: str, name: str) -> str:
    """Translate a ritu name. Backend often appends a parenthetical English
    gloss like "Grishma (Summer)" - strip it before lookup."""
    if not name:
        return ""
    head = name.split("(", 1)[0].strip()
    key = f"ritu_{head.lower()}"
    out = t(lang, key)
    return name if out == key else out


def tr_tithi(lang: str, name: str) -> str:
    """Translate a tithi name. Comes either bare ("Amavasya", "Purnima") or
    paksha-prefixed ("Krishna Shashthi") - resolve paksha and ordinal
    independently so we only need 16 ordinals + 2 paksha words per locale."""
    if not name:
        return ""
    parts = name.strip().split(maxsplit=1)
    if len(parts) == 1:
        key = f"tithi_{parts[0].lower()}"
        out = t(lang, key)
        return name if out == key else out
    paksha_key = f"paksha_{parts[0].lower()}"
    tithi_key = f"tithi_{parts[1].lower().replace(' ', '_')}"
    paksha_word = t(lang, paksha_key)
    ordinal = t(lang, tithi_key)
    if paksha_word == paksha_key or ordinal == tithi_key:
        return name
    return f"{paksha_word} {ordinal}"


def t_num(lang: str, value) -> str:
    """Stringify a numeric value for the report; "" for None.

    All numeric data (dates, times, degrees, padas, dasha years, table
    counts) stays in Latin digits 0-9 for every language. This used to
    substitute native digit sets (Tamil/Devanagari/Bengali/Arabic), which
    readers found unreadable and which the web UI never does - see issue
    #86. The `lang` parameter is kept so call sites don't churn if a locale
    ever genuinely needs digit shaping again.
    """
    if value is None:
        return ""
    return str(value)
