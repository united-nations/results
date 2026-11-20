import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
const data = JSON.parse(read("public/data/secretariat-deliverables-2027.json"));
const evidence = JSON.parse(read("data/secretariat-deliverables-sources.json"));
const entities = JSON.parse(read("data/ppb-2027.json")).entities;

test("deliverable observations preserve source scopes, periods, missingness and document links", () => {
  assert.equal(
    new Set(data.records.map((item) => item.id)).size,
    data.records.length,
  );
  assert.equal(
    data.records.length,
    evidence.numericLeaves + evidence.narrativeLeaves,
  );
  assert.equal(evidence.retrievedAt, data.retrievedAt);
  assert.equal(
    evidence.mappingSnapshotSha256,
    createHash("sha256").update(read("data/ppb-2027.json")).digest("hex"),
  );
  assert.deepEqual(
    [...new Set(data.records.map((item) => item.categoryCode))].sort(),
    ["A", "B", "C", "D", "E"],
  );
  for (const item of data.records) {
    const url = new URL(item.source);
    assert.equal(url.origin, "https://documents.un.org");
    assert.equal(url.searchParams.get("s"), item.symbol);
    assert.equal(
      new Set(
        item.observations.map((entry) => `${entry.year}:${entry.measure}`),
      ).size,
      item.observations.length,
    );
    for (const entry of item.observations) {
      assert.ok(entry.value === null || Number.isFinite(entry.value));
      if (entry.measure === "actual") assert.equal(entry.year, 2025);
    }
    if (item.kind === "narrative") assert.equal(item.observations.length, 0);
    if (item.attribution === "matched-entity") {
      const entity = entities.find((entity) => entity.id === item.entity.id);
      assert.ok(entity);
      assert.equal(item.entity.name, entity.name);
      assert.equal(item.priority, entity.mainPriority || "Other budget units");
    } else assert.ok(item.entity.id.startsWith("source-"));
  }
  assert.ok(
    data.records.some((item) =>
      item.observations.some((entry) => entry.value === 0),
    ),
  );
  assert.ok(
    data.records.some((item) =>
      item.observations.some((entry) => entry.value === null),
    ),
  );
});

test("human-rights attribution and component distinctions survive the deliverables export", () => {
  const humanRights = data.records.filter(
    (item) =>
      item.symbol === "A/81/6 (Sect. 24)" &&
      item.programme.startsWith("Subprogramme"),
  );
  assert.ok(humanRights.length > 100);
  assert.ok(humanRights.every((item) => item.entity.id === "ohchr"));
  const components = data.records.filter(
    (item) => item.sourceLevel === "component",
  );
  assert.ok(components.length > 0);
  assert.ok(
    components.every(
      (item) =>
        item.component &&
        item.programme.includes(`Component ${item.component}`),
    ),
  );
  assert.ok(
    data.records.some(
      (item) =>
        item.sourceLevel === "programme" &&
        item.programme === "Programme-wide deliverables",
    ),
  );
});
