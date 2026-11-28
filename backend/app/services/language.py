"""
Mixed-language speech (Hinglish, Gujlish, English-in-Indic-script) without any model or key.

Phone speech recognisers are locked to one language. When a shopkeeper with Hindi selected
says an English sentence, Chrome writes it in Devanagari:
    "आई वांट टू मेक श्योर देट राहुल शर्मा हैज़ रिसीव्ड"
`latinize` turns the English words back into English (keeping Hindi/Gujarati words and names):
    "I want to make sure that राहुल शर्मा has received"
`detect_language` decides which language the person actually spoke, so Vaani can reply in it
and the app can switch its recogniser for the next turn.
"""
import re
from typing import Optional

_PUNCT = " ,.?!।;:\"'()"

# English word -> how hi-IN / gu-IN recognisers write it. Only unambiguous spellings
# (e.g. Hindi "इन" = "these" and Gujarati "નો" = possessive are deliberately left out).
EN_IN_SCRIPT: dict[str, list[str]] = {
    # sentence glue
    "i": ["आई", "આઈ"], "want": ["वांट", "वॉन्ट", "વોન્ટ"], "to": ["टू", "टु", "ટુ"], "make": ["मेक", "મેક"],
    "sure": ["श्योर", "शोर", "શ્યોર"], "that": ["देट", "दैट", "धेट", "ધેટ", "ડેટ"], "this": ["दिस", "ડિસ", "ધીસ"],
    "the": ["द", "दी"], "is": ["इज", "इज़", "ઇઝ"], "has": ["हैज़", "हैज", "હેઝ"], "have": ["हैव", "હેવ"],
    "and": ["एंड", "ऐंड", "એન્ડ"], "my": ["माय", "माई", "માય"], "me": ["मी", "મી"], "from": ["फ्रॉम", "फ्रोम", "ફ્રોમ"],
    "for": ["फॉर", "फोर", "ફોર"], "of": ["ऑफ", "ઓફ"], "on": ["ऑन", "ઓન"], "at": ["एट", "ऐट", "એટ"],
    "with": ["विद", "વિથ"], "please": ["प्लीज", "प्लीज़", "પ્લીઝ"], "what": ["व्हाट", "वॉट", "વોટ"],
    "how": ["हाउ", "હાઉ"], "much": ["मच", "મચ"], "many": ["मेनी", "મેની"], "who": ["हु", "હુ"],
    "so": ["सो"], "cut": ["कट", "કટ"], "it": ["इट", "ઇટ"], "he": ["ही", "હી"], "she": ["शी", "શી"],
    "today": ["टुडे", "ટુડે"], "tomorrow": ["टुमॉरो", "टुमारो", "ટુમોરો"], "now": ["नाउ", "નાઉ"],
    "yes": ["यस", "येस", "યસ"], "ok": ["ओके", "ओक", "ઓકે"], "no": ["नो"], "done": ["डन", "ડન"],
    "check": ["चेक", "ચેક"], "show": ["शो", "શો"], "tell": ["टेल", "ટેલ"], "list": ["लिस्ट", "લિસ્ટ"],
    # khata words
    "received": ["रिसीव्ड", "रिसीव", "रिसिव्ड", "રિસીવ્ડ", "રિસીવ"], "receive": ["रिसीव", "રિસીવ"],
    "paid": ["पेड", "पेइड", "પેડ", "પેઇડ"], "pay": ["पेय"], "payment": ["पेमेंट", "पेमेन्ट", "પેમેન્ટ"],
    "deposit": ["डिपॉजिट", "डिपॉज़िट", "डिपोजिट", "ડિપોઝિટ", "ડીપોઝીટ"], "deposited": ["डिपॉजिटेड", "ડિપોઝિટેડ"],
    "give": ["गिव", "ગિવ"], "gave": ["गेव", "ગેવ"], "given": ["गिवन", "ગિવન"], "take": ["टेक", "ટેક"],
    "took": ["टुक", "ટુક"], "owe": ["ओ"], "owes": ["ओज", "ओज़", "ओस", "ઓઝ"], "money": ["मनी", "મની"],
    "add": ["ऐड", "एड", "એડ", "ઍડ"], "new": ["न्यू", "ન્યૂ", "ન્યુ"], "customer": ["कस्टमर", "કસ્ટમર"],
    "name": ["नेम", "નેમ"], "order": ["ऑर्डर", "आर्डर", "ઓર્ડર"], "bill": ["बिल", "બિલ"],
    "balance": ["बैलेंस", "बेलेंस", "બેલેન્સ"], "account": ["अकाउंट", "એકાઉન્ટ"], "credit": ["क्रेडिट", "ક્રેડિટ"],
    "pending": ["पेंडिंग", "પેન્ડિંગ"], "total": ["टोटल", "ટોટલ"], "amount": ["अमाउंट", "અમાઉન્ટ"],
    "rupees": ["रुपीज", "रुपीज़", "રૂપીઝ"], "thousand": ["थाउजेंड", "थाउज़ेंड", "થાઉઝન્ડ"], "hundred": ["हंड्रेड", "હન્ડ્રેડ"],
    "lakh": ["लैख"], "cash": ["कैश", "કેશ"], "settle": ["सेटल", "સેટલ"], "clear": ["क्लियर", "ક્લિયર"],
    "reminder": ["रिमाइंडर", "રિમાઇન્ડર"], "remind": ["रिमाइंड", "રિમાઇન્ડ"], "call": ["कॉल", "કોલ"],
    "phone": ["फोन", "फ़ोन", "ફોન"], "minutes": ["मिनट्स", "મિનિટ્સ"], "minute": ["मिनिट", "મિનિટ"],
    "after": ["आफ्टर", "આફ્ટર"], "later": ["लेटर", "લેટર"], "delete": ["डिलीट", "ડિલીટ"], "undo": ["अनडू", "અનડુ"],
    "cancel": ["कैंसल", "केंसल", "કેન્સલ"], "save": ["सेव", "સેવ"], "proof": ["प्रूफ", "પ્રૂફ"],
    "recording": ["रिकॉर्डिंग", "રેકોર્ડિંગ"], "help": ["हेल्प", "હેલ્પ"], "summary": ["समरी", "સમરી"],
    "sales": ["सेल्स", "સેલ્સ"], "sold": ["सोल्ड", "સોલ્ડ"], "udhar": [],
    # numbers people say in English
    "one": ["वन", "વન"], "two": ["टू"], "three": ["थ्री", "થ્રી"], "four": ["फोर"], "five": ["फाइव", "ફાઇવ"],
    "six": ["सिक्स", "સિક્સ"], "seven": ["सेवन", "સેવન"], "eight": ["एट"], "nine": ["नाइन", "નાઇન"],
    "ten": ["टेन", "ટેન"], "twenty": ["ट्वेंटी", "ટ્વેન્ટી"], "fifty": ["फिफ्टी", "ફિફ્ટી"],
}
# "टू" / "एट" / "फोर" are both glue words and numbers; the glue meaning wins (numbers use digits in practice)
_TO_EN: dict[str, str] = {}
for _en, _forms in EN_IN_SCRIPT.items():
    for _f in _forms:
        _TO_EN.setdefault(_f, _en)

_INDIC_SUFFIXES = sorted(["को", "का", "की", "के", "ने", "से", "में", "ને", "ના", "ની", "નો", "નું", "માં", "થી"], key=len, reverse=True)


def _lookup(tok: str) -> Optional[tuple[str, str]]:
    """Return (english, attached_suffix) for a loanword token, if it is one."""
    if tok in _TO_EN:
        return _TO_EN[tok], ""
    for suf in _INDIC_SUFFIXES:
        if tok.endswith(suf) and len(tok) > len(suf) + 1 and tok[: -len(suf)] in _TO_EN:
            return _TO_EN[tok[: -len(suf)]], suf
    return None


def latinize(text: str) -> str:
    """Write English words that arrived in Devanagari/Gujarati script back in English."""
    out = []
    for raw_tok in text.split():
        core = raw_tok.strip(_PUNCT)
        hit = _lookup(core) if core else None
        if not hit:
            out.append(raw_tok)
            continue
        en, suf = hit
        tail = raw_tok[len(raw_tok.rstrip(_PUNCT)):]
        out.append(f"{en} {suf}{tail}" if suf else f"{en}{tail}")
    return " ".join(out)


# --------------------------------------------------------------------------- detection
_HI = {
    "है", "हैं", "का", "की", "के", "को", "ने", "से", "में", "और", "भी", "नहीं", "हाँ", "हां", "क्या", "कितना", "कितने",
    "बाकी", "दिए", "दिया", "लिखो", "लिख", "आज", "कल", "याद", "पैसे", "रुपये", "जमा", "उधार", "मुझे", "मेरा", "उसका",
    "हिसाब", "था", "थे", "हो", "गया", "गई", "करो", "बताओ", "किसका", "सबूत", "सुनाओ", "दिलाना", "वाले", "लेने",
}
# Gujarati in its own script, and Gujarati words as a Hindi recogniser writes them
_GU = {
    "છે", "ના", "ની", "નો", "ને", "માં", "અને", "પણ", "નથી", "હા", "શું", "કેટલા", "કેટલું", "આપ્યા", "લખો", "આજે",
    "કાલે", "પૈસા", "રૂપિયા", "જમા", "ઉધાર", "બાકી", "મને", "મારું", "હિસાબ", "હતો", "હતા", "કરો", "આપો", "બતાવો",
    "લીધા", "કોના", "એનું", "નામ", "ઉમેરો", "અપાવો", "પુરાવો",
    "छे", "केटला", "केटलुं", "आप्या", "लखो", "अने", "पण", "नथी", "शुं", "आजे", "काले", "पैसा", "रूपिया", "हतो",
    "हता", "मने", "मारुं", "बतावो", "लीधा", "कोना", "एनुं", "उमेरो", "अपावो",
}
_HI_IN_GU = {"".join(chr(ord(c) + 0x180) if 0x0901 <= ord(c) <= 0x096F else c for c in w) for w in _HI}
_EN_LATIN = {
    "the", "is", "are", "has", "have", "to", "i", "want", "how", "much", "who", "paid", "received", "please",
    "what", "my", "me", "from", "for", "and", "owes", "owe", "give", "gave", "add", "remind", "show", "today",
    "tomorrow", "make", "sure", "that", "this", "of", "on", "at", "with", "money", "customer", "balance",
    "order", "account", "pending", "collect", "deposit", "deposited", "new", "name", "his", "her", "him",
    "does", "did", "was", "will", "can", "you", "a", "an", "rupees", "minutes", "hours", "call", "tell",
}


def _script(tok: str) -> str:
    if re.search(r"[઀-૿]", tok):
        return "gu"
    if re.search(r"[ऀ-ॿ]", tok):
        return "deva"
    if re.search(r"[A-Za-z]", tok):
        return "latin"
    return "other"


def detect_language(text: str) -> Optional[str]:
    """
    'en-IN' / 'hi-IN' / 'gu-IN' when the sentence clearly is that language, else None (keep the current one).
    Short replies ("haan", "5000") and Latin-script Hinglish return None on purpose.
    """
    toks = [t.strip(_PUNCT) for t in text.split()]
    toks = [t for t in toks if t and not t.isdigit()]
    if not toks:
        return None
    scripts = [_script(t) for t in toks]
    en = sum(1 for t, s in zip(toks, scripts) if (s == "latin" and t.lower() in _EN_LATIN) or (s != "latin" and t in _TO_EN))
    hi = sum(1 for t in toks if t in _HI)
    gu = sum(1 for t in toks if t in _GU)
    gu_script = scripts.count("gu") / len(toks)
    deva_script = scripts.count("deva") / len(toks)

    if en >= 3 and en > (hi + gu) * 2:
        return "en-IN"
    # Hindi heard by a Gujarati recogniser: Hindi words written in Gujarati script ("કિતના", "હૈ")
    hi_in_gu = sum(1 for t in toks if t in _HI_IN_GU)
    if gu_script >= 0.5 and hi_in_gu >= 2 and hi_in_gu > gu:
        return "hi-IN"
    if gu_script >= 0.5 or (gu >= 2 and gu > hi):
        return "gu-IN"
    if deva_script >= 0.5 and hi >= 1 and hi >= en:
        return "hi-IN"
    if scripts.count("latin") == len(toks) and en >= 3:
        return "en-IN"
    return None


def _shift(text: str, lo: int, hi: int, delta: int) -> str:
    return "".join(chr(ord(c) + delta) if lo <= ord(c) <= hi else c for c in text)


def match_script(text: str, language: Optional[str]) -> str:
    """
    Gujarati heard by a Hindi recogniser arrives in Devanagari ("राहुल ना केटला बाकी छे").
    The two scripts mirror each other, so shift it into Gujarati script (and vice versa),
    leaving English loanwords alone.
    """
    if not language or language.startswith("en"):
        return text
    out = []
    for tok in text.split():
        core = tok.strip(_PUNCT)
        if core in _TO_EN:
            out.append(tok)
        elif language.startswith("gu") and _script(core) == "deva":
            out.append(_shift(tok, 0x0901, 0x096F, 0x180).replace("।", "."))
        elif language.startswith("hi") and _script(core) == "gu":
            out.append(_shift(tok, 0x0A81, 0x0AEF, -0x180))
        else:
            out.append(tok)
    return " ".join(out)
