export type ReportedValue =
  string | number | boolean | Record<string, unknown> | unknown[] | null;
export type ResultPeriod = {
  id: number;
  start: string;
  end: string;
  type: string;
};
export type ResultObservation = {
  metricId: number;
  periodId: number;
  value: ReportedValue;
  updatedAt: string | null;
};
export type ResultCell = {
  id: number;
  agency: { id: number; code: string; name: string } | null;
  category: string | null;
  location: string | null;
  implementingPartnerId: number | null;
  contributingPartnerId: number | null;
  observations: ResultObservation[];
};
export type ReportedIndicator = {
  id: number;
  code: string | null;
  title: string;
  description: string;
  unit: string | null;
  calculation: string | null;
  commonIndicator: boolean | null;
  parentId: number | null;
  parentCode: string | null;
  parentTitle: string;
  cells: ResultCell[];
};
export type CountryResultsData = {
  planId: number;
  planName: string;
  countries: string[];
  retrievedAt: string;
  source: string;
  apiBase: string;
  periods: ResultPeriod[];
  indicators: ReportedIndicator[];
};

export function resultText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number")
    return String(value).trim();
  if (Array.isArray(value))
    return value.map(resultText).filter(Boolean).join("; ");
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return resultText(
      row.name ?? row.label ?? row.value ?? JSON.stringify(row),
    );
  }
  return String(value);
}

export function hasResult(value: unknown) {
  const text = resultText(value);
  return (
    text !== "" &&
    !/^(not reported|not available(?: yet)?|n\/?a|no data|data not available)$/i.test(
      text,
    )
  );
}

export function resultNumber(value: unknown): number | null {
  const match = resultText(value).match(
    /^([+-]?\d[\d,\s]*(?:\.\d+)?)\s*(%|ha|hectares?|km|sq\.?\s*km)?$/i,
  );
  if (!match) return null;
  const number = Number(match[1].replace(/[,\s]/g, ""));
  return Number.isFinite(number) ? number : null;
}

export const resultNumberFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 4,
});

export function resultKind(value: unknown, unit: string | null) {
  if (!hasResult(value)) return "missing";
  const text = resultText(value);
  if (
    /^(yes|no)$/i.test(text) ||
    /binary|scale|range/i.test(unit ?? "") ||
    /^level\s+\d/i.test(text)
  )
    return "categorical";
  if (resultNumber(value) !== null)
    return /%|percent/i.test(`${unit ?? ""} ${text}`)
      ? "percentage"
      : "numeric";
  return "narrative";
}

export function isOverallCell(cell: ResultCell) {
  return (
    !cell.agency &&
    !cell.category &&
    !cell.location &&
    !cell.implementingPartnerId &&
    !cell.contributingPartnerId
  );
}

export function observation(
  cell: ResultCell | undefined,
  periodId: number,
  metricId = 3,
) {
  return cell?.observations.find(
    (item) =>
      item.periodId === periodId &&
      item.metricId === metricId &&
      hasResult(item.value),
  );
}

export function periodLabel(period: ResultPeriod) {
  const date = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    ...(period.type === "custom" ? { day: "numeric" } : {}),
    timeZone: "UTC",
  });
  return `${date.format(new Date(period.start))}–${date.format(new Date(period.end))}`;
}
