import assert from "node:assert/strict";
import { test } from "node:test";
import {
  figureTimeSeries,
  figureDisplayRows,
  measureTimeSeries,
} from "../src/lib/budget-time-series.ts";

const figure = (series) => ({
  label: "Figure I",
  title: "Selected measures",
  subtitle: "",
  series,
});

test("budget charts keep real observations and drop future actuals and drawing guides", () => {
  const result = figureTimeSeries(
    figure([
      {
        name: "Actual number of fellows",
        points: [
          { category: "2024", value: 0 },
          { category: "2025", value: 5 },
          { category: "2026", value: 0 },
        ],
      },
      {
        name: "X",
        points: [
          { category: "2026\n(planned)", value: 7 },
          { category: "2027 (planned)", value: 8 },
        ],
      },
      {
        name: "X",
        points: [
          { category: "5.5", value: 0 },
          { category: "5.5", value: 100 },
        ],
      },
    ]),
    2025,
  );
  assert.deepEqual(
    result.map(({ points }) =>
      points.map(({ year, status, value }) => [year, status, value]),
    ),
    [
      [
        [2024, "actual", 0],
        [2025, "actual", 5],
      ],
      [
        [2026, "planned", 7],
        [2027, "planned", 8],
      ],
    ],
  );
});

test("figures with ambiguous period labels fall back to their original source", () => {
  assert.equal(
    figureTimeSeries(
      figure([
        {
          name: "Actual",
          points: [
            { category: "", value: 1 },
            { category: "2024", value: 2 },
          ],
        },
        {
          name: "Planned",
          points: [
            { category: "2026", value: 5 },
            { category: "2027", value: 7 },
          ],
        },
      ]),
      2025,
    ),
    undefined,
  );
});

test("numeric measures preserve their units and never turn a missing value into zero", () => {
  const result = measureTimeSeries([
    { year: 2023, type: "actual", value: "—" },
    { year: 2025, type: "actual", value: "12.5%" },
    { year: 2027, type: "planned", value: "15%" },
  ]);
  assert.equal(result.percent, true);
  assert.deepEqual(
    result.series
      .flatMap(({ points }) => points)
      .map(({ year, value }) => [year, value]),
    [
      [2025, 12.5],
      [2027, 15],
    ],
  );
});

test("fallback figure data preserves unknowns and historical zeros but excludes future actual placeholders", () => {
  const source = figure([
    {
      name: "Women (actual)",
      percent: true,
      points: [
        { category: "2025", value: 0 },
        { category: "2026", value: 0 },
        { category: "", value: 0 },
        { category: "Unknown group", value: 12 },
      ],
    },
    {
      name: "Women (planned)",
      percent: true,
      points: [{ category: "2026", value: 61 }],
    },
    { name: "Dividers", points: [{ category: "5.5", value: 100 }] },
  ]);
  const rows = figureDisplayRows(source, 2025);
  assert.deepEqual(
    rows.map(({ series, category, value }) => [series, category, value]),
    [
      ["Women (actual)", "2025", 0],
      ["Women (actual)", "", 0],
      ["Women (actual)", "Unknown group", 12],
      ["Women (planned)", "2026", 61],
    ],
  );
  assert.ok(rows.every((row) => row.percent));
  assert.equal(
    source.series[0].points.length,
    4,
    "display filtering must not mutate extracted data",
  );
  assert.equal(
    figureTimeSeries(source, 2025),
    undefined,
    "unknown categories must not be invented as years",
  );
});
