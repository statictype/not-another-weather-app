/**
 * WeatherAPI matches its location index in ASCII. A query that carries a
 * diacritic and more than one token drops the accented token and matches on
 * what is left: `tromsø, norway` returns Norway, Iowa. A single accented token
 * matches, and the reply echoes the script it was asked in, so `münchen`
 * returns München while `munchen` returns Münchenstein, Switzerland.
 *
 * So a multi-token query is folded to ASCII before it goes upstream, and the
 * diacritics are copied back from the query on the way out. The query is the
 * only place a diacritic can come from: upstream never sends one it was not
 * sent.
 */

const NON_ASCII = /\P{ASCII}/u;

/** Letters NFD does not decompose into a base plus combining marks. */
const UNDECOMPOSED: Record<string, string> = {
  ø: "o",
  Ø: "O",
  đ: "d",
  Đ: "D",
  ł: "l",
  Ł: "L",
  ð: "d",
  Ð: "D",
  ı: "i",
  İ: "I",
  ß: "ss",
  æ: "ae",
  Æ: "Ae",
  œ: "oe",
  Œ: "Oe",
  þ: "th",
  Þ: "Th",
};

export function foldAscii(input: string): string {
  const stripped = input.normalize("NFD").replace(/\p{M}/gu, "");
  let folded = "";
  for (const char of stripped) folded += UNDECOMPOSED[char] ?? char;
  return folded;
}

/** Folded only when it has to be: a lone accented token matches upstream and
 *  comes back accented, and folding it can miss the record entirely. */
export function upstreamQuery(query: string): string {
  if (!NON_ASCII.test(query)) return query;
  return /[\s,]/.test(query.trim()) ? foldAscii(query) : query;
}

/** Copies the diacritics of `query` onto `name` when the two spell the same
 *  word folded. Case comes from `name`, so `tromsø, norway` over `Tromso`
 *  reads `Tromsø`. An ASCII query never strips an accent `name` already has. */
export function restoreFromQuery(name: string, query: string): string {
  if (!NON_ASCII.test(query)) return name;
  for (const candidate of [query, ...query.split(",")]) {
    const restored = restore(name, candidate.trim());
    if (restored !== name) return restored;
  }
  return name;
}

/** `source` must cover `name` whole — a prefix would accent the wrong word. */
function restore(name: string, source: string): string {
  const target = [...name];
  const from = [...source];
  if (from.length < target.length) return name;

  const merged: string[] = [];
  for (const [index, char] of target.entries()) {
    const replacement = from[index];
    if (replacement === undefined) return name;
    if (fold(replacement) !== fold(char)) return name;
    merged.push(NON_ASCII.test(replacement) ? matchCase(replacement, char) : char);
  }
  return merged.join("");
}

function fold(char: string): string {
  return foldAscii(char).toLowerCase();
}

function matchCase(source: string, target: string): string {
  const upper = target === target.toUpperCase() && target !== target.toLowerCase();
  return upper ? source.toUpperCase() : source.toLowerCase();
}
