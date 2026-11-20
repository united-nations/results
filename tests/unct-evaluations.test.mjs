import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const readJSON = (path) =>
  JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const source = readJSON("data/unct-evaluations-source.json");
const index = readJSON("public/data/uninfo/evaluations.json");
const workspaces = new Map(
  readJSON("data/uninfo/plans/raw/workspaces.json").map((item) => [
    item.id,
    item,
  ]),
);
const plans = new Map(
  readdirSync(new URL("../public/data/uninfo/plans/", import.meta.url))
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const plan = readJSON(`public/data/uninfo/plans/${name}`);
      return [String(plan.id), plan];
    }),
);
const records = new Map(source.records.map((row) => [row.recordIndex, row]));
const countryAliases = {
  CAF: ["République centrafricaine"],
  CMR: ["Cameroun"],
  COD: ["République démocratique du Congo"],
  DOM: ["República Dominicana"],
  GNQ: ["Guinea Ecuatorial"],
  KGZ: ["Kyrgyzstan"],
  LAO: ["Lao PDR"],
  MYS: ["Malaysia"],
  TUR: ["Turkey"],
  VNM: ["Vietnam"],
  GIN: ["Guinée"],
  MAR: ["Maroc"],
  MRT: ["Mauritanie"],
  STP: ["São Tomé & Principe"],
  TCD: ["Tchad"],
  TUN: ["Tunisie"],
  SYR: ["Syria"],
  PSE: ["State of Palestine"],
  MKD: ["North Macedonia"],
};
const normalizedName = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function assertUNSource(value) {
  const url = new URL(value);
  assert.equal(url.protocol, "https:");
  assert.ok(
    url.hostname === "un.org" ||
      url.hostname.endsWith(".un.org") ||
      url.hostname === "uninfo.org" ||
      url.hostname.endsWith(".uninfo.org"),
    `Unexpected source authority: ${value}`,
  );
}

test("evaluation inventory accounts for every filtered listing page and record", () => {
  const pagination = source.pagination;
  assert.equal(source.filter, "country_document_type_api:Eval");
  assert.equal(source.records.length, pagination.expectedCount);
  assert.equal(records.size, pagination.expectedCount);
  assert.equal(pagination.pagesVisited.length, pagination.pagesExpected);
  let previousLast = 0;
  for (const [page, visited] of pagination.pagesVisited.entries()) {
    assert.equal(visited.page, page);
    assert.equal(visited.status, 200);
    assert.equal(visited.firstItem, previousLast + 1);
    assert.equal(visited.total, pagination.expectedCount);
    assert.match(visited.htmlSha256, /^[a-f0-9]{64}$/);
    previousLast = visited.lastItem;
    const url = new URL(visited.url);
    assert.equal(url.hostname, "unsdg.un.org");
    assert.equal(url.searchParams.get("page"), String(page));
    assert.equal(
      url.searchParams.get("f[0]"),
      "country_document_type_api:Eval",
    );
    assert.equal(
      source.records.filter((row) => row.listingPage === page).length,
      visited.lastItem - visited.firstItem + 1,
    );
  }
  assert.equal(previousLast, pagination.expectedCount);
  for (const [position, row] of source.records.entries()) {
    assert.equal(row.recordIndex, position);
    assertUNSource(row.reportURL);
    assert.equal(
      row.sourceListingURL,
      pagination.pagesVisited[row.listingPage].url,
    );
    assert.ok(row.matchStatus, `Unclassified listing ${position}`);
  }
});

test("displayed evaluations bind to exact framework cycles and workspace countries", () => {
  assert.equal(index.overviewURL, source.overviewURL);
  assert.equal(index.retrievedAt, source.retrievedAt);
  assert.ok(Object.keys(index.plans).length > 0);
  const displayed = new Set();
  for (const [planId, entry] of Object.entries(index.plans)) {
    const plan = plans.get(planId);
    assert.ok(plan, `Unknown framework ${planId}`);
    const workspace = workspaces.get(plan.workspace_id);
    assert.ok(workspace, `Unknown workspace for ${planId}`);
    const semanticKeys = new Set();
    const hashes = new Set();
    assert.ok(entry.reports.length > 0);
    for (const report of entry.reports) {
      const row = records.get(report.sourceRecordIndex);
      assert.ok(row, `Unbound report ${report.url}`);
      assert.equal(row.selectedForDisplay, true);
      assert.ok(row.verifiedPlanIds.includes(Number(planId)));
      assert.ok(
        workspace.countries.some((country) => country.iso3 === row.countryCode),
        `Wrong country/workspace: ${row.country} → ${planId}`,
      );
      assert.deepEqual(row.frameworkPeriod, {
        startYear: Number(plan.start.slice(0, 4)),
        endYear: Number(plan.end.slice(0, 4)),
      });
      assert.equal(
        report.period,
        `${row.frameworkPeriod.startYear}–${row.frameworkPeriod.endYear}`,
      );
      assert.equal(row.periodEvidence.startYear, row.frameworkPeriod.startYear);
      assert.equal(row.periodEvidence.endYear, row.frameworkPeriod.endYear);
      assert.ok(row.periodEvidence.evidence.trim().length > 20);
      assert.ok(
        row.periodEvidence.sourcePage > 0 || row.periodEvidence.sourceURL,
        `Missing evidence location for ${report.url}`,
      );
      assert.ok(
        row.countryEvidence?.evidence?.trim().length > 10,
        `Missing evaluated-country evidence for ${report.url}`,
      );
      assert.ok(
        row.countryEvidence.sourcePage > 0 || row.countryEvidence.sourceURL,
        `Missing country-evidence location for ${report.url}`,
      );
      const countryNames = [
        row.country,
        ...workspace.countries
          .filter((country) => country.iso3 === row.countryCode)
          .map((country) => country.name),
        ...(countryAliases[row.countryCode] ?? []),
      ];
      assert.ok(
        countryNames.some((name) =>
          normalizedName(row.countryEvidence.evidence).includes(
            normalizedName(name),
          ),
        ),
        `Evidence does not identify the evaluated country: ${report.url}`,
      );
      assert.equal(report.sourceListingURL, row.sourceListingURL);
      assertUNSource(report.url);
      assert.ok(
        report.url === row.reportURL || report.url === row.verifiedURL,
        `Unverified direct download for source record ${row.recordIndex}`,
      );
      assert.ok(
        [
          "evaluation",
          "mid_term_evaluation",
          "rapid_assessment",
          "review",
          "summary",
        ].includes(report.reportKind),
      );
      assert.ok(
        !/excluded|unresolved|ambiguous|not_verified/.test(row.matchStatus),
      );
      assert.ok(
        !/draft|inception|terms.of.reference|non.final/i.test(row.documentKind),
      );
      assert.equal(displayed.has(row.recordIndex), false);
      displayed.add(row.recordIndex);
      const semanticKey = `${report.period}|${report.language}|${report.reportKind}`;
      assert.equal(
        semanticKeys.has(semanticKey),
        false,
        `Duplicate format: ${planId}`,
      );
      semanticKeys.add(semanticKey);
      const document = source.documents[report.url];
      if (document?.sha256) {
        assert.equal(
          hashes.has(document.sha256),
          false,
          `Duplicate report: ${planId}`,
        );
        hashes.add(document.sha256);
      }
    }
  }
  assert.deepEqual(
    [...displayed].sort((a, b) => a - b),
    source.records
      .filter((row) => row.selectedForDisplay)
      .map((row) => row.recordIndex)
      .sort((a, b) => a - b),
  );
});

test("known non-final, wrong-cycle and partial regional reports stay unassigned", () => {
  // These source records passed superficial country/year checks in early drafts.
  for (const position of [72, 79, 80, 88, 96, 104, 107, 132, 178, 179]) {
    const row = records.get(position);
    assert.equal(
      row.selectedForDisplay === true,
      false,
      `Unsafe listing ${position}`,
    );
    assert.deepEqual(
      row.verifiedPlanIds,
      [],
      `Unsafe framework match ${position}`,
    );
  }
  const kenya = records.get(1);
  assert.match(
    kenya.periodEvidence.extensionEvidence,
    /extended to june 2027/i,
  );
  assert.deepEqual(kenya.frameworkPeriod, { startYear: 2022, endYear: 2027 });
  // A summary is useful, but must not be presented as a full evaluation report.
  for (const entry of Object.values(index.plans)) {
    for (const report of entry.reports) {
      if ([101, 102].includes(report.sourceRecordIndex)) {
        assert.equal(report.reportKind, "summary");
      }
    }
  }
});

test("country groups retain all verified reports, including historical cycles without financial plans", () => {
  const manifest = readJSON("public/data/uninfo/plans/manifest.json");
  const history = readJSON("data/unct-evaluation-country-reports.json");
  for (const [code, country] of Object.entries(manifest.countries)) {
    const groups = index.countries[code];
    assert.equal(groups.currentPlanId, country.latest_plan_id);
    for (const report of index.plans[String(country.latest_plan_id)]?.reports ??
      [])
      assert.ok(groups.current.some((item) => item.url === report.url));
    const all = [...groups.current, ...groups.previous];
    assert.equal(new Set(all.map((report) => report.url)).size, all.length);
    for (const planId of country.plan_ids) {
      for (const report of index.plans[String(planId)]?.reports ?? [])
        assert.ok(all.some((item) => item.url === report.url));
    }
    assert.ok(
      all.every(
        (report) =>
          ![72, 79, 98, 105, 110, 111, 117, 122, 130, 150, 178, 179].includes(
            report.sourceRecordIndex,
          ),
      ),
    );
  }
  for (const historical of history.reports) {
    const row = records.get(historical.sourceRecordIndex);
    const country = manifest.countries[historical.countryCode];
    const current = plans.get(String(country.latest_plan_id));
    assert.equal(row.matchStatus, "no_matching_plan_period");
    assert.deepEqual(historical.periodEvidence, row.periodEvidence);
    assert.deepEqual(historical.period, row.frameworkPeriod);
    const currentStart = Number(current.start.slice(0, 4));
    const previous =
      historical.period.startYear < currentStart &&
      historical.period.endYear <= currentStart;
    const excerpt = normalizedName(historical.countryEvidence.evidence);
    assert.ok(
      [country.name, ...(countryAliases[historical.countryCode] ?? [])].some(
        (name) => excerpt.includes(normalizedName(name)),
      ),
      `Missing historical country evidence for ${historical.countryCode}`,
    );
    const report = index.countries[historical.countryCode][
      previous ? "previous" : "current"
    ].find((item) => item.sourceRecordIndex === historical.sourceRecordIndex);
    assert.ok(
      report,
      `Missing historical report ${historical.sourceRecordIndex}`,
    );
    assert.equal(report.url, row.verifiedURL ?? row.reportURL);
    assert.equal(source.documents[report.url].httpStatus, 200);
    assert.match(source.documents[report.url].sha256, /^[a-f0-9]{64}$/);
    assert.equal(historical.countryEvidence.sourceURL, report.url);
    assert.ok(historical.countryEvidence.sourcePage > 0);
  }
  assert.ok(
    index.countries.BGD.previous.some(
      (report) => report.period === "2017–2021",
    ),
  );
  assert.ok(
    index.countries.SYC.previous.every((report) =>
      /Seychelles/.test(report.title),
    ),
  );
});
