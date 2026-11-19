// Citations follow the objective's printed paragraph, not a later budget heading
// with the same unit name. Ambiguous pages remain unresolved.
const normalize = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
const hasPage = (row) => Number.isInteger(row.page) && row.page > 0;

export function objectiveSource(rows, objectives) {
  for (const objective of objectives) {
    const text = normalize(objective);
    if (text.length < 32) continue;
    const candidates = rows.filter((row) => {
      if (!hasPage(row) || row.node_kind !== "text") return false;
      const paragraph = normalize(row.text);
      return (
        paragraph.length >= 32 &&
        (text === paragraph ||
          text.startsWith(`${paragraph} `) ||
          paragraph.startsWith(`${text} `))
      );
    });
    const objectiveRows = candidates.filter(
      (row) => row.family === "objective",
    );
    const matches = objectiveRows.length ? objectiveRows : candidates;
    if (new Set(matches.map((row) => row.page)).size === 1) return matches[0];
  }
  return undefined;
}

export function unitHeadingSource(headings) {
  const performanceAnnex = (row) =>
    row.family === "annex" &&
    row.block_type === "subprogramme" &&
    /^Annex(?:\s+[IVXLCDM]+)?\s+[–—-]\s+Programme performance in \d{4}$/i.test(
      row.unit_path ?? "",
    );
  const candidates = headings.filter(
    (row) =>
      hasPage(row) &&
      row.family !== "budget" &&
      (row.family !== "annex" || performanceAnnex(row)) &&
      !/\bContents\b/.test(row.unit_path ?? ""),
  );
  for (const preferred of [
    candidates.filter((row) => row.unit_path === "Programme of work"),
    candidates.filter(performanceAnnex),
    candidates.filter((row) => row.block_type === "heading-sub"),
    candidates,
  ]) {
    if (!preferred.length) continue;
    return new Set(preferred.map((row) => row.page)).size === 1
      ? preferred[0]
      : undefined;
  }
  return undefined;
}
