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

        # 2. Extract Entities according to intent
        if intent == "create_order":
            extracted_data, prompt, spoken = cls._extract_order_entities(text, lower, language)
            confirmation_required = True
        elif intent == "create_reminder":
            extracted_data, prompt, spoken = cls._extract_reminder_entities(text, lower, language)
            confirmation_required = True
        elif intent == "add_customer":
            extracted_data, prompt, spoken = cls._extract_customer_entities(text, lower, language)
            confirmation_required = True
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
    def _detect_intent(cls, lower: str, raw: str) -> str:
        # Check Order Creation
        if any(w in lower for w in ["add order", "create order", "add an order", "new order", "save order", "order for", "order likho", "order add karo"]):
            return "create_order"
        if any(w in raw for w in ["ऑर्डर जोड़ो", "ऑर्डर लिखो", "ऑर्डर बनाओ", "का ऑर्डर", "ઓર્ડર ઉમેરો", "ઓર્ડર લખો", "ઓર્ડર કરો", "નો ઓર્ડર"]):
            return "create_order"
        if ("shirts" in lower or "sarees" in lower or "kurtis" in lower or "jeans" in lower) and ("total" in lower or "rupees" in lower or "₹" in raw or "रुपये" in raw or "રૂપિયા" in raw):
            return "create_order"

        # Check Reminder Creation
        if any(w in lower for w in ["remind me", "add reminder", "set reminder", "call reminder", "reminder dalo", "yaad dilao"]):
            return "create_reminder"
        if any(w in raw for w in ["रिमाइंडर", "याद दिलाना", "याद दिलाओ", "યાદ અપાવો", "રિમાઇન્ડર", "કોલ કરવાનું યાદ"]):
            return "create_reminder"

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
        if any(w in raw for w in ["आज का व्यापार", "समरी", "કુલ વેચાણ", "આજનો વેપાર"]):
            return "show_business_summary"

        return "unknown"

    @classmethod
    def _extract_order_entities(cls, raw: str, lower: str, lang: str) -> Tuple[dict, str, str]:
        # Extract Customer Name
        customer_name = "Rahul Sharma"
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
                if found_name.lower() not in ["an", "a", "the", "new", "me"]:
                    customer_name = found_name.capitalize()
                    break

        # Extract Total Amount
        total_amount = 15000.0
        amt_match = re.search(r"(?:₹|rs\.?|inr|total|amount|for|કુલ|રૂપિયા|रुपये|rupees)\s*[:=]?\s*([0-9]+(?:,[0-9]+)*)", raw, re.IGNORECASE)
        if not amt_match:
            amt_match = re.search(r"([0-9]+(?:,[0-9]+)*)\s*(?:rupees|rs|rupiya|रुपये|રૂપિયા|/-)", raw, re.IGNORECASE)
        if amt_match:
            try:
                total_amount = float(amt_match.group(1).replace(",", ""))
            except ValueError:
                total_amount = 15000.0

        # Extract Quantity
        quantity = 20
        qty_match = re.search(r"(\b\d+\b)\s*(?:shirts|pieces|pcs|sarees|kurtis|jeans|units|t-shirts|meter|items|શર્ટ|સાડી|कुर्ती|शर्ट्स)", raw, re.IGNORECASE)
        if qty_match:
            try:
                quantity = int(qty_match.group(1))
            except ValueError:
                quantity = 20
        else:
            # check standalone numbers
            nums = re.findall(r"\b(\d+)\b", raw)
            for n in nums:
                val = int(n)
                if val != int(total_amount) and val <= 1000:
                    quantity = val
                    break

        # Extract Product Name
        product_name = "Cotton Shirts"
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

        extracted_data = {
            "customer_name": customer_name,
            "product_name": product_name,
            "quantity": quantity,
            "total_amount": total_amount,
        }

        # Formulate confirmation prompts & spoken confirmations
        if "gu" in lang:
            prompt = f"તમે {customer_name} માટે ₹{total_amount:,.0f} માં {quantity} {product_name} નો ઓર્ડર ઉમેરવા માંગો છો. શું હું આ ઓર્ડર સેવ કરું?"
            spoken = f"{customer_name} માટે {quantity} {product_name} નો ઓર્ડર સેવ કરવો છે?"
        elif "hi" in lang:
            prompt = f"आप {customer_name} के लिए ₹{total_amount:,.0f} में {quantity} {product_name} का ऑर्डर जोड़ना चाहते हैं। क्या मैं इसे सेव करूँ?"
            spoken = f"{customer_name} के लिए {quantity} {product_name} का ऑर्डर सेव करूँ?"
        else:
            prompt = f"You want to add an order of {quantity} {product_name} for {customer_name} for ₹{total_amount:,.0f}. Should I save this order?"
            spoken = f"You want to add {quantity} {product_name} for {customer_name} for rupees {int(total_amount)}. Should I save this order?"

        return extracted_data, prompt, spoken

    @classmethod
    def _extract_reminder_entities(cls, raw: str, lower: str, lang: str) -> Tuple[dict, str, str]:
        # Customer in reminder
        customer_name = "Rahul Sharma"
        name_match = re.search(r"(?:call|meet|contact|રાહુલને|राहुल को)\s+([A-Za-z]+)", raw, re.IGNORECASE)
        if not name_match:
            name_match = re.search(r"(?:to)\s+([A-Za-z]+)", raw, re.IGNORECASE)
        if name_match:
            matched = name_match.group(1).capitalize()
            if matched.lower() not in ["call", "meet", "contact", "me", "a", "the"]:
                customer_name = matched

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
