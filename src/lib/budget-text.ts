type ListItem = { text: string; children: string[] };

export type BudgetTextBlock =
  | { kind: "paragraph" | "heading"; text: string }
  | { kind: "list"; items: ListItem[] };

const paragraphNumber =
  /^(?:\d{1,3}[A-Z]?(?:\.(?:[IVXLCDM]+|\d+))*\.\d+\.?|\d{1,3}\.)\s+(?=[\p{Lu}“‘"'(])/u;
const listMarker = /^\(([a-z]|[ivxlcdm]{2,})\)\s+/i;
const inlineAlpha = /(:\s+)\(a\)\s+.+;\s*\(b\)\s+/i;
const inlineRoman = /(:\s+)\(i\)\s+.+;\s*\(ii\)\s+/i;

function splitSourceLine(raw: string): string[] {
  const line = raw.trim().replace(paragraphNumber, "");
  if (inlineAlpha.test(line)) {
    return line
      .split(/(?<=:)\s+(?=\(a\)\s)|(?<=;)\s*(?=\([b-z]\)\s)/i)
      .flatMap(splitRomanList);
  }
  return splitRomanList(line);
}

function splitRomanList(line: string) {
  if (!inlineRoman.test(line)) return [line];
  return line.split(/(?<=:)\s+(?=\(i\)\s)|(?<=;)\s*(?=\([ivxlcdm]{2,}\)\s)/i);
}

export function formatBudgetText(
  paragraphs: readonly string[],
): BudgetTextBlock[] {
  const blocks: BudgetTextBlock[] = [];
  for (const paragraph of paragraphs) {
    let current: ListItem[] = [];
    let lastLetter = "";
    const flush = () => {
      if (current.length) blocks.push({ kind: "list", items: current });
      current = [];
      lastLetter = "";
    };

    for (const line of paragraph.split(/\r?\n/).flatMap(splitSourceLine)) {
      const marker = listMarker.exec(line);
      if (!marker) {
        flush();
        if (line) {
          const kind = /^lessons learned(?: and planned changes?)?$/i.test(line)
            ? "heading"
            : "paragraph";
          blocks.push({ kind, text: line });
        }
        continue;
      }

      const letter = marker[1].toLowerCase();
      const text = line.slice(marker[0].length);
      const item = current.at(-1);
      // Lower-roman bullets follow a lettered item ending in a colon.
      // A standalone '(i)' following '(h)' is the ninth lettered bullet.
      const nested =
        item &&
        ((letter === "i" && lastLetter !== "h" && item.text.endsWith(":")) ||
          (/^[ivxlcdm]{2,}$/.test(letter) && item.children.length > 0) ||
          (letter === "v" && item.children.length > 0 && lastLetter !== "u"));
      if (nested) {
        item.children.push(text);
      } else {
        current.push({ text, children: [] });
        lastLetter = letter;
      }
    }
    flush();
  }
  return blocks;
}
