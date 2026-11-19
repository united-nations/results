import type { BudgetResult } from "./programme-budget";
import {
  figureTimeSeries,
  measureTimeSeries,
  type TimeSeries,
} from "./budget-time-series";

export type ResultThumbnailData =
  | { kind: "graph"; series: TimeSeries[] }
  | { kind: "timeline"; stages: { year: number; planned: boolean }[] };

export function resultThumbnail(
  result: BudgetResult,
  edition: number,
): ResultThumbnailData | undefined {
  for (const entries of Map.groupBy(
    result.measures,
    (measure) => measure.label,
  ).values()) {
    const chart = measureTimeSeries(entries);
    if (chart) return { kind: "graph", series: chart.series };
    if (entries.some(({ value }) => !/^[\d\s,.%+–—-]+$/.test(value))) {
      const ordered = entries.toSorted(
        (a, b) => a.year - b.year || a.type.localeCompare(b.type),
      );
      return {
        kind: "timeline",
        stages: [
          ...new Map(
            ordered.map(({ year, type }) => [
              `${year}-${type}`,
              { year, planned: type !== "actual" },
            ]),
          ).values(),
        ],
      };
    }
  }
  for (const figure of result.figures) {
    const series = figureTimeSeries(figure, edition - 2);
    if (series) return { kind: "graph", series };
  }
  return undefined;
}
