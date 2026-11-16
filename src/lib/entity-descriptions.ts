import source from "../../data/entity-descriptions-2027.json";

type EntityDescription = {
  text: string;
  symbol: string;
  locator: string;
  update?: { label: string; href: string };
};

const descriptions: Record<string, EntityDescription> = source;

export function getEntityDescription(id: string) {
  const description = descriptions[id];
  if (!description) throw new Error(`Missing budget description for ${id}`);

  const { text, symbol, locator, update } = description;
  return {
    text,
    source: update ?? {
      label: `${symbol} · ${locator}`,
      href: `https://documents.un.org/api/symbol/access?s=${encodeURIComponent(symbol)}&l=en&t=pdf`,
    },
  };
}
