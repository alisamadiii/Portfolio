// Word-forms-aware phrase matching (Yoast Premium's "word forms", scoped down
// to a lightweight English suffix stemmer — no dictionaries, no dependencies).

// "bottles" → "bottle", "cities" → "city", "running" → "run", "hiked" → "hike"
// is out of reach ("hiked" → "hik"), but both sides get the same treatment so
// forms of the same word still collide on the same stem.
export const stem = (word: string): string => {
  let w = word.toLowerCase();
  if (w.endsWith("'s")) w = w.slice(0, -2);
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith("es")) {
    // "boxes"/"classes"/"dishes" → drop "es"; "bottles"/"cases" → drop "s"
    return /(?:x|ch|sh|z|ss)es$/.test(w) ? w.slice(0, -2) : w.slice(0, -1);
  }
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) {
    return w.slice(0, -1);
  }
  if (w.length > 5 && w.endsWith("ing")) return dedouble(w.slice(0, -3));
  if (w.length > 4 && w.endsWith("ed")) return dedouble(w.slice(0, -2));
  return w;
};

// "runn" → "run", "stopp" → "stop"
const dedouble = (w: string): string =>
  w.length > 2 && w[w.length - 1] === w[w.length - 2] && !/[aeiou]/.test(w[w.length - 1]!)
    ? w.slice(0, -1)
    : w;

export const tokenize = (text: string): string[] =>
  text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];

export const stems = (text: string): string[] => tokenize(text).map(stem);

// Exact phrase: the phrase's stems appear consecutively, in order.
export const phraseOccurrences = (
  textStems: string[],
  phraseStems: string[]
): number => {
  if (phraseStems.length === 0 || textStems.length < phraseStems.length)
    return 0;
  let count = 0;
  outer: for (let i = 0; i <= textStems.length - phraseStems.length; i++) {
    for (let j = 0; j < phraseStems.length; j++) {
      if (textStems[i + j] !== phraseStems[j]) continue outer;
    }
    count++;
  }
  return count;
};

export const containsPhrase = (text: string, phrase: string): boolean =>
  phraseOccurrences(stems(text), stems(phrase)) > 0;

// Partial match: every word of the phrase appears somewhere (any order).
export const containsAllWords = (text: string, phrase: string): boolean => {
  const haystack = new Set(stems(text));
  const needles = stems(phrase);
  return needles.length > 0 && needles.every((n) => haystack.has(n));
};
