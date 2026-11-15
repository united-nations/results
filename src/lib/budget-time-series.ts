import type { BudgetResult } from "./programme-budget";

export type Status = "actual" | "planned" | "unlabelled";

export type TimePoint = {
  year: number;
  period: string;
  status: Status;
  value: number;
};

export type TimeSeries = {
  name: string;
  percent?: boolean;
  points: TimePoint[];
};

const periodStart = /^((?:19|20)\d{2})(?:\/(\d{2}))?\b/;

function sourceStatus(label: string): Status {
  const text = label.trim();
  const match =
    /\((actuals?|planned|targets?)\)\s*$/i.exec(text) ??
    /^(actuals?|planned|targets?)\b/i.exec(text);
  if (match) return /^actual/i.test(match[1]) ? "actual" : "planned";
  return "unlabelled";
}

export function figureTimeSeries(
  figure: BudgetResult["figures"][number],
  reportedThrough: number,
): TimeSeries[] | undefined {
  const output: TimeSeries[] = [];
  for (const { name, percent, points } of figure.series) {
    // A series called "X" can hold actual values. Only skip it when the
    // source gives it non-period coordinates (e.g. a vertical divider at 5.5).
    if (
      /^dividers?$/i.test(name.trim()) ||
      (/^(?:x|#REF!)$/i.test(name.trim()) &&
        points.every((point) => !periodStart.test(point.category.trim())))
    )
      continue;

    const series: TimePoint[] = [];
    for (const { category, value } of points) {
      const match = periodStart.exec(category.trim());
      if (!match) return undefined;
      const start = Number(match[1]);
      const fiscal = match[2] !== undefined;
      if (fiscal && Number(match[2]) !== (start + 1) % 100) return undefined;
      const categoryStatus = sourceStatus(category);
      const status =
        categoryStatus === "unlabelled" ? sourceStatus(name) : categoryStatus;
      // The edition's actuals stop in the performance year. Chart caches can
      // still contain zeros or totals under an "actual" series for later years.
      if (status === "actual" && start + Number(fiscal) > reportedThrough)
        continue;
      series.push({
        year: start + (fiscal ? 0.5 : 0),
        period: fiscal ? `${start}/${match[2]}` : match[1],
        status,
        value,
      });
    }
    if (series.length === 0) continue;

    // Multiple values at the same time within one source series do not have
    // enough information to connect as a line.
    if (new Set(series.map((point) => point.year)).size !== series.length)
      return undefined;
    output.push({
      name: /^(?:column\s*\d+|x|#REF!)$/i.test(name.trim()) ? "" : name,
      ...(percent ? { percent } : {}),
      points: series.toSorted((a, b) => a.year - b.year),
    });
  }
  return new Set(
    output.flatMap((series) => series.points.map((point) => point.year)),
  ).size >= 2
    ? output
    : undefined;
}

const numericValue = /^[+-]?(?:\d+|\d{1,3}(?:[,\s]\d{3})+)(?:\.\d+)?\s*%?$/;

export function measureTimeSeries(measures: BudgetResult["measures"]) {
  const points: TimePoint[] = [];
  let percent: boolean | undefined;
  for (const { year, type, value } of measures) {
    if (/^[–—-]$/.test(value)) continue;
    if (!numericValue.test(value)) return undefined;
    const isPercent = value.endsWith("%");
    if (percent !== undefined && percent !== isPercent) return undefined;
    percent = isPercent;
    points.push({
      year,
      period: String(year),
      status: type === "actual" || type === "planned" ? type : "unlabelled",
      value: Number(value.replace(/[,\s%]/g, "")),
    });
  }
  if (new Set(points.map((point) => point.year)).size < 2) return undefined;
  const groups = Map.groupBy(points, (point) => point.status);
  if (
    [...groups.values()].some(
      (group) =>
        new Set(group.map((point) => point.year)).size !== group.length,
    )
  ) {
    return undefined;
  }
  return {
    percent,
    series: [...groups].map(([status, group]) => ({
      name:
        status === "unlabelled"
          ? ""
          : status === "actual"
            ? "Actual"
            : "Planned",
      points: group.toSorted((a, b) => a.year - b.year),
    })),
  };
}
