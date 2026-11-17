import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatBudgetHeading,
  formatBudgetText,
} from "../src/lib/budget-text.ts";

test("budget headings capitalize the opening word and retain source casing elsewhere", () => {
  assert.equal(
    formatBudgetHeading("strengthened support for the UN and Member States"),
    "Strengthened support for the UN and Member States",
  );
  assert.equal(
    formatBudgetHeading("“évaluation des progrès”"),
    "“Évaluation des progrès”",
  );
  assert.equal(
    formatBudgetHeading("e-deleGATE is available"),
    "e-deleGATE is available",
  );
  assert.equal(formatBudgetHeading("SDG reporting"), "SDG reporting");
  assert.equal(formatBudgetHeading("2027 targets"), "2027 targets");
});

test("budget paragraph prefixes become prose and lettered strategies keep nested bullets", () => {
  const result = formatBudgetText([
    "31.III.3 The Office will:\n(a) Provide support;\n(b) Work with partners:\n(i) Share evidence;\n(ii) Publish guidance.\n31.III.4 Work continues.",
    "137. The amount was 2.5 million.\n2.5 million people were reached.",
  ]);
  assert.deepEqual(result, [
    { kind: "paragraph", text: "The Office will:" },
    {
      kind: "list",
      items: [
        { text: "Provide support;", children: [] },
        {
          text: "Work with partners:",
          children: ["Share evidence;", "Publish guidance."],
        },
      ],
    },
    { kind: "paragraph", text: "Work continues." },
    { kind: "paragraph", text: "The amount was 2.5 million." },
    { kind: "paragraph", text: "2.5 million people were reached." },
  ]);
});

test("inline source outlines become bullets without stripping legal citations", () => {
  const [intro, list, prose] = formatBudgetText([
    "5.I.22 These included: (a) policy guidance; (b) training.\nUnder article 5 (a) of the agreement, guidance continues.",
  ]);
  assert.deepEqual(intro, { kind: "paragraph", text: "These included:" });
  assert.deepEqual(list, {
    kind: "list",
    items: [
      { text: "policy guidance;", children: [] },
      { text: "training.", children: [] },
    ],
  });
  assert.equal(
    prose.text,
    "Under article 5 (a) of the agreement, guidance continues.",
  );
});
