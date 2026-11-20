import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  availableReportingPeriods,
  hasResult,
  isOverallCell,
  observation,
  periodLabel,
  resolveReportingPeriod,
  resultKind,
  resultNumber,
  resultText,
} from "../src/lib/uninfo-results.ts";

const readJSON = (path) =>
  JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const manifest = readJSON("public/data/uninfo/results/manifest.json");
const directory = readJSON("public/data/uninfo/plans/manifest.json");
const snapshots = manifest.frameworks.map((entry) =>
  readJSON(`public/data/uninfo/results/${entry.planId}.json`),
);

const cell = (observations = [], dimensions = {}) => ({
  id: 1,
  agency: null,
  category: null,
  location: null,
  implementingPartnerId: null,
  contributingPartnerId: null,
  observations,
  ...dimensions,
});
const assessment = (periodId, metricId, value) => ({
  periodId,
  metricId,
  value,
});
const fixture = (periods, observations) => ({
  periods,
  indicators: [{ cells: [cell(observations)] }],
  retrievedAt: "2026-11-20T00:00:00Z",
});

test("result snapshots cover six distinct sourced frameworks including shared and fiscal scopes", () => {
  assert.ok(manifest.frameworks.length >= 5);
  const ids = manifest.frameworks.map((entry) => entry.planId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(manifest.defaultPlanId));
  for (const [index, entry] of manifest.frameworks.entries()) {
    const data = snapshots[index];
    const plan = directory.plans[String(entry.planId)];
    assert.equal(data.planId, entry.planId);
    assert.equal(data.planName, plan.name);
    assert.deepEqual(data.countries, plan.workspace_countries);
    assert.deepEqual(entry.countries, data.countries);
    assert.equal(entry.start, plan.start);
    assert.equal(entry.end, plan.end);
    assert.equal(entry.indicatorCount, data.indicators.length);
    assert.equal(
      entry.cellCount,
      data.indicators.reduce(
        (sum, indicator) => sum + indicator.cells.length,
        0,
      ),
    );
    assert.equal(
      entry.source,
      `https://api.uninfo.org/v1.0/plan/public/${entry.planId}`,
    );
    assert.equal(entry.retrievedAt, data.retrievedAt);
  }
  assert.ok(snapshots.some((data) => data.countries.length > 1));
  assert.ok(
    snapshots.some((data) =>
      data.periods.some((period) => period.type === "fiscalYear"),
    ),
  );
});

test("request provenance accounts for all indicator definitions, cells and reporting intervals", () => {
  for (const data of snapshots) {
    const source = readJSON(`data/uninfo/results/${data.planId}-sources.json`);
    const sumRows = (predicate) =>
      source.requests
        .filter(predicate)
        .reduce((sum, request) => sum + request.rows, 0);
    assert.equal(source.planId, data.planId);
    assert.equal(source.retrievedAt, data.retrievedAt);
    assert.equal(
      sumRows(
        (request) =>
          request.endpoint === "plan/public/entity/search" &&
          request.request.coreentityTypeIds?.includes(7),
      ),
      data.indicators.length,
    );
    assert.equal(
      sumRows((request) => request.endpoint === "planEntityCell/search"),
      source.cellCount,
    );
    assert.equal(
      sumRows((request) => request.endpoint === "timeframe/search"),
      data.periods.length,
    );
    for (const request of [
      ...source.requests,
      ...(source.metadataRequests ?? []),
    ]) {
      assert.match(request.sha256, /^[a-f0-9]{64}$/);
      assert.ok(request.request.page >= 1);
      assert.ok(request.request.limit > 0);
      if (request.endpoint === "plan/public/entity/search") {
        assert.deepEqual(request.request.planIds, [data.planId]);
      }
    }
  }
});

test("snapshots preserve unique source identities and period-specific assessments without rollups", () => {
  for (const data of snapshots) {
    const periodIds = new Set(data.periods.map((period) => period.id));
    const ids = new Set();
    const cellIds = new Set();
    for (const indicator of data.indicators) {
      assert.ok(!ids.has(indicator.id));
      ids.add(indicator.id);
      assert.ok(indicator.cells.filter(isOverallCell).length <= 1);
      for (const item of indicator.cells) {
        assert.ok(!cellIds.has(item.id));
        cellIds.add(item.id);
        const pairs = new Set();
        for (const observed of item.observations) {
          assert.ok(periodIds.has(observed.periodId));
          const pair = `${observed.metricId}:${observed.periodId}`;
          assert.ok(!pairs.has(pair));
          pairs.add(pair);
        }
      }
      for (const link of indicator.sdgs) {
        assert.ok(link.goal >= 1 && link.goal <= 17);
        assert.ok(["direct", "framework", "catalogue"].includes(link.source));
        if (link.source === "catalogue")
          assert.equal(link.sourceId, indicator.catalogueId);
        if (link.source === "direct") assert.equal(link.sourceId, indicator.id);
        if (link.indicator)
          assert.ok(link.indicator.startsWith(`${link.target}.`));
      }
    }
  }
});

test("zero and No remain observations while missing tokens do not become achievements", () => {
  for (const value of [0, "0", false, "No"])
    assert.equal(hasResult(value), true);
  for (const value of [
    null,
    undefined,
    "",
    "  ",
    "N/A",
    "Not available yet",
    "No data",
    "NaN",
  ])
    assert.equal(hasResult(value), false);
  const data = cell([
    assessment(18, 3, 0),
    assessment(18, 2, "100"),
    assessment(17, 3, "40"),
  ]);
  assert.equal(observation(data, 18)?.value, 0);
  assert.equal(observation(data, 18, 2)?.value, "100");
  assert.equal(observation(data, 99), undefined);
  assert.equal(resultKind(false, "Binary"), "categorical");
  assert.equal(
    resultKind({ name: "Implementation phase" }, "Range"),
    "categorical",
  );
  assert.equal(
    resultText({ name: "Implementation phase" }),
    "Implementation phase",
  );
});

test("numeric parsing respects grouping and leaves ambiguous decimal-comma or mixed narratives textual", () => {
  assert.equal(resultNumber("1,234,567.8"), 1234567.8);
  assert.equal(resultNumber("1 234.5"), 1234.5);
  assert.equal(resultNumber("75%"), 75);
  assert.equal(resultNumber(-0.000000001), -0.000000001);
  assert.equal(resultNumber("1,5"), null);
  assert.equal(resultNumber("1 23"), null);
  assert.equal(resultNumber("Federal: 2; Provincial: 9"), null);
  assert.equal(resultNumber(Infinity), null);
  assert.equal(resultKind("15", "Scale"), "categorical");
  assert.equal(resultKind("15%", null), "percentage");
});

test("agency, category, location and partner dimensions cannot stand in for an overall value", () => {
  assert.equal(isOverallCell(cell()), true);
  for (const dimensions of [
    { agency: { id: 1 } },
    { category: "Women" },
    { location: "Kabul" },
    { implementingPartnerId: 1 },
    { contributingPartnerId: 2 },
  ]) {
    assert.equal(isOverallCell(cell([], dimensions)), false);
  }
});

test("period selection resets stale country periods and favours actual 2025 intervals over future targets", () => {
  const periods = [
    { id: 1, start: "2024-01-01", end: "2024-12-31", type: "yearly" },
    { id: 2, start: "2024-07-01", end: "2025-06-30", type: "fiscalYear" },
    { id: 3, start: "2027-01-01", end: "2027-12-31", type: "yearly" },
    { id: 4, start: "2023-01-01", end: "2027-12-31", type: "custom" },
  ];
  const data = fixture(periods, [
    assessment(1, 3, 0),
    assessment(2, 3, "12"),
    assessment(3, 2, "100"),
    assessment(4, 1, "20"),
  ]);
  assert.deepEqual(
    availableReportingPeriods(data).map((period) => period.id),
    [3, 2, 1],
  );
  assert.equal(resolveReportingPeriod(data), 2);
  assert.equal(resolveReportingPeriod(data, 999), 2);
  assert.equal(resolveReportingPeriod(data, 3), 3);
  assert.equal(resolveReportingPeriod(fixture([], [])), undefined);
  assert.equal(periodLabel(periods[1]), "Jul 2024–Jun 2025");
});

test("every populated framework chooses a valid interval without inventing achievements", () => {
  for (const data of snapshots) {
    const chosen = resolveReportingPeriod(data, -1);
    const periods = availableReportingPeriods(data);
    if (periods.length)
      assert.ok(periods.some((period) => period.id === chosen));
    else assert.equal(chosen, undefined);
  }
});
