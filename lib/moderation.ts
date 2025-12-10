// Lightweight client-side moderation helpers
// Provides a small curated blocklist and functions to detect blocked words

const DEFAULT_BLOCKED_WORDS = [
  // Example offensive/prohibited words (curate for your locale/legal needs)
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "nigger",
  "faggot",
  "pedo",
  "porn",
  "rape",
  "kill",
  "terror",
];

// Build a regex that matches any blocked word as a whole word, case-insensitive
function buildRegex(blocklist: string[]) {
  const escaped = blocklist
    .filter(Boolean)
    .map((w) => w.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"));
  if (!escaped.length) return null;
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "i");
}

const defaultRegex = buildRegex(DEFAULT_BLOCKED_WORDS);

export type ModerationMatch = {
  word: string;
  index: number;
};

/**
 * Returns an array of matched blocked words found in the provided text.
 * If none found, returns an empty array.
 */
export function findBlockedWords(
  text: string,
  blocklist: string[] = DEFAULT_BLOCKED_WORDS
): ModerationMatch[] {
  if (!text || !text.trim()) return [];

  const regex = buildRegex(blocklist) ?? defaultRegex;
  if (!regex) return [];

  const matches: ModerationMatch[] = [];
  let m: RegExpExecArray | null;
  const global = new RegExp(
    regex.source,
    regex.flags + (regex.flags.indexOf("g") === -1 ? "g" : "")
  );

  while ((m = global.exec(text))) {
    matches.push({ word: m[1], index: m.index });
    // Avoid infinite loops for zero-length matches
    if (m.index === global.lastIndex) global.lastIndex++;
  }

  return matches;
}

/**
 * Returns true if the text contains any blocked words.
 */
export function containsBlockedWords(text: string, blocklist?: string[]) {
  return findBlockedWords(text, blocklist).length > 0;
}

/**
 * Returns a sanitized version of the text where blocked words are replaced
 * with asterisks (preserving length). Useful for previewing or showing
 * redacted content.
 */
export function redactBlockedWords(text: string, blocklist?: string[]) {
  const matches = findBlockedWords(text, blocklist);
  if (!matches.length) return text;

  // Replace using a global regex built from the blocklist
  const regex = buildRegex(blocklist || DEFAULT_BLOCKED_WORDS) as RegExp;
  return text.replace(regex, (m) => "*".repeat(m.length));
}

export default {
  findBlockedWords,
  containsBlockedWords,
  redactBlockedWords,
};
