"""
Zero-key Indic language helpers (no external APIs, no models).

* normalize_digits:   ५००० / ૫૦૦૦  -> 5000
* normalize_numbers:  "पांच हजार", "dedh lakh", "સાડા ત્રણ હજાર" -> digits
* transliterate:      राहुल / રાહુલ -> rahul   (so Hindi/Gujarati speech matches the customer book)
* best_name_match:    fuzzy match a spoken token against known customer names
"""
import re
from difflib import SequenceMatcher
from typing import Iterable, Optional

# --------------------------------------------------------------------------- digits
_DIGIT_TABLE = {ord(c): str(i) for i, c in enumerate("०१२३४५६७८९")}
_DIGIT_TABLE.update({ord(c): str(i) for i, c in enumerate("૦૧૨૩૪૫૬૭૮૯")})


def normalize_digits(text: str) -> str:
    return text.translate(_DIGIT_TABLE)


# --------------------------------------------------------------------------- number words
# Words in Indic script are unambiguous, so they always count as numbers.
_INDIC_UNITS = {
    # Hindi
    "शून्य": 0, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "छः": 6, "छे": 6,
    "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "ग्यारह": 11, "बारह": 12, "तेरह": 13, "चौदह": 14,
    "पंद्रह": 15, "पन्द्रह": 15, "सोलह": 16, "सत्रह": 17, "अठारह": 18, "उन्नीस": 19, "बीस": 20,
    "पच्चीस": 25, "तीस": 30, "पैंतीस": 35, "चालीस": 40, "पैंतालीस": 45, "पचास": 50, "साठ": 60,
    "सत्तर": 70, "अस्सी": 80, "नब्बे": 90,
    # Gujarati
    "એક": 1, "બે": 2, "ત્રણ": 3, "ચાર": 4, "પાંચ": 5, "છ": 6, "સાત": 7, "આઠ": 8, "નવ": 9, "દસ": 10,
    "અગિયાર": 11, "બાર": 12, "તેર": 13, "ચૌદ": 14, "પંદર": 15, "સોળ": 16, "સત્તર": 17, "અઢાર": 18,
    "ઓગણીસ": 19, "વીસ": 20, "પચ્ચીસ": 25, "ત્રીસ": 30, "પાંત્રીસ": 35, "ચાલીસ": 40, "પચાસ": 50,
    "સાઠ": 60, "સિત્તેર": 70, "એંસી": 80, "નેવું": 90,
}
# Romanised / English words collide with ordinary words ("do", "saath"), so they only
# count when followed by a multiplier: "do hazaar", "five thousand", "teen sau".
_ROMAN_UNITS = {
    "एक": 1, "दो": 2,  # also "a" / "give" in Hindi: only numbers before सौ/हजार/लाख
    "ek": 1, "one": 1, "do": 2, "two": 2, "teen": 3, "three": 3, "char": 4, "chaar": 4, "four": 4,
    "paanch": 5, "panch": 5, "five": 5, "chhe": 6, "che": 6, "six": 6, "saat": 7, "seven": 7,
    "aath": 8, "eight": 8, "nau": 9, "nine": 9, "das": 10, "dus": 10, "ten": 10, "gyarah": 11,
    "barah": 12, "pandrah": 15, "fifteen": 15, "bees": 20, "twenty": 20, "pachees": 25, "pachchis": 25,
    "tees": 30, "thirty": 30, "chalis": 40, "chaalis": 40, "forty": 40, "pachas": 50, "pachaas": 50,
    "fifty": 50,
}
_FRACTIONS = {  # standalone fractional numbers
    "डेढ़": 1.5, "डेढ": 1.5, "ढाई": 2.5, "દોઢ": 1.5, "અઢી": 2.5, "dedh": 1.5, "dhai": 2.5, "adhai": 2.5,
}
_PREFIX_ADD = {  # "saadhe teen" = 3.5, "sava do" = 2.25
    "साढ़े": 0.5, "साढे": 0.5, "સાડા": 0.5, "saadhe": 0.5, "sadhe": 0.5, "saade": 0.5,
    "सवा": 0.25, "સવા": 0.25, "sava": 0.25, "savaa": 0.25,
}
_HUNDRED = {"सौ": 100, "સો": 100, "sau": 100, "hundred": 100}
_BIG = {
    "हजार": 1000, "हज़ार": 1000, "હજાર": 1000, "hazaar": 1000, "hazar": 1000, "hajar": 1000, "thousand": 1000,
    "लाख": 100000, "લાખ": 100000, "lakh": 100000, "lac": 100000, "lakhs": 100000,
    "करोड़": 10000000, "करोड": 10000000, "કરોડ": 10000000, "crore": 10000000,
}
_PUNCT = " ,.?!।;:\"'()"


def _is_multiplier(tok: str) -> bool:
    return tok in _HUNDRED or tok in _BIG


def _base_value(tok: str, next_tok: Optional[str]) -> Optional[float]:
    if re.fullmatch(r"\d+(?:\.\d+)?", tok):
        return float(tok)
    if tok in _INDIC_UNITS:
        return float(_INDIC_UNITS[tok])
    if tok in _FRACTIONS:
        return _FRACTIONS[tok]
    if tok in _ROMAN_UNITS and next_tok is not None and _is_multiplier(next_tok):
        return float(_ROMAN_UNITS[tok])
    return None


def normalize_numbers(text: str) -> str:
    """Rewrite spoken numbers as digits. Digits with commas ("5,000") are left alone."""
    text = normalize_digits(text)
    raw_tokens = text.split()
    tokens = [t.strip(_PUNCT).lower() for t in raw_tokens]
    out: list[str] = []
    i = 0
    while i < len(tokens):
        total, current, consumed, saw_number = 0.0, 0.0, 0, False
        j = i
        pending_add = 0.0
        while j < len(tokens):
            tok = tokens[j]
            nxt = tokens[j + 1] if j + 1 < len(tokens) else None
            if tok in _PREFIX_ADD and nxt is not None and _base_value(nxt, tokens[j + 2] if j + 2 < len(tokens) else None) is not None:
                pending_add = _PREFIX_ADD[tok]
                j += 1
                continue
            val = _base_value(tok, nxt)
            if val is not None and (not saw_number or current == 0):
                current += val + pending_add
                pending_add = 0.0
                saw_number = True
                j += 1
                continue
            if saw_number and tok in _HUNDRED:
                current = (current or 1) * 100
                j += 1
                continue
            if saw_number and tok in _BIG:
                total += (current or 1) * _BIG[tok]
                current = 0.0
                j += 1
                continue
            break
        consumed = j - i
        # Only rewrite when words were involved (pure "5000" stays exactly as spoken)
        if saw_number and not (consumed == 1 and re.fullmatch(r"\d+(?:\.\d+)?", tokens[i])):
            value = total + current
            out.append(str(int(value)) if value == int(value) else str(value))
            # keep trailing punctuation of the last consumed token
            tail = raw_tokens[j - 1][len(raw_tokens[j - 1].rstrip(_PUNCT)):]
            if tail:
                out[-1] += tail
            i = j
        else:
            out.append(raw_tokens[i])
            i += 1
    return " ".join(out)


# --------------------------------------------------------------------------- transliteration
_CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh",
    "ञ": "n", "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n", "त": "t", "थ": "th", "द": "d",
    "ध": "dh", "न": "n", "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r",
    "ल": "l", "ळ": "l", "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h",
}
_VOWELS = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e", "ऐ": "ai",
    "ओ": "o", "औ": "au", "ऍ": "e", "ऑ": "o",
}
_MATRAS = {
    "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o",
    "ौ": "au", "ॅ": "e", "ॉ": "o",
}
_NUKTA_MAP = {"क": "q", "ज": "z", "फ": "f", "ड": "r", "ढ": "rh"}
_VIRAMA, _NUKTA = "्", "़"
_ANUSVARA = {"ं": "n", "ँ": "n", "ः": "h"}


def _gujarati_to_devanagari(text: str) -> str:
    # The Gujarati Unicode block mirrors Devanagari at an offset of 0x180.
    return "".join(chr(ord(c) - 0x180) if 0x0A81 <= ord(c) <= 0x0AEF else c for c in text)


def has_indic(text: str) -> bool:
    return bool(re.search(r"[ऀ-ॿ઀-૿]", text))


def transliterate(text: str) -> str:
    """Rough Devanagari/Gujarati -> Latin (lowercase). Good enough for name matching."""
    s = _gujarati_to_devanagari(text)
    out = []
    i = 0
    while i < len(s):
        c = s[i]
        if c in _CONSONANTS:
            cons = _CONSONANTS[c]
            j = i + 1
            if j < len(s) and s[j] == _NUKTA:
                cons = _NUKTA_MAP.get(c, cons)
                j += 1
            nxt = s[j] if j < len(s) else ""
            if nxt in _MATRAS:
                out.append(cons + _MATRAS[nxt])
                j += 1
            elif nxt == _VIRAMA:
                out.append(cons)
                j += 1
            else:
                # inherent vowel, dropped at the end of a word (schwa deletion)
                at_word_end = j >= len(s) or not ("ऀ" <= s[j] <= "ॿ")
                out.append(cons if at_word_end else cons + "a")
            i = j
            continue
        if c in _VOWELS:
            out.append(_VOWELS[c])
        elif c in _ANUSVARA:
            out.append(_ANUSVARA[c])
        elif c in (_VIRAMA, _NUKTA):
            pass
        else:
            out.append(c)
        i += 1
    return "".join(out).lower()


def phonetic_key(name: str) -> str:
    """Spelling-insensitive key: 'Raahul' / 'राहुल' / 'rahul' -> 'rahul'."""
    s = transliterate(name) if has_indic(name) else name.lower()
    s = re.sub(r"[^a-z]", "", s)
    for a, b in (("aa", "a"), ("ee", "i"), ("ii", "i"), ("oo", "u"), ("uu", "u"), ("w", "v"),
                 ("ph", "f"), ("z", "j"), ("ck", "k"), ("q", "k")):
        s = s.replace(a, b)
    s = re.sub(r"(.)\1+", r"\1", s)  # collapse doubled letters
    if len(s) > 3 and s.endswith("a"):
        s = s[:-1]  # Priya / Priyaa / प्रिया
    return s


def to_display_name(token: str) -> str:
    """Name heard in Hindi/Gujarati script -> 'Vikram' for the customer book."""
    if has_indic(token):
        latin = transliterate(token)
        latin = re.sub(r"aa", "a", latin)
        latin = re.sub(r"ee", "i", latin)
        latin = re.sub(r"oo", "u", latin)
        return latin.capitalize()
    return token.capitalize()


# --------------------------------------------------------------------------- names
_INDIC_SUFFIXES = sorted([
    "ભાઈ", "બેન", "જી", "નું", "નાં", "ના", "ની", "નો", "ને", "એ", "થી", "નુ",
    "जी", "भाई", "बहन", "ने", "को", "का", "की", "के", "से",
], key=len, reverse=True)
_GU_MATRA_E = "ે"  # "રાહુલે" (Rahul did) -> "રાહુલ"

_NAME_STOPWORDS = {
    # Hindi / Gujarati pronouns and common words that are never customer names
    "उस", "उन", "इस", "मुझे", "मेरा", "मेरे", "किस", "किसका", "कौन", "सब", "सबका", "आज", "कल", "ये", "वो",
    "उसका", "उसको", "उसे", "उनका", "हिसाब", "उधार", "खाता", "पैसे", "रुपये", "बाकी", "कितना", "कितने",
    "એ", "તે", "એને", "તેને", "કોના", "કોણ", "મને", "આજ", "આજે", "બધા", "હિસાબ", "ઉધાર", "ખાતું",
    "રૂપિયા", "બાકી", "કેટલા", "કેટલું", "પૈસા", "એનું", "એના", "તેના",
}


def name_candidates(token: str) -> list[str]:
    tok = token.strip(_PUNCT)
    if not tok:
        return []
    cands = [tok]
    for suf in _INDIC_SUFFIXES:
        if tok.endswith(suf) and len(tok) > len(suf) + 1:
            cands.append(tok[: -len(suf)])
    if tok.endswith(_GU_MATRA_E) and len(tok) > 2:
        cands.append(tok[:-1])
    if re.fullmatch(r"[A-Za-z]+(?:'s|’s)", tok):
        cands.append(re.sub(r"['’]s$", "", tok))
    return [c for c in cands if c and c not in _NAME_STOPWORDS]


def best_name_match(text: str, customer_names: Iterable[str], threshold: float = 0.84) -> Optional[str]:
    """Find a known customer mentioned anywhere in the sentence, in any script/spelling."""
    names = list(customer_names)
    if not names:
        return None
    keys = []
    for full in names:
        parts = full.split()
        keys.append((full, phonetic_key(full), phonetic_key(parts[0]) if parts else ""))

    best: tuple[float, Optional[str]] = (0.0, None)
    for token in text.split():
        for cand in name_candidates(token):
            ck = phonetic_key(cand)
            if len(ck) < 3:
                continue
            for full, full_key, first_key in keys:
                for target in (first_key, full_key):
                    if not target:
                        continue
                    if ck == target:
                        score = 1.0
                    elif ck[0] != target[0]:
                        continue  # "sure" must not become "Suresh"
                    else:
                        score = SequenceMatcher(None, ck, target).ratio()
                    if score > best[0]:
                        best = (score, full)
    return best[1] if best[0] >= threshold else None
