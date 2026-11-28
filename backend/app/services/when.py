"""
"When should I remind you?" in English, Hinglish, Hindi and Gujarati (no keys, no models).

  "in 2 minutes" / "10 मिनट बाद" / "દસ મિનિટ પછી"      -> now + 10 min
  "kal subah 10 baje" / "कल सुबह 10 बजे" / "કાલે સવારે 10 વાગ્યે" -> tomorrow 10:00
  "aaj shaam 5 baje" / "at 5" / "5 pm"                -> today 17:00
  nothing said                                         -> in one hour (today) or 10:00 (another day)
"""
import math
import re
from datetime import datetime, timedelta

_MIN = r"(?:minutes?|mins?|मिनट|મિનિટ)"
_HOUR = r"(?:ghante|ghanta|ghantey|hours?|hrs?|घंटे|घंटा|કલાક)"
_MORNING = ["subah", "savere", "morning", "सुबह", "सवेरे", "સવારે", "સવારના"]
_PM_WORDS = ["dopahar", "afternoon", "shaam", "sham", "evening", "raat", "night", "tonight",
             "दोपहर", "शाम", "रात", "બપોરે", "સાંજે", "રાત્રે"]
_TOMORROW = ["tomorrow", "kal", "कल", "કાલે", "કાલ"]
_DAY_AFTER = ["day after tomorrow", "parso", "parson", "परसों", "પરમદિવસે", "પરમ દિવસે"]


def _has(lower: str, raw: str, words: list[str]) -> bool:
    for w in words:
        if w.isascii():
            if re.search(rf"(?<![a-z]){re.escape(w)}(?![a-z])", lower):
                return True
        elif w in raw:
            return True
    return False


def parse_when(text: str, now: datetime | None = None) -> datetime:
    now = now or datetime.now().replace(second=0, microsecond=0)
    lower = text.lower()

    m = re.search(rf"(\d+(?:\.\d+)?)\s*{_MIN}", lower)
    if m:
        return now + timedelta(minutes=float(m.group(1)))
    m = re.search(rf"(\d+(?:\.\d+)?)\s*{_HOUR}", lower)
    if m:
        return now + timedelta(hours=float(m.group(1)))

    offset = 2 if _has(lower, text, _DAY_AFTER) else 1 if _has(lower, text, _TOMORROW) else 0

    hour = minute = None
    explicit = None
    m = re.search(r"(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?|baje|bje|बजे|વાગ્યે|વાગે|o'?clock)", lower)
    if not m:
        m = re.search(r"\bat\s+(\d{1,2})(?:[:.](\d{2}))?\b", lower)
    if m:
        hour, minute = int(m.group(1)), int(m.group(2) or 0)
        suffix = (m.group(3) if m.lastindex and m.lastindex >= 3 else "") or ""
        if suffix.startswith("a"):
            explicit = "am"
        elif suffix.startswith("p"):
            explicit = "pm"

    if hour is not None and 0 <= hour <= 23 and 0 <= minute <= 59:
        if explicit == "pm" and hour < 12:
            hour += 12
        elif explicit == "am" and hour == 12:
            hour = 0
        elif explicit is None and hour < 12:
            if _has(lower, text, _PM_WORDS):
                hour += 12
            elif not _has(lower, text, _MORNING) and 1 <= hour <= 7:
                hour += 12  # "5 baje" at a shop means 5 in the evening
        due = (now + timedelta(days=offset)).replace(hour=hour, minute=minute)
        if offset == 0 and due <= now:
            due += timedelta(days=1)  # "at 9" said at 6 pm -> tomorrow 9
        return due

    if offset:
        base = (now + timedelta(days=offset)).replace(hour=10, minute=0)
        if _has(lower, text, _PM_WORDS):
            base = base.replace(hour=17)
        return base
    # Nothing said: in an hour, rounded up to 5 minutes
    later = now + timedelta(hours=1)
    return later.replace(minute=0) + timedelta(minutes=5 * math.ceil(later.minute / 5))


def to_fields(due: datetime) -> dict:
    return {
        "reminder_date": due.strftime("%Y-%m-%d"),
        "reminder_time": due.strftime("%I:%M %p"),
        "due_at": due.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def human_when(due: datetime, language: str = "en-IN", now: datetime | None = None) -> str:
    """'in 2 minutes' / 'today at 5:00 PM' / 'कल सुबह 10:00 बजे' / 'આવતીકાલે 10:00 વાગ્યે'."""
    now = now or datetime.now()
    lang = (language or "en")[:2]
    mins = round((due - now).total_seconds() / 60)
    clock = due.strftime("%I:%M").lstrip("0")
    ampm = due.strftime("%p")
    day = (due.date() - now.date()).days
    if 0 < mins < 60:
        return {"hi": f"{mins} मिनट में", "gu": f"{mins} મિનિટમાં"}.get(lang, f"in {mins} minute{'s' if mins != 1 else ''}")
    if lang == "hi":
        part = "सुबह" if due.hour < 12 else "दोपहर" if due.hour < 16 else "शाम" if due.hour < 20 else "रात"
        d = "आज" if day == 0 else "कल" if day == 1 else due.strftime("%d-%m")
        return f"{d} {part} {clock} बजे"
    if lang == "gu":
        part = "સવારે" if due.hour < 12 else "બપોરે" if due.hour < 16 else "સાંજે" if due.hour < 20 else "રાત્રે"
        d = "આજે" if day == 0 else "આવતીકાલે" if day == 1 else due.strftime("%d-%m")
        return f"{d} {part} {clock} વાગ્યે"
    d = "today" if day == 0 else "tomorrow" if day == 1 else due.strftime("%d %b")
    return f"{d} at {clock} {ampm}"
