import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DataENG } from "../data/oict/DataENG.js";

const { entities } = JSON.parse(
  readFileSync(new URL("../data/ppb-2027.json", import.meta.url), "utf8"),
);

test("each OICT card has one tagged result from the same budget context", () => {
  const tags = JSON.parse(
    readFileSync(
      new URL("../data/oict-result-tags-2027.json", import.meta.url),
    ),
  );
  assert.deepEqual(
    tags.map(({ id }) => id),
    DataENG.map(({ ID }) => ID),
  );
  assert.equal(
    new Set(
      tags.map(({ entity, symbol, kind, title }) =>
        [entity, symbol, kind, title].join("|"),
      ),
    ).size,
    tags.length,
  );
  for (const tag of tags) {
    const { overview, subprogrammes } = entities.find(
      ({ id }) => id === tag.entity,
    );
    const sections = [
      ...overview,
      ...subprogrammes.flatMap(({ sections }) => sections),
    ];
    const result = sections
      .filter(({ symbol }) => symbol === tag.symbol)
      .flatMap((section) => section[tag.kind])
      .filter(({ title }) => title === tag.title);
    assert.equal(result.length, 1, `OICT card ${tag.id}`);
    assert.equal(
      tag.kind,
      DataENG[tag.id].Type === 2025 ? "performance" : "planned",
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
