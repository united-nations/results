import assert from "node:assert/strict";
import { readFile, writeFile, rename } from "node:fs/promises";

const readJSON = async (path) => JSON.parse(await readFile(path, "utf8"));
const source = await readJSON("data/unct-evaluations-source.json");
const additional = await readJSON("data/unct-evaluation-country-reports.json");
const manifest = await readJSON("public/data/uninfo/plans/manifest.json");
const destination = "public/data/uninfo/evaluations.json";
const index = await readJSON(destination);
const labels = {
  evaluation: "framework evaluation",
  summary: "evaluation summary",
  review: "framework review",
  mid_term_evaluation: "mid-term evaluation",
};
const languages = { fr: "French", es: "Spanish", pt: "Portuguese" };
const countries = Object.fromEntries(
  Object.entries(manifest.countries).map(([code, country]) => [
    code,
    {
      currentPlanId: country.latest_plan_id,
      current: [
        ...(index.plans[String(country.latest_plan_id)]?.reports ?? []),
      ],
      previous: country.plan_ids
        .filter((id) => id !== country.latest_plan_id)
        .flatMap((id) => index.plans[String(id)]?.reports ?? []),
    },
  ]),
);

// These documents have verified country/cycle evidence but no corresponding
// financial plan payload. Retain their actual periods without inventing plan IDs.
for (const report of additional.reports) {
  const row = source.records[report.sourceRecordIndex];
  const country = manifest.countries[report.countryCode];
  assert.ok(country && row, "Unknown country or source record");
  assert.equal(row.matchStatus, "no_matching_plan_period");
  assert.deepEqual(report.period, row.frameworkPeriod);
  assert.deepEqual(report.periodEvidence, row.periodEvidence);
  assert.ok(
    report.countryEvidence.evidence && report.countryEvidence.sourcePage,
  );
  assert.ok(labels[report.reportKind], "Unsupported report kind");
  const current = manifest.plans[String(country.latest_plan_id)];
  const currentStart = Number(current.start.slice(0, 4));
  const currentEnd = Number(current.end.slice(0, 4));
  assert.ok(report.period.startYear <= currentEnd, "Unexpected future report");
  const previous =
    report.period.endYear <= currentStart &&
    report.period.startYear < currentStart;
  const url = row.verifiedURL ?? row.reportURL;
  assert.equal(source.documents[url]?.httpStatus, 200);
  const cycle = `${report.period.startYear}–${report.period.endYear}`;
  const language = languages[report.language];
  countries[report.countryCode][previous ? "previous" : "current"].push({
    title: `${country.name} ${cycle} ${labels[report.reportKind]}${language ? ` (${language})` : ""}`,
    url,
    period: cycle,
    sourceListingURL: row.sourceListingURL,
    sourceRecordIndex: row.recordIndex,
    language: report.language,
    reportKind: report.reportKind,
  });
}
for (const country of Object.values(countries)) {
  const seen = new Set(country.current.map((report) => report.url));
  country.previous = country.previous
    .sort((a, b) => b.period.localeCompare(a.period, "en", { numeric: true }))
    .filter((report) => {
      if (seen.has(report.url)) return false;
      seen.add(report.url);
      return true;
    });
}
index.countries = countries;
const temporary = `${destination}.tmp`;
await writeFile(temporary, `${JSON.stringify(index, null, 2)}\n`);
await rename(temporary, destination);
console.log(
  `Exported ${additional.reports.length} additional country evaluations`,
);
