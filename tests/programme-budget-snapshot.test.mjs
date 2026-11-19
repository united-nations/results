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

test("paired source tables stay with their printed reported and planned results", () => {
  const entity = entities.find((entity) => entity.id === "asm-aqmt");
  const performance = entity.overview
    .flatMap((section) => section.performance)
    .find(
      (result) =>
        result.title === "Enhanced analysis to follow an evolving threat",
    );
  const planned = entity.overview
    .flatMap((section) => section.planned)
    .find(
      (result) =>
        result.title === "Strengthened analysis to follow an evolving threat",
    );
  assert.ok(performance.measures.length);
  assert.ok(planned.measures.length);
  assert.ok(
    performance.measures.every((measure) => measure.label === "Table 45"),
  );
  assert.ok(planned.measures.every((measure) => measure.label === "Table 46"));
});

test("ECA component objectives, strategies and citations retain their separate printed owners", () => {
  const entity = entities.find((entity) => entity.id === "eca");
  const programme = entity.subprogrammes.find(
    (programme) => programme.number === 7,
  );
  for (const [region, paragraph, page] of [
    ["North", "18.99", 45],
    ["West", "18.112", 50],
    ["Central", "18.125", 54],
    ["Eastern", "18.138", 59],
    ["Southern", "18.152", 64],
  ]) {
    const section = programme.sections.find(
      (section) =>
        section.name === `Subregional activities in ${region} Africa`,
    );
    assert.ok(section, region);
    assert.equal(section.objectives.length, 1);
    assert.ok(section.objectives[0].length < 600);
    assert.doesNotMatch(
      section.objectives[0],
      /To contribute to the objective/,
    );
    assert.equal(section.strategy.length, 1);
    assert.ok(section.strategy[0].startsWith(paragraph));
    assert.ok(section.source.endsWith(`#page=${page}`));
  }
  assert.ok(
    programme.sections.every(
      (section) => section.component || section.strategy.length === 0,
    ),
  );
});

test("refreshed result figures have explicit titles and source-bound extraction provenance", () => {
  const snapshot = JSON.parse(
    readFileSync(new URL("../data/ppb-2027.json", import.meta.url), "utf8"),
  );
  assert.equal(snapshot.extraction.producerCodeState, "clean");
  assert.match(snapshot.extraction.producerGitHead, /^[a-f0-9]{40}$/);
  assert.ok(
    snapshot.extraction.inputs.some((input) => input.path.endsWith(".docx")),
  );
  assert.ok(
    snapshot.extraction.inputs.some((input) =>
      input.path.endsWith("spm-catalogue.json"),
    ),
  );
  for (const entity of entities) {
    for (const section of [
      ...entity.overview,
      ...entity.subprogrammes.flatMap((programme) => programme.sections),
    ]) {
      for (const result of [...section.performance, ...section.planned]) {
        if (result.figures.length)
          assert.ok(
            result.title.trim(),
            `${entity.id}: untitled figure result`,
          );
      }
    }
  }
});

test("historical performance annex subprogrammes retain their printed page anchors", () => {
  for (const [entityId, programmeId, page] of [
    ["oda", "4-sp-4", 30],
    ["oda", "4-sp-5", 31],
    ["un-habitat", "15-sp-3", 30],
    ["un-habitat", "15-sp-4", 32],
  ]) {
    const entity = entities.find((entity) => entity.id === entityId);
    const programme = entity?.subprogrammes.find(
      (programme) => programme.id === programmeId,
    );
    assert.ok(programme, `${entityId}: ${programmeId}`);
    assert.ok(
      programme.sections.some((section) =>
        section.source.endsWith(`#page=${page}`),
      ),
      `${entityId}: ${programmeId} historical page ${page}`,
    );
  }
});
