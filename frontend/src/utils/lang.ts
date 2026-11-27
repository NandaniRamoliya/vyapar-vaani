import { LanguageCode } from '../types';

export interface LangPack {
  code: LanguageCode;
  short: string; // button label
  name: string;
  rupees: string; // how TTS should say "₹"
  ui: {
    ready: string;
    tapToTalk: string;
    listening: string;
    thinking: string;
    speaking: string;
    sayYesNo: string;
    typeHere: string;
    typeYesNo: string;
    yesSave: string;
    cancel: string;
    orSay: string;
    recordVoice: string;
    recording: string;
    stop: string;
    skip: string;
    signed: string;
    signHint: string;
    signTitle: string;
    balanceDue: string;
    settled: string;
    advance: string;
    sendReminder: string;
    sendReceipt: string;
    shareProof: string;
    openKhata: string;
    undoOrder: string;
    sendBill: string;
    outstanding: string;
    todayHisaab: string;
    sales: string;
    collected: string;
    udharGiven: string;
    chaseTomorrow: string;
    proofTitle: string;
    welcome: string;
    handsFree: string;
    micBlocked: string;
  };
  chips: { label: string; text: string }[];
}

export const LANGS: Record<LanguageCode, LangPack> = {
  'en-IN': {
    code: 'en-IN',
    short: 'EN',
    name: 'English',
    rupees: 'rupees',
    ui: {
      ready: 'Ready',
      tapToTalk: 'Tap and speak',
      listening: 'Listening…',
      thinking: 'Thinking…',
      speaking: 'Speaking…',
      sayYesNo: 'Say “Yes” or “No”',
      typeHere: 'Type here: Rahul ko 5000 udhar likho',
      typeYesNo: 'Type “yes” to save or “no” to cancel',
      yesSave: 'Yes, save',
      cancel: 'Cancel',
      orSay: 'or just say “Yes” / “Haan”',
      recordVoice: 'Record customer’s voice',
      recording: 'Recording customer…',
      stop: 'Stop',
      skip: 'Skip',
      signed: 'Voice-signed',
      signHint: 'Ask the customer to say:',
      signTitle: 'Customer voice signature',
      balanceDue: 'Balance due',
      settled: 'Settled',
      advance: 'Advance',
      sendReminder: 'WhatsApp reminder',
      sendReceipt: 'WhatsApp receipt',
      shareProof: 'Share voice proof',
      openKhata: 'Open khata',
      undoOrder: 'Undo this order',
      sendBill: 'Send bill on WhatsApp',
      outstanding: 'Udhar outstanding',
      todayHisaab: 'Today’s hisaab',
      sales: 'Sales',
      collected: 'Collected',
      udharGiven: 'Udhar given',
      chaseTomorrow: 'Follow up tomorrow',
      proofTitle: 'Voice proof',
      welcome:
        'Namaste! I’m Vaani, your shop’s voice munim. Tap the mic and speak naturally, in English, Hindi or Gujarati. For udhar, the customer can confirm with their own voice.',
      handsFree: 'Hands-free',
      micBlocked: 'Microphone is blocked. Allow it from the lock icon in the address bar.',
    },
    chips: [
      { label: 'Rahul ko 5000 udhar', text: 'Rahul ko 5000 udhar likho' },
      { label: 'Rahul paid 3000', text: 'Rahul paid 3000' },
      { label: 'Who owes me?', text: 'Who owes me money?' },
      { label: 'Aaj ka hisaab', text: 'Aaj ka hisaab' },
      { label: 'Play Rahul’s proof', text: 'Rahul ka saboot sunao' },
      { label: 'Order on udhar', text: 'Add an order for Priya, 10 sarees, total 12000 rupees on udhar' },
      { label: 'Undo', text: 'galti ho gayi, hata do' },
    ],
  },
  'hi-IN': {
    code: 'hi-IN',
    short: 'हिं',
    name: 'हिन्दी',
    rupees: 'रुपये',
    ui: {
      ready: 'तैयार',
      tapToTalk: 'दबाइए और बोलिए',
      listening: 'सुन रही हूँ…',
      thinking: 'सोच रही हूँ…',
      speaking: 'बोल रही हूँ…',
      sayYesNo: '“हाँ” या “नहीं” बोलिए',
      typeHere: 'यहाँ लिखें: राहुल को 5000 उधार लिखो',
      typeYesNo: 'सेव करने के लिए “हाँ” लिखें',
      yesSave: 'हाँ, सेव करो',
      cancel: 'रद्द करें',
      orSay: 'या बस “हाँ” बोलिए',
      recordVoice: 'ग्राहक की आवाज़ रिकॉर्ड करें',
      recording: 'ग्राहक की आवाज़ रिकॉर्ड हो रही है…',
      stop: 'रोकें',
      skip: 'छोड़ें',
      signed: 'आवाज़ से पक्का',
      signHint: 'ग्राहक से बुलवाइए:',
      signTitle: 'ग्राहक की आवाज़-सही',
      balanceDue: 'बाकी',
      settled: 'खाता साफ़',
      advance: 'एडवांस',
      sendReminder: 'WhatsApp याद दिलाएँ',
      sendReceipt: 'WhatsApp रसीद',
      shareProof: 'आवाज़ का सबूत भेजें',
      openKhata: 'खाता खोलें',
      undoOrder: 'ऑर्डर हटाएँ',
      sendBill: 'WhatsApp पर बिल भेजें',
      outstanding: 'कुल उधार बाकी',
      todayHisaab: 'आज का हिसाब',
      sales: 'बिक्री',
      collected: 'वसूली',
      udharGiven: 'उधार दिया',
      chaseTomorrow: 'कल इनसे बात करें',
      proofTitle: 'आवाज़ का सबूत',
      welcome:
        'नमस्ते! मैं वाणी हूँ, आपकी दुकान की आवाज़ वाली मुनीम। माइक दबाइए और आराम से बोलिए। उधार पर ग्राहक अपनी आवाज़ से पक्का कर सकते हैं।',
      handsFree: 'बिना हाथ',
      micBlocked: 'माइक बंद है। एड्रेस बार के ताले वाले आइकन से अनुमति दें।',
    },
    chips: [
      { label: 'राहुल को 5000 उधार', text: 'राहुल को 5000 उधार लिखो' },
      { label: 'राहुल ने 3000 दिए', text: 'राहुल ने 3000 दिए' },
      { label: 'किसका कितना बाकी?', text: 'किसका कितना बाकी है?' },
      { label: 'आज का हिसाब', text: 'आज का हिसाब' },
      { label: 'राहुल का सबूत', text: 'राहुल का सबूत सुनाओ' },
      { label: 'गलती, हटा दो', text: 'गलती हो गई, हटा दो' },
    ],
  },
  'gu-IN': {
    code: 'gu-IN',
    short: 'ગુ',
    name: 'ગુજરાતી',
    rupees: 'રૂપિયા',
    ui: {
      ready: 'તૈયાર',
      tapToTalk: 'દબાવો અને બોલો',
      listening: 'સાંભળું છું…',
      thinking: 'વિચારું છું…',
      speaking: 'બોલું છું…',
      sayYesNo: '“હા” કે “ના” બોલો',
      typeHere: 'અહીં લખો: રાહુલને 5000 ઉધાર લખો',
      typeYesNo: 'સેવ કરવા “હા” લખો',
      yesSave: 'હા, સેવ કરો',
      cancel: 'રદ કરો',
      orSay: 'અથવા ફક્ત “હા” બોલો',
      recordVoice: 'ગ્રાહકનો અવાજ રેકોર્ડ કરો',
      recording: 'ગ્રાહકનો અવાજ રેકોર્ડ થાય છે…',
      stop: 'રોકો',
      skip: 'છોડો',
      signed: 'અવાજથી પાકું',
      signHint: 'ગ્રાહક પાસે બોલાવો:',
      signTitle: 'ગ્રાહકની અવાજ-સહી',
      balanceDue: 'બાકી',
      settled: 'ખાતું ચોખ્ખું',
      advance: 'એડવાન્સ',
      sendReminder: 'WhatsApp યાદ અપાવો',
      sendReceipt: 'WhatsApp રસીદ',
      shareProof: 'અવાજનો પુરાવો મોકલો',
      openKhata: 'ખાતું ખોલો',
      undoOrder: 'ઓર્ડર કાઢી નાખો',
      sendBill: 'WhatsApp પર બિલ મોકલો',
      outstanding: 'કુલ ઉધાર બાકી',
      todayHisaab: 'આજનો હિસાબ',
      sales: 'વેચાણ',
      collected: 'વસૂલી',
      udharGiven: 'ઉધાર આપ્યું',
      chaseTomorrow: 'કાલે આમની સાથે વાત કરો',
      proofTitle: 'અવાજનો પુરાવો',
      welcome:
        'નમસ્તે! હું વાણી છું, તમારી દુકાનની અવાજવાળી મુનીમ. માઇક દબાવો અને આરામથી બોલો. ઉધાર પર ગ્રાહક પોતાના અવાજથી પાકું કરી શકે છે.',
      handsFree: 'હાથ વગર',
      micBlocked: 'માઇક બંધ છે. એડ્રેસ બારના તાળાના આઇકનથી મંજૂરી આપો.',
    },
    chips: [
      { label: 'રાહુલને 5000 ઉધાર', text: 'રાહુલને 5000 ઉધાર લખો' },
      { label: 'રાહુલે 3000 આપ્યા', text: 'રાહુલે 3000 જમા કર્યા' },
      { label: 'કોના કેટલા બાકી?', text: 'કોના કેટલા બાકી છે?' },
      { label: 'આજનો હિસાબ', text: 'આજનો હિસાબ' },
      { label: 'રાહુલનો પુરાવો', text: 'રાહુલનો પુરાવો સંભળાવો' },
      { label: 'ભૂલ, કાઢી નાખો', text: 'ભૂલ થઈ ગઈ, કાઢી નાખો' },
    ],
  },
};

export const LANG_ORDER: LanguageCode[] = ['en-IN', 'hi-IN', 'gu-IN'];

/** "₹5,000" -> "5,000 रुपये" so each TTS voice says the currency in its own language. */
export function speakable(text: string, lang: LanguageCode): string {
  const word = LANGS[lang].rupees;
  return text
    .replace(/-₹\s*([0-9]+(?:,[0-9]+)*)/g, `minus $1 ${word}`)
    .replace(/₹\s*([0-9]+(?:,[0-9]+)*)/g, `$1 ${word}`)
    .replace(/•|·/g, ', ')
    .trim();
}

export function loadLanguage(): LanguageCode {
  try {
    const v = localStorage.getItem('vv_lang');
    if (v === 'en-IN' || v === 'hi-IN' || v === 'gu-IN') return v;
  } catch (_e) {
    /* storage unavailable */
  }
  return 'en-IN';
}

export function saveLanguage(lang: LanguageCode) {
  try {
    localStorage.setItem('vv_lang', lang);
  } catch (_e) {
    /* storage unavailable */
  }
}
