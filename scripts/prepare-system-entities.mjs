import fs from "node:fs";
import path from "node:path";

// Explicit, local snapshot preparation; never reads or writes a database.
const [openRoot, chartRoot, openRevision, chartRevision] =
  process.argv.slice(2);
if (!openRoot || !chartRoot || !openRevision || !chartRevision) {
  throw new Error(
    "Usage: node scripts/prepare-system-entities.mjs <open-repo> <system-chart-repo> <open-commit> <chart-commit>",
  );
}
const read = (root, file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const year = 2025;
const spending = read(openRoot, `public/data/sdg-expenses-${year}.json`);
const metadata = read(openRoot, "public/data/entities.json");
const chart = read(chartRoot, "public/un-entities.json");
const taxonomy = read(openRoot, "data/organization-taxonomies.json");
const prior = read(
  process.cwd(),
  "data/systemchart-entity-documents.json",
).categories.flatMap((group) => group.entities);
const financial = read(
  openRoot,
  `public/data/entity-spending-${year}.json`,
).filter((row) => row.source === "ceb");
const total = financial.reduce((sum, row) => sum + row.amount, 0);
const validUrl = (value) => {
  if (typeof value !== "string" || !/^https?:\/\//.test(value)) return null;
  // Some source fields contain several concatenated URLs. Keep the first.
  return value.split(/\s+https?:\/\/|(?<=.)(?=https?:\/\/)/)[0].trim();
};
const logoDir = "public/images/system-entities";
fs.mkdirSync(logoDir, { recursive: true });
const entities = financial
  // UNODC remains in source totals but is not a separate directory entry.
  .filter((row) => row.entity !== "UNODC")
  .map((row) => {
    const meta = metadata.find((item) => item.entity === row.entity);
    const chartCode =
      {
        "UN Secretariat": "UN",
        "Peacekeeping Operations": "DPO",
        "UN Tourism": "UNWTO",
      }[row.entity] ?? row.entity;
    const source = chart.find((item) => item.entity === chartCode);
    const old = prior.find((item) => item.code === chartCode);
    const amounts = Object.fromEntries(
      Array.from({ length: 17 }, (_, i) => [
        String(i + 1),
        spending[String(i + 1)]?.entities[row.entity] ?? 0,
      ]),
    );
    const ranked = Object.entries(amounts)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]));
    const logo = ["svg", "png"]
      .map((ext) =>
        path.join(chartRoot, "public/images/logos", `${chartCode}.${ext}`),
      )
      .find((file) => fs.existsSync(file));
    let logoPath = null;
    if (logo) {
      const filename = path.basename(logo);
      fs.copyFileSync(logo, path.join(logoDir, filename));
      logoPath = `/images/system-entities/${filename}`;
    }
    return {
      code: row.entity,
      name: meta?.entity_long ?? source?.entity_long ?? row.entity,
      description:
        source?.entity_description || meta?.entity_description || null,
      category: meta?.system_grouping || "Uncategorized",
      logo: logoPath,
      strategicPlan:
        old?.strategicPlan ||
        validUrl(source?.strategic_plan_link) ||
        validUrl(meta?.strategic_plan_link),
      resultsFramework:
        old?.resultsFramework ||
        validUrl(source?.results_framework_link) ||
        validUrl(meta?.results_framework_link),
      primarySdg: ranked.length ? Number(ranked[0][0]) : 0,
      spending: row.amount,
      sdgSpending: {
        ...amounts,
        0: spending.non_sdg.entities[row.entity] ?? 0,
      },
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code, "en"));
const goals = read(openRoot, "data/sdgs.json").goals.map((goal) => ({
  number: goal.number,
  name: goal.short_title,
  description: goal.title,
  icon: `/images/sdgs/${String(goal.number).padStart(2, "0")}.jpg`,
  spending: spending[String(goal.number)]?.total ?? 0,
  share: (spending[String(goal.number)]?.total ?? 0) / total,
}));
goals.push({
  number: 0,
  name: "Non-SDG",
  description:
    "Expenditure explicitly reported under CEB’s Non-SDG code (X00).",
  icon: null,
  spending: spending.non_sdg.total,
  share: spending.non_sdg.total / total,
});
const snapshot = {
  year,
  source: `https://github.com/united-nations/transparency/blob/${openRevision}/public/data/sdg-expenses-${year}.json`,
  metadataSource: `https://github.com/united-nations/transparency/blob/${openRevision}/public/data/entities.json`,
  chartSource: `https://github.com/UN-EOSG-Analytics/un-system-chart-navigator/blob/${chartRevision}/public/un-entities.json`,
  iconsSource: "https://sdgs.un.org/goals",
  totalSpending: total,
  nonSdgSpending: spending.non_sdg.total,
  unspecifiedSpending: spending.sdg_not_specified.total,
  categories: taxonomy.system_groupings
    .filter((group) => entities.some((entity) => entity.category === group.key))
    .map((group) => ({
      ...group,
      spending: financial
        .filter(
          (row) =>
            (metadata.find((entity) => entity.entity === row.entity)
              ?.system_grouping || "Uncategorized") === group.key,
        )
        .reduce((sum, row) => sum + row.amount, 0),
    })),
  goals,
  entities,
};
fs.writeFileSync(
  "data/system-entities.json",
  `${JSON.stringify(snapshot, null, 2)}\n`,
);
console.log(`Prepared ${entities.length} reporting entities for ${year}.`);
