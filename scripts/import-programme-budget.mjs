import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [portalData, identityFile, expensesFile, annotationsFile] =
  process.argv.slice(2);
if (!portalData || !identityFile || !expensesFile || !annotationsFile) {
  throw new Error(
    "Usage: node scripts/import-programme-budget.mjs <PPB portal data directory> <2027 entity overlay JSON> <Open UN 2025 overview JSON> <2027 chart annotations JSON>",
  );
}
const edition = 2027;
const hashes = {};
function read(path, label) {
  const bytes = readFileSync(path);
  hashes[label] = createHash("sha256").update(bytes).digest("hex");
  return JSON.parse(bytes);
}
function dataset(name) {
  const block = read(join(portalData, "ppb", name, `${edition}.json`), name);
  assert.equal(block.edition, edition);
  assert.equal(block.rows.length, block.n_rows);
  return block.rows.map((row) =>
    Object.fromEntries(
      block.columns.map((key, index) => [
        key,
        block.types[index] === "dict" && row[index] != null
          ? block.dict[key][row[index]]
          : row[index],
      ]),
    ),
  );
}
const identity = read(identityFile, "ppb_entity_dimension").entityDimension;
const expenses = read(expensesFile, "open_un_financial_overview");
assert.equal(identity.edition, edition);
assert.equal(expenses.meta.year, 2025);

const outline = dataset("document_outline");
const narratives = dataset("narratives");
const objectives = dataset("results_objectives");
const performance = dataset("results_performance_narratives");
const planned = dataset("results_areas");
const measures = dataset("results_performance_measures");
const figures = dataset("results_figures");
const figureLinks = dataset("results_figure_links");
const figurePoints = dataset("ppb_figure_points");
const annotations = read(annotationsFile, "chart_annotations");
const missingChartValues = new Set(
  annotations.missing.map((point) => JSON.stringify(point)),
);
const chartPercentages = new Map(
  annotations.percentages.map(([symbol, part, series, scale]) => [
    JSON.stringify([symbol, part, series]),
    scale,
  ]),
);
for (const name of ["narratives", "document_outline"]) {
  const source = identity.sourceFiles.find((item) =>
    item.path.includes(`/${name}/`),
  );
  assert.equal(
    hashes[name],
    source?.sha256,
    `The entity overlay was built against a different ${name} export.`,
  );
}

const priorities = [
  "Maintenance of international peace and security",
  "Promotion of sustained economic growth and sustainable development",
  "Effective coordination of humanitarian assistance efforts",
  "Effective functioning of the organization",
  "Drug control, crime prevention and combating terrorism",
  "Promotion and protection of human rights",
  "Promotion of international justice and law",
  "Development of Africa",
  "Disarmament",
];
assert.deepEqual(priorities.toSorted(), expenses.meta.priorities.toSorted());

const clean = (value) => String(value ?? "").trim();
const nameKey = (value) =>
  clean(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const slug = (value) => nameKey(value).replaceAll(" ", "-");
const leaf = (path) => clean(path).split(" > ").at(-1);
const plainHeading = (text) =>
  clean(text)
    .replace(/^(?:[IVXLCDM]+|\d+)[.)]\s+|^\([a-z]\)\s+/i, "")
    .replace(/^(?:Subprogramme|Component)\s+\d+\s*[-–—.:]\s*/i, "")
    .replace(
      /\s*[-–—]\s*(?:Objective|Regular budget resources|Strategy and external factors for \d+)$/i,
      "",
    );
const subprogrammeHeading = (text) => {
  const match = /^Subprogramme\s+(\d+)\s*[-–—.:]\s*(.+)$/i.exec(clean(text));
  return match && { number: Number(match[1]), name: clean(match[2]) };
};
const doc = (symbol, page) =>
  `https://documents.un.org/api/symbol/access?s=${encodeURIComponent(symbol)}&l=en&t=pdf${Number.isInteger(page) ? `#page=${page}` : ""}`;

const financeByCode = new Map(
  expenses.entities.map((entity) => [nameKey(entity.code), entity]),
);
const financeByName = Map.groupBy(expenses.entities, (entity) =>
  nameKey(entity.name),
);
const financeByBudgetLabel = Map.groupBy(
  expenses.records.filter(
    (record) =>
      record.budget_reporting_identity?.edition === edition &&
      record.budget_reporting_identity?.reportingYear === expenses.meta.year,
  ),
  (record) => nameKey(record.budget_reporting_identity.name),
);
const entitiesById = new Map(
  identity.entities.map((entity) => [entity.entityId, entity]),
);
const relationships = Map.groupBy(identity.relationships, (item) =>
  String(item.section),
);
const ownerBySection = new Map();
for (const [section, items] of relationships) {
  const owners = items.filter((item) => item.relationship === "section_owner");
  if (owners.length === 1)
    ownerBySection.set(section, entitiesById.get(owners[0].entityId));
}

const financeAliases = {
  "Ethics Office": "EO",
  "RC system": "RCS",
  "SEA Coordinator": "OSC-SEA",
  "SRSG-CAAC": "OSRSG-CAAC",
  "SRSG-SVC": "OSRSG-SVC",
  "SRSG-VAC": "OSRSG-VAC",
  UNOCT: "OCT",
  UNOMS: "OMBUD",
  "UNSDG SWEO": "SWEO",
  CMP: "CMP-CYPRUS",
};
const nameAliases = new Map(
  [
    [
      "Analytical Support and Sanctions Monitoring Team pursuant to resolutions 1526 (2004) and 2253 (2015) concerning Islamic State in Iraq and the Levant (Da’esh), Al-Qaida and the Taliban and associated individuals and entities",
      "ASM-AQMT",
    ],
    ["Office of the Focal Point for Delisting", "Focal Point"],
    // The 2027 Section 3/Add.2 fascicle documents the mission's rename.
    [
      "Mission of the Secretary-General’s Good Offices in Cyprus",
      "OSASG-Cyprus",
    ],
    [
      "Support for the implementation of Security Council resolution 1559 (2004)",
      "OSESG-SCRES1559",
    ],
  ].map(([name, code]) => [nameKey(name), code]),
);
function findFinance(entity) {
  const alias =
    financeAliases[entity.acronym] ??
    nameAliases.get(nameKey(entity.canonicalName));
  if (alias === "RCS") {
    const cells = expenses.records
      .filter((row) => row.original_code === "RCS")
      .map((row) => ({ priority_area: row.priority_area, amount: row.amount }));
    assert(
      cells.length,
      "The Resident Coordinator system has no original-code records.",
    );
    return { code: "RCS", name: entity.canonicalName, cells };
  }
  const code = financeByCode.get(nameKey(alias ?? entity.acronym));
  if (code) return code;
  const budgetCodes = new Set(
    (financeByBudgetLabel.get(nameKey(entity.canonicalName)) ?? []).map(
      (record) => record.code,
    ),
  );
  if (budgetCodes.size === 1)
    return financeByCode.get(nameKey([...budgetCodes][0]));
  const matches = financeByName.get(nameKey(entity.canonicalName));
  return matches?.length === 1 ? matches[0] : undefined;
}
const headingFor = new Map();
for (const row of outline.filter((row) => row.node_kind === "heading")) {
  const key = `${row.symbol}|${nameKey(plainHeading(row.text))}`;
  const values = headingFor.get(key) ?? [];
  values.push(row);
  headingFor.set(key, values);
}
const outlineByPosition = new Map(
  outline.map((row) => [`${row.symbol}|${row.position}`, row]),
);

const unitKey = (row) =>
  JSON.stringify([
    row.symbol,
    row.unit_type,
    row.unit_no,
    nameKey(row.unit_name),
  ]);
const resultKey = (row) =>
  JSON.stringify([
    row.context,
    nameKey(row.result_title),
    clean(row.result_label),
  ]);
const units = new Map();
function unit(row) {
  const key = unitKey(row);
  if (!units.has(key)) {
    units.set(key, { row, objectives: [], strategy: [], results: new Map() });
  }
  return units.get(key);
}
function result(row) {
  const owner = unit(row);
  const exact = resultKey(row);
  const sameTitle = [...owner.results.values()].filter(
    (item) =>
      item.context === row.context &&
      nameKey(item.title) === nameKey(row.result_title),
  );
  if (owner.results.has(exact)) return owner.results.get(exact);
  if (
    sameTitle.length === 1 &&
    nameKey(row.result_title) &&
    (!row.result_label || !sameTitle[0].label)
  ) {
    return sameTitle[0];
  }
  const item = {
    context: row.context,
    label: clean(row.result_label),
    title: clean(row.result_title),
    narrative: "",
    measures: [],
    figures: [],
  };
  owner.results.set(exact, item);
  return item;
}
for (const row of objectives)
  unit(row).objectives.push(clean(row.objective_text));
for (const row of [...performance, ...planned]) {
  const item = result(row);
  item.narrative = clean(row.narrative);
  item.performanceYear = row.performance_year ?? undefined;
}
for (const row of measures) {
  const item = result(row);
  const value = clean(row.value_text ?? row.value_raw);
  if (!value) continue;
  item.measures.push({
    label: clean(row.measure_title ?? row.table_label),
    year: row.calendar_year,
    type: row.value_type,
    value,
  });
}
const figureKey = (row) =>
  JSON.stringify([row.symbol, nameKey(row.figure_label)]);
const linksByFigure = Map.groupBy(
  figureLinks.filter(
    (row) => row.link_status === "linked_label" && row.figure_label,
  ),
  figureKey,
);
const pointsByFigure = Map.groupBy(figurePoints, figureKey);
for (const row of figures) {
  const item = result(row);
  const key = figureKey(row);
  const matches = linksByFigure.get(key) ?? [];
  const chartParts =
    matches.length === 1 ? clean(matches[0].chart_parts).split("|") : [];
  const candidates = (pointsByFigure.get(key) ?? []).filter(
    (point) =>
      chartParts.includes(point.chart_part) && typeof point.value === "number",
  );
  const points = candidates.filter(
    (point) =>
      !missingChartValues.has(
        JSON.stringify([
          point.symbol,
          point.chart_part,
          point.series_index,
          point.point_index,
        ]),
      ),
  );
  const pages = new Set(
    candidates
      .map(
        (point) =>
          outlineByPosition.get(`${point.symbol}|${point.figure_position}`)
            ?.page,
      )
      .filter(Number.isInteger),
  );
  const series = Map.groupBy(points, (point) =>
    JSON.stringify([point.chart_part, point.series_index]),
  );
  item.figures.push({
    label: clean(row.figure_label),
    title: clean(row.measure_title),
    subtitle: clean(row.measure_subtitle),
    ...(pages.size === 1 ? { source: doc(row.symbol, [...pages][0]) } : {}),
    series: [...series.values()].map((values) => {
      const first = values[0];
      const percentageScale = chartPercentages.get(
        JSON.stringify([first.symbol, first.chart_part, first.series_index]),
      );
      return {
        name: clean(first.series_name),
        ...(percentageScale ? { percent: true } : {}),
        points: values.map((point) => ({
          category: clean(point.category),
          value:
            percentageScale === 100
              ? Number((point.value * 100).toPrecision(10))
              : point.value,
        })),
      };
    }),
  });
}

const strategy = narratives.filter((row) => row.family === "strategy");
const strategyByPath = Map.groupBy(
  strategy,
  (row) => `${row.symbol}|${nameKey(plainHeading(leaf(row.unit_path)))}`,
);
const usedStrategy = new Set();
const defaultHosts = {
  3: "DPPA",
  5: "DPO",
  8: "OLA",
  18: "ECA",
  24: "OHCHR",
  27: "OCHA",
};
const entityLabels = new Map();
for (const item of identity.relationships) {
  if (
    ["project_responsibility", "implementing_entity"].includes(
      item.relationship,
    )
  )
    continue;
  const entity = entitiesById.get(item.entityId);
  for (const label of [
    entity.canonicalName,
    item.sourceLabel,
    ...entity.aliases,
  ]) {
    entityLabels.set(`${item.section}|${nameKey(label)}`, entity);
  }
}
function ownerOf(row) {
  const named = entityLabels.get(`${row.section}|${nameKey(row.unit_name)}`);
  if (named) return named;
  const wholeSection = ownerBySection.get(row.section);
  if (wholeSection) return wholeSection;
  const host = defaultHosts[row.section];
  if (
    host &&
    ["subprogramme", "component", "section"].includes(row.unit_type)
  ) {
    return entitiesById.get(
      relationships
        .get(row.section)
        .find((item) => entitiesById.get(item.entityId)?.acronym === host)
        .entityId,
    );
  }
  const matches = financeByName.get(nameKey(row.unit_name));
  const finance = matches?.length === 1 ? matches[0] : undefined;
  return { canonicalName: clean(row.unit_name), acronym: finance?.code };
}
function componentParent(row, headings) {
  const parents = new Map();
  for (const heading of headings) {
    const parent = clean(heading.unit_path)
      .split(" > ")
      .map(subprogrammeHeading)
      .filter(Boolean)
      .at(-1);
    if (parent) parents.set(parent.number, parent);
  }
  assert(
    parents.size <= 1,
    `Ambiguous subprogramme for ${row.symbol}: ${row.unit_name}`,
  );
  return parents.values().next().value;
}

const entities = new Map();
function getEntity(identity) {
  const finance = findFinance(identity);
  const name = identity.canonicalName;
  const code =
    finance?.code === "OSASG-Cyprus"
      ? "GOM-Cyprus"
      : (finance?.code ?? identity.acronym);
  const id = slug(code ?? name);
  const existing = entities.get(id);
  if (existing) {
    assert.equal(existing.name, name, `Conflicting entity identifier: ${id}`);
    return existing;
  }
  const amounts = new Map();
  for (const cell of finance?.cells ?? []) {
    amounts.set(
      cell.priority_area,
      (amounts.get(cell.priority_area) ?? 0) + cell.amount,
    );
  }
  const item = {
    id,
    code: code ?? null,
    name,
    kind: [
      "Sectoral advisory services",
      "Regional and subregional advisory services",
    ].includes(name)
      ? "budget-unit"
      : "entity",
    priorities: priorities.filter(
      (priority) => (amounts.get(priority) ?? 0) > 0,
    ),
    overview: [],
    subprogrammes: new Map(),
  };
  entities.set(id, item);
  return item;
}
function getSubprogramme(entity, row, number, name) {
  const id = `${String(row.section).toLowerCase()}-sp-${number}`;
  if (row.section === "16" && number === 9 && name === "Component 1") {
    name = "Provision of secretariat services and substantive support";
  }
  const item = entity.subprogrammes.get(id) ?? {
    id,
    number,
    name,
    sections: [],
  };
  if (item.name === "Component 1" && name !== "Component 1") item.name = name;
  entity.subprogrammes.set(id, item);
  return item;
}
function addContent(entity, row, name, parent, content) {
  const section = { name, symbol: row.symbol, ...content };
  if (parent) {
    const sub = getSubprogramme(entity, row, parent.number, parent.name);
    sub.sections.push(section);
  } else {
    entity.overview.push(section);
  }
}

for (const { row, objectives: objectiveTexts, results } of units.values()) {
  const entity = getEntity(ownerOf(row));
  const key = `${row.symbol}|${nameKey(row.unit_name)}`;
  const headings = headingFor.get(key) ?? [];
  const referenced =
    headings
      .filter((item) => item.page != null)
      .find(
        (item) =>
          item.unit_path === "Programme of work" ||
          item.block_type === "heading-sub",
      ) ?? headings.find((item) => item.page != null);
  const parent =
    row.unit_type === "subprogramme" && /^\d+$/.test(row.unit_no)
      ? { number: Number(row.unit_no), name: row.unit_name }
      : row.unit_type === "component"
        ? componentParent(row, headings)
        : undefined;
  const strategies = strategyByPath.get(key) ?? [];
  if (row.unit_type === "section") {
    const exact = strategy.filter((item) => item.symbol === row.symbol);
    if (exact.length === 1 && !strategies.includes(exact[0]))
      strategies.push(exact[0]);
  }
  for (const item of strategies) usedStrategy.add(item);
  const heading =
    row.unit_type === "component" || !parent || row.unit_name === "Component 1"
      ? clean(row.unit_name)
      : "";
  // The extraction can emit a heading or footnote without a result body.
  const showableResults = [...results.values()].filter(
    (item) => item.narrative || item.measures.length || item.figures.length,
  );
  addContent(entity, row, heading, parent, {
    source: doc(row.symbol, referenced?.page),
    objectives: [...new Set(objectiveTexts.filter(Boolean))],
    strategy: strategies.map((item) => clean(item.text)).filter(Boolean),
    performance: showableResults.filter(
      (item) => item.context === "performance",
    ),
    planned: showableResults.filter((item) => item.context === "planned"),
  });
}

for (const item of strategy) {
  if (usedStrategy.has(item) || !clean(item.text)) continue;
  const heading = leaf(item.unit_path);
  const programme = subprogrammeHeading(heading);
  const owner = ownerOf({
    ...item,
    unit_name: plainHeading(heading),
    unit_type: programme ? "subprogramme" : "entity",
  });
  const known =
    ownerBySection.has(item.section) ||
    entityLabels.has(`${item.section}|${nameKey(plainHeading(heading))}`) ||
    (programme && defaultHosts[item.section]);
  // A fascicle-level narrative in a section shared by several entities is not
  // attributed without a printed owner.
  if (!known) continue;
  const entity = getEntity(owner);
  const source = outlineByPosition.get(`${item.symbol}|${item.position_start}`);
  addContent(entity, item, programme ? "" : plainHeading(heading), programme, {
    source: doc(item.symbol, source?.page),
    objectives: [],
    strategy: [clean(item.text)],
    performance: [],
    planned: [],
  });
  usedStrategy.add(item);
}

const output = [...entities.values()]
  .map((entity) => ({
    ...entity,
    subprogrammes: [...entity.subprogrammes.values()].sort(
      (a, b) =>
        a.number - b.number ||
        a.id.localeCompare(b.id, "en", { numeric: true }),
    ),
  }))
  .sort((a, b) => (a.code ?? a.name).localeCompare(b.code ?? b.name, "en"));

assert(output.length && output.some((entity) => entity.priorities.length > 1));
const snapshot = {
  edition,
  priorityYear: expenses.meta.year,
  hashes,
  priorities,
  entities: output,
};
writeFileSync(
  new URL("../data/ppb-2027.json", import.meta.url),
  JSON.stringify(snapshot) + "\n",
);
console.log(
  `${output.length} entities, ${output.reduce((n, entity) => n + entity.subprogrammes.length, 0)} numbered subprogrammes. ${usedStrategy.size} of ${strategy.length} strategy extracts attributed.`,
);
console.log(
  "Unclassified:",
  output
    .filter((e) => !e.priorities.length)
    .map((e) => e.code ?? e.name)
    .join("; "),
);
console.log(
  "Unattributed strategy:",
  strategy
    .filter((s) => !usedStrategy.has(s))
    .map((s) => `${s.section}: ${s.unit_path}`)
    .join("; "),
);
