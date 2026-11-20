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
export type ResultSdgLink = {
  goal: number;
  goalName: string;
  target: string | null;
  targetName: string | null;
  indicator: string | null;
  indicatorName: string | null;
  source: "direct" | "framework" | "catalogue";
  sourceId: number;
  sourceTitle: string;
};
export type ReportedIndicator = {
  id: number;
  code: string | null;
  title: string;
  description: string;
  unit: string | null;
  calculation: string | null;
  commonIndicator: boolean | null;
  sdgs: ResultSdgLink[];
  catalogueId: number | null;
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
export type ResultFramework = {
  planId: number;
  label: string;
  countries: string[];
  planName: string;
  start: string;
  end: string;
  retrievedAt: string;
  source: string;
  indicatorCount: number;
  cellCount: number;
};
export type CountryResultsManifest = {
  defaultPlanId: number;
  frameworks: ResultFramework[];
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
    !/^(not reported|not available(?: yet)?|n\/?a|nan|no data|data not available)$/i.test(
      text,
    )
  );
}

export function resultNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = resultText(value).match(
    /^([+-]?(?:\d{1,3}(?:,\d{3})+|\d{1,3}(?:\s\d{3})+|\d+)(?:\.\d+)?)\s*(%|ha|hectares?|km|sq\.?\s*km)?$/i,
  );
  if (!match) return null;
  const number = Number(match[1].replace(/[,\s]/g, ""));
  return Number.isFinite(number) ? number : null;
}

export function availableReportingPeriods(data: CountryResultsData) {
  const reported = new Set(
    data.indicators.flatMap((indicator) =>
      indicator.cells.flatMap((cell) =>
        cell.observations
          .filter(
            (item) => [2, 3].includes(item.metricId) && hasResult(item.value),
          )
          .map((item) => item.periodId),
      ),
    ),
  );
  return data.periods
    .filter((period) => reported.has(period.id))
    .sort(
      (a, b) => b.end.localeCompare(a.end) || b.start.localeCompare(a.start),
    );
}

/** Prefer a populated 2025 reporting interval, and never default to a future target-only period. */
export function resolveReportingPeriod(
  data: CountryResultsData,
  selected?: number,
) {
  const periods = availableReportingPeriods(data);
  if (periods.some((period) => period.id === selected)) return selected;
  const reached = new Set(
    data.indicators.flatMap((indicator) =>
      indicator.cells.flatMap((cell) =>
        cell.observations
          .filter((item) => item.metricId === 3 && hasResult(item.value))
          .map((item) => item.periodId),
      ),
    ),
  );
  const annual = periods.filter((period) => period.type !== "custom");
  const reference = annual.find(
    (period) => period.end.startsWith("2025") && reached.has(period.id),
  );
  const completed = annual.find(
    (period) =>
      period.end <= data.retrievedAt.slice(0, 10) && reached.has(period.id),
  );
  return (
    reference ??
    completed ??
    periods.find((period) => reached.has(period.id)) ??
    annual.find((period) => period.end <= data.retrievedAt.slice(0, 10)) ??
    periods.at(-1)
  )?.id;
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
