import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { groupEntities } from "../src/lib/entity-presentation.ts";
const snapshot = JSON.parse(
  readFileSync(new URL("../data/ppb-2027.json", import.meta.url)),
);

test("grouping preserves every entity once, including unlisted entities and current priority assignments", () => {
  for (const priority of new Set(
    snapshot.entities.map((entity) => entity.mainPriority ?? "Other"),
  )) {
    const entities = snapshot.entities.filter(
      (entity) => (entity.mainPriority ?? "Other") === priority,
    );
    const groups = groupEntities(priority, entities);
    const ids = groups.flatMap((group) =>
      group.entities.map((entity) => entity.id),
    );
    assert.deepEqual(
      ids.toSorted(),
      entities.map((entity) => entity.id).toSorted(),
    );
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(groups.every((group) => group.entities.length > 0));
  }
});

test("peace and security leads with departments and uses official mission memberships", () => {
  const priority = "Maintenance of international peace and security";
  const entities = snapshot.entities.filter(
    (entity) => entity.mainPriority === priority,
  );
  const groups = groupEntities(priority, entities.toReversed());
  assert.deepEqual(
    groups[0].entities.slice(0, 2).map((entity) => entity.id),
    ["dppa", "dpo"],
  );
  for (const group of groups.filter((group) =>
    ["envoys", "sanctions", "regional-missions"].includes(group.key),
  )) {
    const addendum = {
      envoys: "Add.2",
      sanctions: "Add.3",
      "regional-missions": "Add.4",
    }[group.key];
    assert.ok(
      group.entities.every((entity) =>
        entity.overview.every((section) => section.symbol.endsWith(addendum)),
      ),
    );
  }
  assert.ok(
    groups
      .find((group) => group.key === "sanctions")
      .entities.some((entity) => entity.id === "asm-aqmt"),
  );
  assert.ok(
    groups
      .find((group) => group.key === "individuals")
      .entities.some((entity) => entity.id === "oosa"),
  );
  assert.deepEqual(groups, groupEntities(priority, entities));
});

test("filters omit empty groups and full entity names determine order within each cluster", () => {
  const entities = [
    { id: "unog", name: "Zebra" },
    { id: "unon", name: "Alpha" },
    { id: "unknown", name: "New entity" },
  ];
  const groups = groupEntities(
    "Effective functioning of the organization",
    entities,
  );
  assert.deepEqual(
    groups.map((group) => group.key),
    ["individuals", "offices-away"],
  );
  assert.deepEqual(
    groups[1].entities.map((entity) => entity.name),
    ["Alpha", "Zebra"],
  );
  assert.deepEqual(
    groupEntities("Unclassified", entities).flatMap((group) =>
      group.entities.map((entity) => entity.name),
    ),
    ["Alpha", "New entity", "Zebra"],
  );
});

test("filtering does not change an unmatched entity's display group", () => {
  assert.equal(
    groupEntities("Effective functioning of the organization", [
      {
        id: "oict",
        name: "Office of Information and Communications Technology",
      },
    ])[0].key,
    "individuals",
  );
});

test("standalone entities always precede labelled groups across all priority areas", () => {
  for (const priority of new Set(
    snapshot.entities.map((entity) => entity.mainPriority ?? "Other"),
  )) {
    const groups = groupEntities(
      priority,
      snapshot.entities.filter(
        (entity) => (entity.mainPriority ?? "Other") === priority,
      ),
    );
    let sawGroup = false;
    for (const group of groups) {
      if (group.label) sawGroup = true;
      else
        assert.equal(
          sawGroup,
          false,
          `${priority}: standalone entities appeared after a group`,
        );
    }
  }
  const groups = groupEntities(
    "Effective functioning of the organization",
    snapshot.entities.filter(
      (entity) =>
        entity.mainPriority === "Effective functioning of the organization",
    ),
  );
  assert.ok(groups[0].entities.some((entity) => entity.id === "eo"));
  assert.equal(groups[1].key, "offices-away");
});
