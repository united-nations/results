import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../src/lib/result-explorer.ts", import.meta.url),
  "utf8",
).replace(
  '"./search-text"',
  JSON.stringify(new URL("../src/lib/search-text.ts", import.meta.url).href),
);
const {
  explorerSuggestions,
  emptyExplorerFilters,
  filterExplorerResults,
  globalLocation,
  unclassified,
} = await import(
  `data:text/javascript;base64,${Buffer.from(ts.transpile(source, { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext })).toString("base64")}`
);
import { normalizeSearchText } from "../src/lib/search-text.ts";

const rows = [
  {
    id: "a",
    priority: "Peace",
    beneficiaries: ["Women", "Youth"],
    locations: ["KE"],
    budgetKeys: ["part:1", "entity:a"],
    searchText: normalizeSearchText("Éducation for youth in Kenya"),
  },
  {
    id: "b",
    priority: "Development",
    beneficiaries: ["Youth"],
    locations: "global",
    budgetKeys: ["part:2"],
    searchText: "global education",
  },
  {
    id: "c",
    priority: "Peace",
    beneficiaries: [],
    locations: null,
    budgetKeys: ["part:1"],
    searchText: "support member states",
  },
];
const ids = (filters = {}, query = "", omit) =>
  filterExplorerResults(
    rows,
    { ...emptyExplorerFilters, ...filters },
    query,
    omit,
  ).map((row) => row.id);

test("filters use OR within a dimension and AND across dimensions without duplicating shared beneficiaries", () => {
  assert.deepEqual(ids({ beneficiary: ["Women", "Youth"] }), ["a", "b"]);
  assert.deepEqual(
    ids({ beneficiary: ["Women", "Youth"], priority: ["Peace"] }),
    ["a"],
  );
  assert.deepEqual(ids({ budget: ["entity:a"], location: ["KE"] }), ["a"]);
});
test("global coverage and untagged locations stay separate from country tags", () => {
  assert.deepEqual(ids({ location: [globalLocation] }), ["b"]);
  assert.deepEqual(ids({ location: [unclassified] }), ["c"]);
  assert.deepEqual(ids({ beneficiary: [unclassified] }), ["c"]);
  assert.deepEqual(ids({ location: ["KE", globalLocation] }), ["a", "b"]);
});
test("search matches all normalized words alongside filters", () => {
  assert.deepEqual(ids({}, "  EDUCATION  youth "), ["a"]);
  assert.deepEqual(ids({ location: [globalLocation] }, "éducation"), ["b"]);
  assert.deepEqual(ids({}, "unknown phrase"), []);
});
test("facet counts can ignore their own selection while retaining other constraints", () => {
  assert.deepEqual(
    ids(
      { beneficiary: ["Women"], priority: ["Development"] },
      "",
      "beneficiary",
    ),
    ["b"],
  );
});

test("category suggestions rank exact matches, preserve programme context, and omit selected values", () => {
  const options = {
    priority: [{ value: "Peace", label: "Maintenance of peace" }],
    beneficiary: [],
    location: [{ value: "KE", label: "Kenya" }],
    budget: [
      {
        value: "entity:desa",
        label: "DESA · Department of Economic and Social Affairs",
      },
      {
        value: "programme:desa:3",
        label: "DESA / Subprogramme 3 · Sustainable development",
      },
    ],
  };
  assert.equal(
    explorerSuggestions(options, emptyExplorerFilters, "KENYA")[0].value,
    "KE",
  );
  assert.equal(
    explorerSuggestions(options, emptyExplorerFilters, "desa")[0].kind,
    "Entity",
  );
  const programme = explorerSuggestions(
    options,
    emptyExplorerFilters,
    "sustainable",
  )[0];
  assert.equal(programme.kind, "Subprogramme");
  assert.match(programme.label, /DESA/);
  assert.deepEqual(
    explorerSuggestions(
      options,
      { ...emptyExplorerFilters, location: ["KE"] },
      "kenya",
    ),
    [],
  );
  assert.deepEqual(
    explorerSuggestions(options, emptyExplorerFilters, "  "),
    [],
  );
});
