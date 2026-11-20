import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const load = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const functions = load("../data/system-entity-functions-2025.json");
const directory = load("../data/system-entities.json");
const close = (actual, expected, message) =>
  assert.ok(
    Math.abs(actual - expected) < 1,
    `${message}: ${actual} vs ${expected}`,
  );

test("CEB functions reconcile to the system and entity expenditure snapshots", () => {
  assert.equal(functions.year, directory.year);
  assert.deepEqual(functions.functions.map((item) => item.key).sort(), [
    "development",
    "global",
    "humanitarian",
    "peace",
  ]);
  close(functions.totalSpending, directory.totalSpending, "System total");
  close(
    functions.functions.reduce((sum, item) => sum + item.spending, 0),
    functions.totalSpending,
    "Function total",
  );
  for (const item of functions.functions) {
    close(
      Object.values(functions.entities).reduce(
        (sum, entity) => sum + (entity.spending[item.key] ?? 0),
        0,
      ),
      item.spending,
      item.key,
    );
    assert.ok(
      Math.abs(item.share - item.spending / functions.totalSpending) < 1e-10,
    );
  }
  for (const entity of directory.entities) {
    const record = functions.entities[entity.code];
    assert.ok(record, `Missing function reporting for ${entity.code}`);
    close(
      Object.values(record.spending).reduce((sum, value) => sum + value, 0),
      entity.spending,
      entity.code,
    );
    assert.ok(record.spending[record.primaryFunction] > 0);
    assert.equal(
      record.spending[record.primaryFunction],
      Math.max(...Object.values(record.spending)),
    );
  }
  assert.ok(functions.entities.UNODC);
  assert.equal(
    directory.entities.some((entity) => entity.code === "UNODC"),
    false,
  );
});
