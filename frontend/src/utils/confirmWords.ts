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
  'हाँ', 'हां', 'जी', 'ठीक', 'सही', 'कर दो', 'બરાબર', 'હા', 'હાં', 'ઠીક', 'સાચું',
];
const NO = [
  'no', 'nope', 'nah', 'cancel', 'stop', 'wrong', 'incorrect', 'dont', "don't", 'do not', 'not',
  'nahi', 'nahin', 'nai', 'na', 'mat', 'mat karo', 'galat', 'cancel karo', 'rehne do', 'rehne de',
  'नहीं', 'नही', 'मत', 'गलत', 'ના', 'નહીં', 'ખોટું',
];

function matches(text: string, words: string[]): boolean {
  return words.some((w) => {
    if (/^[\x00-\x7F]+$/.test(w)) {
      return new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`).test(text);
    }
    return text.includes(w);
  });
}

export function classifyConfirmation(raw: string): 'yes' | 'no' | null {
  const text = raw.toLowerCase().replace(/[.,!?।]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  // "No" wins over "yes" so "no, that's not correct" never saves by accident.
  if (matches(text, NO)) return 'no';
  if (matches(text, YES)) return 'yes';
  return null;
}
