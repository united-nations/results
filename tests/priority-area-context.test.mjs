import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { priorityAreaColors } from "../src/lib/priority-area-colors.ts";

const report = JSON.parse(
  readFileSync(
    new URL("../data/priority-area-introductions-2025.json", import.meta.url),
    "utf8",
  ),
);

test("official annual-report introductions cover exactly the nine priority identities", () => {
  assert.equal(report.reportYear, 2025);
  assert.equal(report.areas.length, 9);
  assert.deepEqual(
    new Set(report.areas.map((area) => area.priority)),
    new Set(Object.keys(priorityAreaColors)),
  );
  for (const area of report.areas) {
    assert.ok(Number.isInteger(area.pdfPage) && area.pdfPage > 0);
    assert.deepEqual(
      area.sections.map((section) => section.heading),
      area.priority.startsWith("Effective functioning")
        ? ["Our work and our people"]
        : ["Context", "Our goals"],
    );
    for (const section of area.sections) {
      assert.ok(
        [area.pdfPage * 2 - 2, area.pdfPage * 2 - 1].includes(
          section.printedPage,
        ),
      );
      assert.ok(
        section.paragraphs.every(
          (paragraph) => paragraph.split(/\s+/).length >= 30,
        ),
      );
    }
  }
  assert.match(report.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(new URL(report.inspectedCopy).hostname, "malaysia.un.org");
});

test("law introduction retains the full paragraph across the PDF column", () => {
  const area = report.areas.find(
    (area) => area.priority === "Promotion of international justice and law",
  );
  const goals = area.sections.find(
    (section) => section.heading === "Our goals",
  );
  assert.match(
    goals.paragraphs[0],
    /^The United Nations promotes justice and international law/,
  );
  assert.match(
    goals.paragraphs[0],
    /provides advisory opinions on legal questions\.$/,
  );
});
