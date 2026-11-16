import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { entities } = JSON.parse(
  readFileSync(new URL("../data/ppb-2027.json", import.meta.url), "utf8"),
);

test("each directory entry has a description with its own budget citation", () => {
  const descriptions = JSON.parse(
    readFileSync(
      new URL("../data/entity-descriptions-2027.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(
    Object.keys(descriptions).sort(),
    entities.map(({ id }) => id).sort(),
  );
  for (const { id, overview, subprogrammes } of entities) {
    const { text, symbol, locator } = descriptions[id];
    assert.match(text, /\.$/, id);
    assert.ok(locator.trim(), id);
    const content = [
      ...overview,
      ...subprogrammes.flatMap(({ sections }) => sections),
    ];
    assert.ok(
      content.some((section) => section.symbol === symbol),
      id,
    );
  }
});

function findFigure(id, label) {
  const entity = entities.find((item) => item.id === id);
  const sections = [
    ...entity.overview,
    ...entity.subprogrammes.flatMap((item) => item.sections),
  ];
  return sections
    .flatMap((section) => [...section.performance, ...section.planned])
    .flatMap((result) => result.figures)
    .find((figure) => figure.label === label);
}

test("figure values and citations follow the printed budget", () => {
  const meetings = findFigure("dgacm", "Figure 2.IV");
  assert.match(meetings.source, /#page=15$/);
  assert.ok(
    meetings.series.every(({ points }) =>
      points.every(({ category }) => !category.startsWith("2025")),
    ),
  );

  const fellows = findFigure("dgc", "Figure 28.IX");
  const planned = fellows.series.find(
    ({ name }) => name === "Planned number of fellows",
  );
  assert.deepEqual(
    planned.points.map(({ category }) => category),
    ["2024", "2025", "2026", "2027"],
  );

  const targets = findFigure("oict", "Figure 29C.IV");
  assert.equal(targets.series[0].percent, true);
  assert.deepEqual(
    targets.series[0].points.map(({ value }) => value),
    [23, 38, 60, 71, 83],
  );
});

test("renamed and historical finance entities keep their priority", () => {
  for (const id of ["gom-cyprus", "poe-somalia"]) {
    assert.deepEqual(entities.find((entity) => entity.id === id).priorities, [
      "Maintenance of international peace and security",
    ]);
  }
});

test("entities with several priorities have one main spending priority", () => {
  const mainPriority = (id) =>
    entities.find((entity) => entity.id === id).mainPriority;
  assert.equal(mainPriority("eca"), "Development of Africa");
  assert.equal(
    mainPriority("dgc"),
    "Effective functioning of the organization",
  );
  for (const entity of entities) {
    if (entity.priorities.length) {
      assert.ok(entity.priorities.includes(entity.mainPriority), entity.id);
    } else {
      assert.equal(entity.mainPriority, null, entity.id);
    }
  }
});
