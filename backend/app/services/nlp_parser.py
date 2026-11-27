import re
import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Tuple

INDIAN_NUMBER_WORDS = {
    # English
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "hundred": 100, "thousand": 1000,
    # Hindi
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    "बीस": 20, "तीस": 30, "चालीस": 40, "पचास": 50, "सौ": 100, "हजार": 1000,
    # Gujarati
    "એક": 1, "બે": 2, "ત્રણ": 3, "ચાર": 4, "પાંચ": 5, "છ": 6, "સાત": 7, "આઠ": 8, "નવ": 9, "દસ": 10,
    "વીસ": 20, "ત્રીસ": 30, "ચાલીસ": 40, "પચાસ": 50, "સો": 100, "હજાર": 1000,
}

# Spoken first names in Indic scripts -> the Latin spelling stored in the customer book
NAME_ALIASES = {
    "राहुल": "Rahul", "प्रिया": "Priya", "सुरेश": "Suresh", "अंजलि": "Anjali", "अमित": "Amit",
    "રાહુલ": "Rahul", "પ્રિયા": "Priya", "સુરેશ": "Suresh", "અંજલિ": "Anjali", "અમિત": "Amit",
}

# ---- Khata / Udhar vocabulary (English + Hinglish + Hindi + Gujarati) ----
KHATA_LIST_DUES_WORDS = [
    "who owes", "who all owe", "who has to pay", "all dues", "total udhar", "total udhaar", "total dues",
    "total outstanding", "outstanding list", "udhar list", "khata list", "pending dues", "pending payments",
    "kiska kitna", "kis kis", "sabka udhar", "sab ka udhar", "all udhar", "who all", "everyone's",
    "kaun kaun", "kis kis ka",
    "किसका कितना", "किस किस", "सबका उधार", "सबका कितना", "कुल उधार", "कौन कौन",
    "કોના કેટલા", "કોના કોના", "બધાના", "કોણે કેટલા", "કુલ ઉધાર",
]
KHATA_BALANCE_WORDS = [
    "owe", "owes", "balance", "kitna baaki", "kitna baki", "kitne baaki", "kitne baki", "baaki kitna",
    "baki kitna", "kitna udhar", "kitna udhaar", "udhar kitna", "dues of", "khata dikhao", "khata batao",
    "check khata", "khata check", "how much is pending", "pending amount", "pending balance",
    "kitna lena", "kitne lene", "kitna dena",
    "कितना बाकी", "कितने बाकी", "बाकी कितना", "कितना उधार", "खाता दिखाओ", "कितना लेना", "कितने लेने",
    "કેટલા બાકી", "કેટલું બાકી", "બાકી કેટલા", "ખાતું બતાવો", "કેટલા લેવાના", "કેટલા લેવાના છે",
]
KHATA_PAYMENT_WORDS = [
    "paid", "received", "receive", "got payment", "payment of", "payment from", "payment mila",
    "payment aaya", "jama", "gave me", "returned", "cleared", "chukaya", "chuka diya", "de diye",
    "de gaya", "mil gaye", "mile",
    "भुगतान", "पेमेंट", "जमा", "चुकाए", "चुकाया", "मिले", "मिल गए", "वापस किए",
    "ભર્યા", "જમા", "ચૂકવ્યા", "મળ્યા", "પેમેન્ટ", "પાછા આપ્યા",
]
# "diye / आप्या" (gave) is direction-dependent: "Rahul NE 5000 diye" = he paid,
# "Rahul KO 5000 diye" = you gave him udhar. Resolved in _detect_khata_intent.
KHATA_GIVE_WORDS = ["diye", "de diye", "diya", "de gaya", "de gayi", "gave", "दिए", "दे दिए", "दिया", "दे गया",
                    "આપ્યા", "આપી ગયા", "આપ્યું", "આપી દીધા"]
KHATA_RECIPIENT_MARKERS = ["ko", "to", "को"]
KHATA_CREDIT_WORDS = [
    "udhar", "udhaar", "udhari", "on credit", "credit", "khata", "khate", "account",
    "baaki likho", "baki likho", "likh do", "likh lo", "likho", "likh de", "chadha do", "chadhao",
    "उधार", "खाते में", "बाकी लिखो", "लिखो", "लिख दो", "लिख लो", "चढ़ा दो",
    "ઉધાર", "ખાતામાં", "ખાતે", "લખો", "લખી દો", "લખી લો", "ચડાવો",
]
PROOF_WORDS = [
    "proof", "saboot", "sabut", "saboot sunao", "recording", "awaaz sunao", "awaz sunao", "voice sunao",
    "play voice", "play proof", "play recording", "dispute", "mukar", "mukar gaya", "mana kar raha", "inkaar",
    "सबूत", "रिकॉर्डिंग", "आवाज़ सुनाओ", "आवाज सुनाओ", "मुकर", "मना कर रहा",
    "પુરાવો", "સબૂત", "રેકોર્ડિંગ", "અવાજ સંભળાવો", "ફરી ગયો", "ના પાડે છે",
]
UNDO_WORDS = [
    "undo", "galti", "galat likha", "galat ho gaya", "cancel last", "delete last", "remove last", "last wala hatao",
    "pichla hatao", "pichhla hatao", "hata do", "mistake",
    "गलती", "गलत लिखा", "गलत हो गया", "पिछला हटाओ", "हटा दो", "हटाओ",
    "ભૂલ", "ખોટું લખાયું", "છેલ્લું કાઢી", "કાઢી નાખો", "હટાવો",
]
GREET_WORDS = ["namaste", "namaskar", "hello", "hi", "hey", "good morning", "good evening", "kaise ho", "kem cho",
               "नमस्ते", "नमस्कार", "कैसे हो", "નમસ્તે", "કેમ છો", "જય શ્રી કૃષ્ણ", "jai shree krishna"]
THANKS_WORDS = ["thank", "thanks", "thank you", "shukriya", "dhanyavad", "dhanyawad", "धन्यवाद", "शुक्रिया", "આભાર"]
HELP_WORDS = ["help", "madad", "kya kar sakti", "what can you do", "who are you", "tum kaun", "kaun ho",
              "मदद", "क्या कर सकती", "कौन हो", "મદદ", "શું કરી શકે", "કોણ છો"]
KHATA_NAME_STOPWORDS = {
    "me", "my", "the", "a", "an", "i", "you", "him", "her", "them", "us", "it", "this", "that", "his",
    "udhar", "udhaar", "khata", "account", "balance", "credit", "payment", "rupees", "rupee", "rs", "inr",
    "today", "now", "cash", "upi", "gpay", "phonepe", "paytm", "add", "how", "much", "who", "all",
    "everyone", "total", "check", "show", "pending", "received", "record", "kitna", "kitne", "baaki",
    "baki", "hai", "write", "likho", "customer", "dues", "money", "please", "bhai", "bhaiya", "ji",
    "has", "have", "does", "did", "is", "was", "and", "for", "from", "to", "of", "in",
    "uska", "uski", "uske", "usko", "use", "unka", "unki", "unke", "unko", "iska", "iski", "isko", "aur",
    "his", "her", "him", "them", "same", "saboot", "sabut", "proof", "recording", "hisaab", "hisab", "galti",
}


def _contains_any(lower: str, raw: str, words: list[str]) -> bool:
    """Word-boundary match for Latin phrases (so 'mile' doesn't hit 'smile'), substring match for Indic scripts."""
    for w in words:
        if w.isascii():
            if re.search(rf"(?<![a-z]){re.escape(w)}(?![a-z])", lower):
                return True
        elif w in raw:
            return True
    return False


class NLPParser:
    """
    Multilingual Intent and Entity Extraction Engine for Indian Small Businesses.
    Designed for English, Hindi (हिन्दी / Hinglish), and Gujarati (ગુજરાતી / Gujlish).
    Works in pure zero-key offline deterministic mock mode.
    """

    @classmethod
    def parse(cls, transcript: str, language: str = "en-IN") -> dict[str, Any]:
        text = transcript.strip()
        lower = text.lower()

        # 1. Detect Intent
        intent = cls._detect_intent(lower, text)
        if intent in ("play_proof", "undo_last", "greet", "thanks", "help"):
            name = cls.extract_khata_name(text) if intent == "play_proof" else None
            return {"intent": intent, "extracted_data": {"customer_name": name} if name else {},
                    "confirmation_required": False, "confirmation_prompt": "", "spoken_response": ""}

        # 2. Extract Entities according to intent
        if intent == "create_order":
            extracted_data, prompt, spoken = cls._extract_order_entities(text, lower, language)
            confirmation_required = not extracted_data.get("missing")
        elif intent == "create_reminder":
            extracted_data, prompt, spoken = cls._extract_reminder_entities(text, lower, language)
            confirmation_required = True
        elif intent == "add_customer":
            extracted_data, prompt, spoken = cls._extract_customer_entities(text, lower, language)
            confirmation_required = True
        elif intent in ("add_udhar", "record_payment"):
            extracted_data, prompt, spoken = cls._extract_khata_entry_entities(text, lower, language, intent)
            confirmation_required = not extracted_data.get("missing")
        elif intent == "check_balance":
            name = cls.extract_khata_name(text)
            extracted_data = {"customer_name": name} if name else {"missing": ["customer_name"]}
            confirmation_required = False
            prompt = ""
            spoken = "" if name else cls._ask_for_name(language)
        elif intent == "list_dues":
            extracted_data = {"scope": "all"}
            confirmation_required = False
            prompt = ""
            spoken = ""
        elif intent == "list_orders":
            extracted_data = {"filter": "pending" if ("pending" in lower or "बाकी" in text or "બાકી" in text) else "all"}
            confirmation_required = False
            prompt = ""
            spoken = cls._get_query_spoken(intent, language, extracted_data)
        elif intent == "list_customers":
            extracted_data = {"filter": "recent"}
            confirmation_required = False
            prompt = ""
            spoken = cls._get_query_spoken(intent, language, extracted_data)
        elif intent == "show_business_summary":
            extracted_data = {"scope": "today"}
            confirmation_required = False
            prompt = ""
            spoken = cls._get_query_spoken(intent, language, extracted_data)
        else:
            intent = "unknown"
            extracted_data = {}
            confirmation_required = False
            prompt = ""
            spoken = cls._get_query_spoken("unknown", language, extracted_data)

        return {
            "intent": intent,
            "extracted_data": extracted_data,
            "confirmation_required": confirmation_required,
            "confirmation_prompt": prompt,
            "spoken_response": spoken,
        }

    @classmethod
    def detect_intent(cls, text: str) -> str:
        text = text.strip()
        return cls._detect_intent(text.lower(), text)

    @classmethod
    def _detect_intent(cls, lower: str, raw: str) -> str:
        # Voice proof and undo are specific enough to win over everything else
        if _contains_any(lower, raw, PROOF_WORDS):
            return "play_proof"
        if _contains_any(lower, raw, UNDO_WORDS):
            return "undo_last"
        # Check Order Creation
        if any(w in lower for w in ["add order", "create order", "add an order", "new order", "save order", "order for", "order likho", "order add karo"]):
            return "create_order"
        if any(w in raw for w in ["ऑर्डर जोड़ो", "ऑर्डर लिखो", "ऑर्डर बनाओ", "का ऑर्डर", "ઓર્ડર ઉમેરો", "ઓર્ડર લખો", "ઓર્ડર કરો", "નો ઓર્ડર"]):
            return "create_order"

        # Check Reminder Creation
        if any(w in lower for w in ["remind me", "add reminder", "set reminder", "call reminder", "reminder dalo", "yaad dilao"]):
            return "create_reminder"
        if any(w in raw for w in ["रिमाइंडर", "याद दिलाना", "याद दिलाओ", "યાદ અપાવો", "રિમાઇન્ડર", "કોલ કરવાનું યાદ"]):
            return "create_reminder"

        # Check Khata / Udhar (credit ledger)
        khata_intent = cls._detect_khata_intent(lower, raw)
        if khata_intent:
            return khata_intent

        if ("shirts" in lower or "sarees" in lower or "kurtis" in lower or "jeans" in lower) and ("total" in lower or "rupees" in lower or "₹" in raw or "रुपये" in raw or "રૂપિયા" in raw):
            return "create_order"

        # Check Customer Creation
        if any(w in lower for w in ["add customer", "new customer", "create customer", "grahak add karo", "nava grahak"]):
            return "add_customer"
        if any(w in raw for w in ["नया ग्राहक", "ग्राहक जोड़ो", "નવા ગ્રાહક", "ગ્રાહક ઉમેરો"]):
            return "add_customer"

        # Check List Orders
        if any(w in lower for w in ["pending orders", "show orders", "list orders", "order status", "pending inquiries", "kitne order"]):
            return "list_orders"
        if any(w in raw for w in ["ऑर्डर दिखाओ", "पेंडिंग ऑर्डर", "બાકી ઓર્ડર", "ઓર્ડર બતાવો"]):
            return "list_orders"

        # Check List Customers
        if any(w in lower for w in ["show customers", "list customers", "recent customers", "my customers"]):
            return "list_customers"
        if any(w in raw for w in ["ग्राहक दिखाओ", "गिराक दिखाओ", "ગ્રાહકો બતાવો"]):
            return "list_customers"

        # Check Business Summary
        if any(w in lower for w in ["business summary", "total sales", "revenue", "how many orders", "sales summary", "today's summary", "aaj ka vyapar"]):
            return "show_business_summary"
        if _contains_any(lower, raw, ["sell", "sold", "sales", "bikri", "becha", "kitna becha", "बिक्री", "बेचा", "વેચાણ", "વેચ્યું"]):
            return "show_business_summary"
        if any(w in raw for w in ["आज का व्यापार", "समरी", "કુલ વેચાણ", "આજનો વેપાર"]):
            return "show_business_summary"
        if _contains_any(lower, raw, ["hisaab", "hisab", "हिसाब", "હિસાબ", "closing", "day summary", "aaj ka report"]):
            return "show_business_summary"

        # Small talk last, so "namaste, Rahul ko 500 udhar likho" is still an udhar entry
        if _contains_any(lower, raw, HELP_WORDS):
            return "help"
        if _contains_any(lower, raw, THANKS_WORDS):
            return "thanks"
        if _contains_any(lower, raw, GREET_WORDS):
            return "greet"
        return "unknown"

    @classmethod
    def _extract_order_entities(cls, raw: str, lower: str, lang: str) -> Tuple[dict, str, str]:
        # Extract Customer Name (None -> the agent asks "for which customer?")
        customer_name = None
        # Patterns for customer name
        name_patterns = [
            r"(?:order for|add an order for|order of|customer)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)",
            r"(?:for)\s+([A-Za-z]+)",
            r"([A-Za-z]+)\s+(?:mate|ke liye)",
            r"([A-Za-z]+)\s+નો\s+ઓર્ડર",
            r"([A-Za-z]+)\s+के\s+लिए",
            r"([^\s,]+)\s*(?:માટે|के लिए)",
        ]
        for pat in name_patterns:
            m = re.search(pat, raw, re.IGNORECASE)
            if m:
                found_name = m.group(1).strip()
                if found_name.lower() not in ["an", "a", "the", "new", "me", "order"]:
                    customer_name = found_name.capitalize()
                    break

        # Extract Total Amount
        total_amount = None
        amt_match = re.search(r"(?:₹|rs\.?|inr|total|amount|for|કુલ|રૂપિયા|रुपये|rupees)\s*[:=]?\s*([0-9]+(?:,[0-9]+)*)", raw, re.IGNORECASE)
        if not amt_match:
            amt_match = re.search(r"([0-9]+(?:,[0-9]+)*)\s*(?:rupees|rs|rupiya|रुपये|રૂપિયા|/-)", raw, re.IGNORECASE)
        if amt_match:
            try:
                total_amount = float(amt_match.group(1).replace(",", ""))
            except ValueError:
                total_amount = None

        # Extract Quantity
        quantity = 1
        qty_match = re.search(r"(\b\d+\b)\s*(?:shirts|pieces|pcs|sarees|kurtis|jeans|units|t-shirts|meter|items|શર્ટ|સાડી|कुर्ती|शर्ट्स)", raw, re.IGNORECASE)
        if qty_match:
            try:
                quantity = int(qty_match.group(1))
            except ValueError:
                quantity = 1
        else:
            # check standalone numbers
            nums = re.findall(r"\b(\d+)\b", raw)
            for n in nums:
                val = int(n)
                if (total_amount is None or val != int(total_amount)) and val <= 1000:
                    quantity = val
                    break

        # Extract Product Name
        product_name = "Items"
        product_keywords = {
            "shirts": "Cotton Shirts",
            "shirt": "Cotton Shirts",
            "sarees": "Designer Sarees",
            "saree": "Designer Sarees",
            "kurtis": "Embroidered Kurtis",
            "kurti": "Embroidered Kurtis",
            "jeans": "Denim Jeans",
            "t-shirts": "Polo T-Shirts",
            "pants": "Formal Pants",
            "dress": "Dress Material",
            "dupatta": "Silk Dupatta",
            "bedsheet": "Cotton Bedsheets",
            "bedsheets": "Cotton Bedsheets",
            "fabric": "Textile Fabric",
            "શર્ટ": "કોટન શર્ટ",
            "સાડી": "ડિઝાઇનર સાડી",
            "कुर्ती": "कॉटन कुर्ती",
            "शर्ट्स": "शर्ट्स",
        }
        matched_product = False
        for kw, clean_name in product_keywords.items():
            if kw in lower or kw in raw:
                product_name = clean_name
                matched_product = True
                break

        # Dynamic fallback: if quantity was followed by a word, use that as product
        if not matched_product:
            dyn_match = re.search(r"\b\d+\b\s+([A-Za-z]+)", raw)
            if dyn_match:
                candidate = dyn_match.group(1).capitalize()
                if candidate.lower() not in ["rupees", "rs", "inr", "for", "total", "at", "to"]:
                    product_name = candidate

        payment_mode = "udhar" if _contains_any(lower, raw, ["udhar", "udhaar", "on credit", "khate me", "khate mein", "baaki", "उधार", "ઉધાર"]) else "paid"

        extracted_data = {
            "customer_name": customer_name,
            "product_name": product_name,
            "quantity": quantity,
            "total_amount": total_amount,
            "payment_mode": payment_mode,
        }

        missing = [k for k in ("customer_name", "total_amount") if not extracted_data.get(k)]
        if missing:
            extracted_data["missing"] = missing
            return extracted_data, "", ""
        prompt = cls.order_prompt(extracted_data, lang)
        spoken = prompt
        return extracted_data, prompt, spoken

    @staticmethod
    def order_prompt(data: dict, lang: str) -> str:
        from app.services.replies import money
        name, qty, product = data["customer_name"], data.get("quantity", 1), data.get("product_name", "Items")
        amt = money(float(data["total_amount"]))
        udhar = data.get("payment_mode") == "udhar"
        if "gu" in lang:
            return f"{name} માટે {qty} {product}, કુલ {amt}{' ઉધાર પર' if udhar else ''}. ઓર્ડર સેવ કરી દઉં?"
        if "hi" in lang:
            return f"{name} के लिए {qty} {product}, कुल {amt}{' उधार पर' if udhar else ''}। ऑर्डर सेव कर दूँ?"
        return f"Order for {name}: {qty} {product}, total {amt}{' on udhar' if udhar else ''}. Shall I save it?"

    @classmethod
    def _extract_reminder_entities(cls, raw: str, lower: str, lang: str) -> Tuple[dict, str, str]:
        # Customer in reminder
        customer_name = "Rahul Sharma"
        reminder_verbs = {"call", "meet", "contact", "collect", "send", "check", "get", "take", "pay",
                          "remind", "follow", "ask", "verify", "dispatch", "deliver", "me", "a", "the", "my"}
        for pat in (r"(?:call|meet|contact|રાહુલને|राहुल को)\s+([A-Za-z]+)", r"(?:from|with|to)\s+([A-Za-z]+)"):
            found = None
            for name_match in re.finditer(pat, raw, re.IGNORECASE):
                matched = name_match.group(1).capitalize()
                if matched.lower() not in reminder_verbs:
                    found = matched
                    break
            if found:
                customer_name = found
                break

        # Date
        today = datetime.now()
        reminder_date = today.strftime("%Y-%m-%d")
        if "tomorrow" in lower or "kal" in lower or "કાલે" in raw or "कल" in raw:
            reminder_date = (today + timedelta(days=1)).strftime("%Y-%m-%d")

        # Time
        reminder_time = "11:00 AM"
        time_match = re.search(r"(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje|વાગ્યે|बजे))", raw, re.IGNORECASE)
        if time_match:
            raw_time = time_match.group(1).upper()
            if ":" not in raw_time and ("AM" in raw_time or "PM" in raw_time):
                raw_time = re.sub(r"(\d+)\s*(AM|PM)", r"\1:00 \2", raw_time)
            reminder_time = raw_time
        elif "11" in raw:
            reminder_time = "11:00 AM"
        elif "4" in raw or "चार" in raw:
            reminder_time = "04:00 PM"

        title = f"Call {customer_name}"
        if "payment" in lower or "પૈસા" in raw or "पेमेंट" in raw:
            title = f"Payment follow-up with {customer_name}"
        elif "dispatch" in lower or "ઓર્ડર" in raw:
            title = f"Order dispatch verification with {customer_name}"

        extracted_data = {
            "customer_name": customer_name,
            "title": title,
            "reminder_date": reminder_date,
            "reminder_time": reminder_time,
        }

        if "gu" in lang:
            prompt = f"રિમાઇન્ડર સેટ કરો: '{title}', તારીખ {reminder_date} અને સમય {reminder_time}. શું હું આ સેવ કરું?"
            spoken = f"{title} માટે રિમાઇન્ડર સેટ કરું?"
        elif "hi" in lang:
            prompt = f"रिमाइंडर सेट करें: '{title}', तारीख {reminder_date} समय {reminder_time} बजे। क्या मैं इसे सेव करूँ?"
            spoken = f"{title} के लिए रिमाइंडर सेव करूँ?"
        else:
            prompt = f"Set reminder: '{title}' on {reminder_date} at {reminder_time}. Should I confirm?"
            spoken = f"Set reminder to {title} at {reminder_time}. Should I save it?"

        return extracted_data, prompt, spoken

    @classmethod
    def _extract_customer_entities(cls, raw: str, lower: str, lang: str) -> Tuple[dict, str, str]:
        # Customer name
        name = "Amit Shah"
        m_name = re.search(r"(?:customer|grahak|ग्राहक|ગ્રાહક)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)", raw, re.IGNORECASE)
        if m_name:
            name = m_name.group(1).title()

        # Phone
        phone = "+91 98981 23456"
        m_phone = re.search(r"(\+?\d{10,12})", raw.replace(" ", ""))
        if m_phone:
            p = m_phone.group(1)
            if len(p) == 10:
                phone = f"+91 {p[:5]} {p[5:]}"
            else:
                phone = p

        extracted_data = {
            "name": name,
            "phone": phone,
            "business_notes": "Added via Voice Assistant",
        }

        if "gu" in lang:
            prompt = f"નવા ગ્રાહક '{name}' (ફોન: {phone}) ઉમેરો. શું હું સેવ કરું?"
            spoken = f"નવા ગ્રાહક {name} ઉમેરવા છે?"
        elif "hi" in lang:
            prompt = f"नया ग्राहक '{name}' (फ़ोन: {phone}) जोड़ें। क्या मैं इसे सेव करूँ?"
            spoken = f"नया ग्राहक {name} जोड़ना है?"
        else:
            prompt = f"Add new customer '{name}' with phone {phone}. Should I save this customer?"
            spoken = f"Add new customer {name} with phone {phone}. Should I save?"

        return extracted_data, prompt, spoken

    # ------------------------------------------------------------------ khata
    @classmethod
    def _detect_khata_intent(cls, lower: str, raw: str):
        has_amount = cls.extract_amount(raw) is not None
        asks_how_much = _contains_any(lower, raw, ["how much", "kitna", "kitne", "कितना", "कितने", "કેટલા", "કેટલું"])
        is_payment = _contains_any(lower, raw, KHATA_PAYMENT_WORDS)
        is_credit = _contains_any(lower, raw, KHATA_CREDIT_WORDS)
        if _contains_any(lower, raw, KHATA_GIVE_WORDS) and not (is_payment or is_credit):
            gu_recipient = any(t.endswith("ને") and t not in ("એને", "તેને", "મને") for t in raw.split())
            if _contains_any(lower, raw, KHATA_RECIPIENT_MARKERS) or gu_recipient or "gave to" in lower:
                is_credit = True
            else:
                is_payment = True

        if _contains_any(lower, raw, KHATA_LIST_DUES_WORDS):
            return "list_dues"
        if not has_amount and (_contains_any(lower, raw, KHATA_BALANCE_WORDS) or (asks_how_much and (is_payment or is_credit))):
            return "check_balance"
        if is_payment and not asks_how_much:
            return "record_payment"
        if is_credit and not asks_how_much:
            return "add_udhar"
        return None

    @staticmethod
    def extract_amount(raw: str):
        """First money-like number in the sentence, understanding '5k', '5 thousand', '2 lakh', '15 हजार'."""
        for m in re.finditer(r"(\d[\d,]*(?:\.\d+)?)\s*(k\b|thousand|hazaar|hazar|हजार|हज़ार|હજાર|lakh|lac|लाख|લાખ)?", raw, re.IGNORECASE):
            digits = m.group(1).replace(",", "")
            if len(digits.split(".")[0]) >= 10:  # phone number, not money
                continue
            try:
                value = float(digits)
            except ValueError:
                continue
            unit = (m.group(2) or "").lower()
            if unit in ("k", "thousand", "hazaar", "hazar", "हजार", "हज़ार", "હજાર"):
                value *= 1000
            elif unit in ("lakh", "lac", "लाख", "લાખ"):
                value *= 100000
            if value > 0:
                return value
        return None

    @staticmethod
    def extract_khata_name(raw: str):
        patterns = [
            r"([A-Za-z]+)['’]s\b",                                                   # Rahul's udhar
            r"\b(?:does|did|has|is)\s+([A-Za-z]+)\s+(?:owe|pay|paid|have|has)",      # does Rahul owe
            r"\b(?:from|to|for|of)\s+([A-Za-z]+)",                                   # received from Priya
            r"\b([A-Za-z]+)\s+(?:has\s+paid|paid|gave|owes|returned|cleared|ne|ko|ka|ki|ke|se|jama)\b",  # Rahul paid / Rahul ko
            r"(\S+)\s+(?:का|की|के|को|ने|से)(?:\s|$)",                                 # राहुल का
            r"(\S+?)\s*(?:ના|ની|નો|ને|એ|પાસે)(?:\s|$)",                               # રાહુલ ના
            r"^\s*([A-Za-z]+)\b",                                                    # Rahul 3000 jama
        ]
        for pat in patterns:
            for m in re.finditer(pat, raw, re.IGNORECASE):
                cand = m.group(1).strip(" ,.?!।")
                if not cand or any(ch.isdigit() for ch in cand) or cand.lower() in KHATA_NAME_STOPWORDS or len(cand) < 2:
                    continue
                if cand in NAME_ALIASES:
                    return NAME_ALIASES[cand]
                if cand.isascii():
                    return cand.capitalize()
                return cand
        return None

    @classmethod
    def _ask_for_name(cls, lang: str) -> str:
        if "gu" in lang:
            return "કયા ગ્રાહકનું ખાતું? કૃપા કરીને નામ બોલો."
        if "hi" in lang:
            return "किस ग्राहक का खाता? कृपया नाम बोलिए।"
        return "Whose khata should I use? Please say the customer's name."

    @classmethod
    def _extract_khata_entry_entities(cls, raw: str, lower: str, lang: str, intent: str) -> Tuple[dict, str, str]:
        name = cls.extract_khata_name(raw)
        amount = cls.extract_amount(raw)
        missing = []
        if not name:
            missing.append("customer_name")
        if amount is None:
            missing.append("amount")

        data: dict[str, Any] = {
            "customer_name": name,
            "amount": amount,
            "entry_type": "credit" if intent == "add_udhar" else "payment",
            "note": raw.strip()[:140],
        }
        if missing:
            data["missing"] = missing
            if "customer_name" in missing:
                spoken = cls._ask_for_name(lang)
            elif "gu" in lang:
                spoken = f"{name} માટે કેટલા રૂપિયા લખું?"
            elif "hi" in lang:
                spoken = f"{name} के लिए कितने रुपये लिखूँ?"
            else:
                spoken = f"How much should I write for {name}? Please say the amount too."
            return data, "", spoken

        # Basic prompt; BusinessService.enrich_khata() rewrites it with the live balance.
        if intent == "add_udhar":
            prompt = f"Add ₹{amount:,.0f} udhar to {name}'s khata. Should I save it?"
        else:
            prompt = f"Record ₹{amount:,.0f} payment received from {name}. Should I save it?"
        return data, prompt, prompt

    @classmethod
    def _get_query_spoken(cls, intent: str, lang: str, data: dict) -> str:
        if intent == "list_orders":
            if "gu" in lang:
                return "તમારા બાકી ઓર્ડર્સ સ્ક્રીન પર જોઈ શકો છો."
            elif "hi" in lang:
                return "आपके पेंडिंग ऑर्डर्स स्क्रीन पर दिखाई दे रहे हैं।"
            return "Here are your current orders displayed on the screen."
        elif intent == "list_customers":
            if "gu" in lang:
                return "આ રહ્યા તમારા તાજેતરના ગ્રાહકો."
            elif "hi" in lang:
                return "ये रहे आपके हाल के ग्राहक।"
            return "Here is your customer list."
        elif intent == "show_business_summary":
            if "gu" in lang:
                return "આજના વ્યાપારનો સારાંશ અને આંકડા ડેશબોર્ડ પર અપડેટ થઈ ગયા છે."
            elif "hi" in lang:
                return "आज का व्यापार सारांश और आंकड़े डैशबोर्ड पर उपलब्ध हैं।"
            return "Here is your business summary with revenue and pending orders."
        else:
            if "gu" in lang:
                return "માફ કરશો, હું સમજી શક્યો નથી. કૃપા કરીને ઓર્ડર, રિમાઇન્ડર અથવા ગ્રાહક ઉમેરવા માટે બોલો."
            elif "hi" in lang:
                return "माफ़ कीजिए, मैं समझ नहीं पाया। कृपया ऑर्डर, रिमाइंडर या ग्राहक जोड़ने के लिए बोलें।"
            return "Sorry, I didn't catch that clearly. You can say 'Add an order for Rahul' or 'Show pending orders'."
