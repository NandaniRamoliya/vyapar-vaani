"""
What the agent says, in English (Indian), Hindi and Gujarati.

Several variants per line so the assistant doesn't sound like a recording.
Amounts are written as ₹1,22,000 for the screen; the phone's TTS reads them out
in the selected language (the frontend rewrites "₹" to rupees / रुपये / રૂપિયા).
"""
import random
from datetime import datetime
from typing import Optional

from app.services.khata import format_inr

T: dict[str, dict[str, list[str]]] = {
    # ------------------------------------------------------------------ asking for missing details
    "ask_name": {
        "en": ["Whose khata should I write this in?", "For which customer?", "Okay, which customer is this for?"],
        "hi": ["किसके खाते में लिखूँ?", "किस ग्राहक के लिए?", "जी, किसका नाम लिखूँ?"],
        "gu": ["કોના ખાતામાં લખું?", "કયા ગ્રાહક માટે?", "હા જી, કોનું નામ લખું?"],
    },
    "ask_amount": {
        "en": ["How much for {first}?", "Okay, {first}. How many rupees?", "Sure. What's the amount for {first}?"],
        "hi": ["{first} के लिए कितने रुपये?", "ठीक है, {first}। कितने रुपये लिखूँ?", "जी, {first} का कितना?"],
        "gu": ["{first} માટે કેટલા રૂપિયા?", "સારું, {first}. કેટલા રૂપિયા લખું?", "હા જી, {first} ના કેટલા?"],
    },
    "ask_total": {
        "en": ["What's the total amount for this order?", "And the total bill?"],
        "hi": ["इस ऑर्डर का कुल कितना हुआ?", "और कुल बिल कितना?"],
        "gu": ["આ ઓર્ડરનું કુલ કેટલું થયું?", "અને કુલ બિલ કેટલું?"],
    },
    # ------------------------------------------------------------------ confirmations
    "confirm_udhar": {
        "en": ["{name}, {amt} udhar. Balance becomes {new}. Shall I write it?",
               "Writing {amt} udhar for {name}. Total will be {new}. Okay?"],
        "hi": ["{name}, {amt} उधार। कुल बाकी {new} हो जाएगा। लिख दूँ?",
               "{name} के खाते में {amt} उधार, कुल {new}। ठीक है?"],
        "gu": ["{name}, {amt} ઉધાર. કુલ બાકી {new} થશે. લખી દઉં?",
               "{name} ના ખાતામાં {amt} ઉધાર, કુલ {new}. બરાબર?"],
    },
    "confirm_payment": {
        "en": ["{amt} received from {name}. Balance becomes {new}. Shall I save it?",
               "Got it, {name} paid {amt}. That leaves {new}. Okay?"],
        "hi": ["{name} से {amt} मिले। बाकी {new} रहेगा। जमा कर दूँ?",
               "{name} ने {amt} दिए, अब {new} बाकी। ठीक है?"],
        "gu": ["{name} પાસેથી {amt} મળ્યા. બાકી {new} રહેશે. જમા કરી દઉં?",
               "{name} એ {amt} આપ્યા, હવે {new} બાકી. બરાબર?"],
    },
    "new_customer_note": {
        "en": ["{name} is a new customer, I'll add them. "],
        "hi": ["{name} नए ग्राहक हैं, मैं जोड़ दूँगी। "],
        "gu": ["{name} નવા ગ્રાહક છે, હું ઉમેરી દઈશ. "],
    },
    "khata_now": {
        "en": ["Khata balance is now {bal}."],
        "hi": ["खाते में अब कुल {bal} बाकी।"],
        "gu": ["ખાતામાં હવે કુલ {bal} બાકી."],
    },
    # ------------------------------------------------------------------ saved
    "saved_udhar": {
        "en": ["Done. {amt} written in {name}'s khata. Total due is now {bal}.",
               "Written. {name} now owes {bal}."],
        "hi": ["लिख दिया। {name} का कुल बाकी अब {bal} है।", "हो गया। {name} के खाते में अब {bal} बाकी।"],
        "gu": ["લખી દીધું. {name} ના હવે કુલ {bal} બાકી છે.", "થઈ ગયું. {name} ના ખાતામાં હવે {bal} બાકી."],
    },
    "saved_payment": {
        "en": ["Done, {amt} received. {balance_line}", "Payment saved. {balance_line}"],
        "hi": ["जमा कर दिया। {balance_line}", "{amt} जमा हो गए। {balance_line}"],
        "gu": ["જમા કરી દીધા. {balance_line}", "{amt} જમા થઈ ગયા. {balance_line}"],
    },
    # ------------------------------------------------------------------ balances
    "balance_due": {
        "en": ["{name} owes you {bal}.", "{name}'s pending balance is {bal}."],
        "hi": ["{name} का {bal} बाकी है।", "{name} के खाते में {bal} बाकी है।"],
        "gu": ["{name} ના {bal} બાકી છે.", "{name} ના ખાતામાં {bal} બાકી છે."],
    },
    "balance_zero": {
        "en": ["{name}'s khata is fully settled. Nothing pending."],
        "hi": ["{name} का खाता साफ़ है, कुछ बाकी नहीं।"],
        "gu": ["{name} નું ખાતું ચોખ્ખું છે, કંઈ બાકી નથી."],
    },
    "balance_advance": {
        "en": ["{name} has {bal} in advance with you."],
        "hi": ["{name} के {bal} एडवांस जमा हैं।"],
        "gu": ["{name} ના {bal} એડવાન્સ જમા છે."],
    },
    "last_payment": {
        "en": [" Last payment: {date}."],
        "hi": [" आखिरी पेमेंट {date} आया था।"],
        "gu": [" છેલ્લું પેમેન્ટ {date} આવ્યું હતું."],
    },
    "has_proof": {
        "en": [" Their voice confirmation is saved too."],
        "hi": [" उनकी आवाज़ की पुष्टि भी सेव है।"],
        "gu": [" એમની અવાજની પુષ્ટિ પણ સેવ છે."],
    },
    "not_found": {
        "en": ["I couldn't find {name} in your khata.", "There's no customer called {name} yet."],
        "hi": ["{name} नाम का कोई ग्राहक खाते में नहीं मिला।"],
        "gu": ["{name} નામનો કોઈ ગ્રાહક ખાતામાં મળ્યો નહીં."],
    },
    "dues_none": {
        "en": ["Nobody owes you anything right now. All khatas are clear!"],
        "hi": ["अभी किसी का कुछ बाकी नहीं है। सारे खाते साफ़ हैं!"],
        "gu": ["અત્યારે કોઈના કંઈ બાકી નથી. બધા ખાતા ચોખ્ખા છે!"],
    },
    "dues_list": {
        "en": ["{n} customers owe you {total} in total. Highest: {top}."],
        "hi": ["{n} ग्राहकों का कुल {total} बाकी है। सबसे ज़्यादा: {top}।"],
        "gu": ["{n} ગ્રાહકોના કુલ {total} બાકી છે. સૌથી વધુ: {top}."],
    },
    # ------------------------------------------------------------------ voice signature
    "signature_phrase": {
        "en": ["Yes, I have taken {amt} on udhar"],
        "hi": ["हाँ, मैंने {amt} उधार लिए हैं"],
        "gu": ["હા, મેં {amt} ઉધાર લીધા છે"],
    },
    "ask_signature": {
        "en": ["{first} ji, to confirm, please say: {phrase}."],
        "hi": ["{first} जी, पक्का करने के लिए बोलिए: {phrase}।"],
        "gu": ["{first} જી, પાકું કરવા માટે બોલો: {phrase}."],
    },
    "signature_saved": {
        "en": ["Thank you {first} ji. Your voice is saved safely in the khata.",
               "Thank you. {first} ji's voice confirmation is saved."],
        "hi": ["धन्यवाद {first} जी। आपकी आवाज़ खाते में सुरक्षित है।"],
        "gu": ["આભાર {first} જી. તમારો અવાજ ખાતામાં સુરક્ષિત છે."],
    },
    "proof_intro": {
        "en": ["Here is {first} ji's own voice from {date}, for {amt}."],
        "hi": ["ये रही {first} जी की अपनी आवाज़, {date} को, {amt} के लिए।"],
        "gu": ["આ રહ્યો {first} જી નો પોતાનો અવાજ, {date} એ, {amt} માટે."],
    },
    "proof_none": {
        "en": ["There's no voice recording for {name} yet. Next time, let them confirm by voice."],
        "hi": ["{name} की अभी कोई आवाज़ रिकॉर्ड नहीं है। अगली बार उनसे बोलकर पक्का करवाइए।"],
        "gu": ["{name} નો હજી કોઈ અવાજ રેકોર્ડ નથી. આવતી વખતે એમની પાસે બોલીને પાકું કરાવજો."],
    },
    # ------------------------------------------------------------------ daily hisaab
    "hisaab": {
        "en": ["Today's hisaab: sales {sales} from {orders} orders. Udhar given {given}, collected {collected}. Total pending in the market: {pending}."],
        "hi": ["आज का हिसाब: {orders} ऑर्डर में {sales} की बिक्री। {given} उधार दिया, {collected} वसूल हुआ। बाज़ार में कुल {pending} बाकी है।"],
        "gu": ["આજનો હિસાબ: {orders} ઓર્ડરમાં {sales} નું વેચાણ. {given} ઉધાર આપ્યા, {collected} વસૂલ થયા. બજારમાં કુલ {pending} બાકી છે."],
    },
    "hisaab_chase": {
        "en": [" Tomorrow, follow up with {who}."],
        "hi": [" कल {who} से बात कर लीजिए।"],
        "gu": [" કાલે {who} સાથે વાત કરી લેજો."],
    },
    # ------------------------------------------------------------------ undo
    "undo_confirm": {
        "en": ["Remove the last entry: {what}?"],
        "hi": ["पिछली एंट्री हटा दूँ: {what}?"],
        "gu": ["છેલ્લી એન્ટ્રી કાઢી નાખું: {what}?"],
    },
    "undo_done": {
        "en": ["Removed. It's like it never happened."],
        "hi": ["हटा दिया।"],
        "gu": ["કાઢી નાખ્યું."],
    },
    "undo_nothing": {
        "en": ["There's nothing to undo right now."],
        "hi": ["अभी हटाने के लिए कुछ नहीं है।"],
        "gu": ["અત્યારે કાઢવા માટે કંઈ નથી."],
    },
    "undo_signed": {
        "en": ["That entry has the customer's voice signature, so I can't delete it. Record a payment instead to balance it."],
        "hi": ["उस एंट्री पर ग्राहक की आवाज़ का साइन है, इसलिए हटा नहीं सकती। बराबर करने के लिए जमा एंट्री कर दीजिए।"],
        "gu": ["એ એન્ટ્રી પર ગ્રાહકની અવાજની સહી છે, એટલે કાઢી નહીં શકું. સરભર કરવા જમા એન્ટ્રી કરો."],
    },
    # ------------------------------------------------------------------ small talk
    "greet": {
        "en": ["Namaste! Tell me, what should I write?", "Namaste ji! I'm listening."],
        "hi": ["नमस्ते जी! बोलिए, क्या लिखूँ?", "नमस्ते! बताइए, क्या करना है?"],
        "gu": ["નમસ્તે જી! બોલો, શું લખું?", "નમસ્તે! કહો, શું કરવું છે?"],
    },
    "thanks": {
        "en": ["Anytime ji!", "Happy to help!"],
        "hi": ["कोई बात नहीं जी!", "आपकी सेवा में!"],
        "gu": ["કંઈ વાંધો નહીં જી!", "તમારી સેવામાં!"],
    },
    "help": {
        "en": ["I'm Vaani, your shop's voice munim. Say things like: Rahul ko 5000 udhar likho, Rahul paid 3000, who owes me money, or aaj ka hisaab."],
        "hi": ["मैं वाणी हूँ, आपकी दुकान की आवाज़ वाली मुनीम। बोलिए: राहुल को 5000 उधार लिखो, राहुल ने 3000 जमा किए, किसका कितना बाकी है, या आज का हिसाब।"],
        "gu": ["હું વાણી છું, તમારી દુકાનની અવાજવાળી મુનીમ. બોલો: રાહુલને 5000 ઉધાર લખો, રાહુલે 3000 જમા કર્યા, કોના કેટલા બાકી છે, અથવા આજનો હિસાબ."],
    },
    "unknown": {
        "en": ["Sorry, I didn't get that. You can say: Rahul ko 5000 udhar likho.",
               "Hmm, say that once more? For example: Priya paid 2000."],
        "hi": ["माफ़ कीजिए, समझ नहीं आया। ऐसे बोलिए: राहुल को 5000 उधार लिखो।",
               "एक बार फिर बोलिए? जैसे: प्रिया ने 2000 जमा किए।"],
        "gu": ["માફ કરજો, સમજાયું નહીં. આમ બોલો: રાહુલને 5000 ઉધાર લખો.",
               "ફરી એક વાર બોલશો? જેમ કે: પ્રિયાએ 2000 જમા કર્યા."],
    },
}

_MONTHS = {
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "hi": ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
    "gu": ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઑગસ્ટ", "સપ્ટેમ્બર", "ઑક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"],
}
_TODAY = {"en": "today", "hi": "आज", "gu": "આજે"}
_YESTERDAY = {"en": "yesterday", "hi": "कल", "gu": "ગઈકાલે"}
_AND = {"en": "and", "hi": "और", "gu": "અને"}


def lang_key(language: Optional[str]) -> str:
    language = (language or "en").lower()
    if language.startswith("hi"):
        return "hi"
    if language.startswith("gu"):
        return "gu"
    return "en"


def say(key: str, language: Optional[str] = "en-IN", **kw) -> str:
    variants = T[key][lang_key(language)]
    return random.choice(variants).format(**kw)


def money(amount: float) -> str:
    sign = "-" if amount < 0 else ""
    return f"{sign}₹{format_inr(abs(amount))}"


def human_date(ts: Optional[str], language: Optional[str] = "en-IN") -> str:
    """'2026-11-12 10:00:00' -> '12 November' / '12 नवंबर' / 'today'."""
    if not ts:
        return ""
    lk = lang_key(language)
    try:
        d = datetime.strptime(ts[:10], "%Y-%m-%d").date()
    except ValueError:
        return ts[:10]
    delta = (datetime.now().date() - d).days
    if delta == 0:
        return _TODAY[lk]
    if delta == 1:
        return _YESTERDAY[lk]
    return f"{d.day} {_MONTHS[lk][d.month - 1]}"


def join_names(items: list[str], language: Optional[str] = "en-IN") -> str:
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + f" {_AND[lang_key(language)]} " + items[-1]


def first_name(name: str) -> str:
    return (name or "").split()[0] if name else ""
