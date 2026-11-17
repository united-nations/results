export function normalizeSearchText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function searchTerms(query: string) {
  return normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
}
