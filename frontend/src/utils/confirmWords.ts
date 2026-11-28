/**
 * Classifies a short spoken reply to "Should I save this?" as yes / no.
 * Recognition runs in en-IN, so Hindi and Gujarati replies usually arrive
 * romanised ("haan", "theek hai"); native-script forms are included too.
 */
const YES = [
  'yes', 'yeah', 'yep', 'yup', 'ya', 'yah', 'ok', 'okay', 'confirm', 'confirmed', 'save', 'save it',
  'correct', 'right', 'sure', 'done', 'go ahead', 'do it', 'perfect',
  'haan', 'han', 'haa', 'ha', 'haanji', 'haan ji', 'ji', 'ji haan', 'theek', 'thik', 'theek hai', 'thik hai',
  'sahi', 'sahi hai', 'kar do', 'kardo', 'karo', 'bilkul', 'chalega', 'ho gaya', 'barabar',
  'हाँ', 'हां', 'हा', 'जी', 'जी हाँ', 'ठीक', 'ठीक है', 'सही', 'सही है', 'कर दो', 'लिख दो', 'सेव करो', 'बिल्कुल', 'चलेगा',
  'બરાબર', 'હા', 'હાં', 'હા જી', 'ઠીક', 'ઠીક છે', 'સાચું', 'કરી દો', 'લખી દો', 'સેવ કરો', 'ચાલશે', 'હો',
  // English "yes / ok / confirm / save" as Hindi and Gujarati recognisers write them
  'यस', 'येस', 'ओके', 'ओक', 'कन्फर्म', 'सेव', 'श्योर', 'યસ', 'ઓકે', 'કન્ફર્મ', 'સેવ', 'શ્યોર',
];
const NO = [
  'no', 'nope', 'nah', 'cancel', 'stop', 'wrong', 'incorrect', 'dont', "don't", 'do not', 'not',
  'nahi', 'nahin', 'nai', 'mat', 'mat karo', 'galat', 'cancel karo', 'rehne do', 'rehne de',
  'नहीं', 'नही', 'मत', 'मत करो', 'गलत', 'रद्द', 'रहने दो', 'रुको',
  'ના', 'નહીં', 'નહિ', 'ખોટું', 'રદ', 'રહેવા દો', 'રોકો', 'નથી',
  // English "no / cancel / wrong" in Indic script
  'नो', 'कैंसल', 'केंसल', 'रॉन्ग', 'કેન્સલ', 'રોંગ',
];

function matches(text: string, words: string[]): boolean {
  const padded = ` ${text} `;
  return words.some((w) => {
    if (/^[\x00-\x7F]+$/.test(w)) {
      return new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`).test(text);
    }
    // Whole words only, so "રાહુલના" (Rahul's) never reads as "ના" (no)
    return padded.includes(` ${w} `);
  });
}

export function classifyConfirmation(raw: string): 'yes' | 'no' | null {
  const text = raw.toLowerCase().replace(/[.,!?।]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  // A bare "na" / "ना" is "no" only when it starts the reply ("kar do na" = "please do it")
  if (/^(na|naa|ना|ના)( |$)/.test(text)) return 'no';
  // "No" wins over "yes" so "no, that's not correct" never saves by accident.
  if (matches(text, NO)) return 'no';
  if (matches(text, YES)) return 'yes';
  return null;
}
