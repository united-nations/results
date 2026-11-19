import { test } from "node:test";
import assert from "node:assert/strict";
import {
  objectiveSource,
  unitHeadingSource,
} from "../scripts/lib/programme-budget-sources.mjs";

const text =
  "18.151 The objective, to which this component contributes, is to deepen regional integration in Southern Africa.";
test("objective citations use the printed text instead of a repeated budget heading", () => {
  const printed = { node_kind: "text", family: "objective", text, page: 64 };
  const budgetHeading = {
    node_kind: "heading",
    family: "budget",
    text: "Component 5 – Subregional activities in Southern Africa",
    page: 102,
    block_type: "heading-sub",
  };
  assert.equal(objectiveSource([budgetHeading, printed], [text]), printed);
  assert.equal(unitHeadingSource([budgetHeading]), undefined);
});

test("multiline objectives locate their first complete printed paragraph", () => {
  const printed = { node_kind: "text", family: "objective", text, page: 64 };
  assert.equal(
    objectiveSource(
      [printed],
      [`${text}\nAn additional objective paragraph remains intact.`],
    ),
    printed,
  );
});

test("ambiguous or unlocated objective text never invents a page", () => {
  assert.equal(
    objectiveSource(
      [
        { node_kind: "text", family: "objective", text, page: 64 },
        { node_kind: "text", family: "objective", text, page: 102 },
      ],
      [text],
    ),
    undefined,
  );
  assert.equal(
    objectiveSource(
      [{ node_kind: "text", family: "objective", text, page: null }],
      [text],
    ),
    undefined,
  );
  assert.equal(
    objectiveSource(
      [{ node_kind: "heading", family: "objective", text, page: 64 }],
      [text],
    ),
    undefined,
  );
});

test("heading fallback skips contents and budget echoes", () => {
  const programme = {
    page: 62,
    family: "programme_performance",
    text: "Component 5",
    block_type: "heading-sub",
  };
  assert.equal(
    unitHeadingSource([
      { ...programme, page: 3, unit_path: "Contents" },
      { ...programme, page: 102, family: "budget" },
      programme,
    ]),
    programme,
  );
});

test("ambiguous repeated programme headings leave the fallback page unresolved", () => {
  assert.equal(
    unitHeadingSource([
      { page: 62, family: "objective", block_type: "heading-sub" },
      { page: 64, family: "objective", block_type: "heading-sub" },
    ]),
    undefined,
  );
});

test("explicit performance-annex subprogrammes retain their printed page citations", () => {
  const printed = {
    page: 30,
    family: "annex",
    block_type: "subprogramme",
    unit_path: "Annex – Programme performance in 2025",
    text: "Subprogramme 4 – Information and outreach",
  };
  assert.equal(
    unitHeadingSource([{ ...printed, page: 12, family: "budget" }, printed]),
    printed,
  );
  assert.equal(
    unitHeadingSource([
      { ...printed, unit_path: "Annex II – Staffing distribution" },
    ]),
    undefined,
  );
  assert.equal(
    unitHeadingSource([printed, { ...printed, page: 31 }]),
    undefined,
  );
});
