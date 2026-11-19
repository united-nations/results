import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  requiredResultsDatasets,
  verifyResultsExport,
} from "../scripts/lib/results-export.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "results-export-test-"));
  const paths = [
    ...requiredResultsDatasets.map(
      (name) => `portal-data/ppb/${name}/2027.json`,
    ),
    "portal-data/reference.json",
    "entity-overlay-2027.json",
    "chart-annotations-2027.json",
  ];
  const outputs = paths.map((path) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    const bytes = "{}\n";
    writeFileSync(join(root, path), bytes);
    return { path, sha256: createHash("sha256").update(bytes).digest("hex") };
  });
  const manifest = {
    schemaVersion: 1,
    kind: "programme-budget-results-export",
    scope: "results-only",
    edition: 2027,
    producerCodeState: "clean",
    producerGitHead: "c".repeat(40),
    inputs: [{ path: "source.docx", sha256: "a".repeat(64) }],
    codeInputs: [{ path: "extract.py", sha256: "b".repeat(64) }],
    outputs,
  };
  const save = () =>
    writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
  save();
  return {
    root,
    manifest,
    save,
    verify: () =>
      verifyResultsExport(
        join(root, "portal-data"),
        join(root, "entity-overlay-2027.json"),
        join(root, "chart-annotations-2027.json"),
        2027,
      ),
  };
}

test("source-bound results export accepts its complete unchanged bundle", () => {
  const data = fixture();
  try {
    assert.match(data.verify().sha256, /^[a-f0-9]{64}$/);
  } finally {
    rmSync(data.root, { recursive: true });
  }
});

test("stale or mixed extraction artifacts fail closed", () => {
  const data = fixture();
  try {
    writeFileSync(
      join(data.root, "portal-data/ppb/results_figures/2027.json"),
      '{"rows":["wrong owner"]}',
    );
    assert.throws(data.verify, /Stale or modified export/);
  } finally {
    rmSync(data.root, { recursive: true });
  }
});

for (const defect of [
  "missing dataset",
  "wrong edition",
  "partial scope",
  "missing provenance",
  "duplicate output",
  "path escape",
  "uncommitted producer",
  "malformed source",
  "malformed extractor",
  "duplicate source",
  "missing producer commit",
]) {
  test(`negative control: reject ${defect}`, () => {
    const data = fixture();
    try {
      if (defect === "malformed source") data.manifest.inputs = [{}];
      if (defect === "malformed extractor") data.manifest.codeInputs = [{}];
      if (defect === "duplicate source")
        data.manifest.inputs.push(data.manifest.inputs[0]);
      if (defect === "missing producer commit")
        delete data.manifest.producerGitHead;
      if (defect === "uncommitted producer")
        data.manifest.producerCodeState = "modified";
      if (defect === "missing dataset") data.manifest.outputs.shift();
      if (defect === "wrong edition") data.manifest.edition = 2026;
      if (defect === "partial scope") data.manifest.scope = "partial";
      if (defect === "missing provenance") data.manifest.codeInputs = [];
      if (defect === "duplicate output")
        data.manifest.outputs.push(data.manifest.outputs[0]);
      if (defect === "path escape")
        data.manifest.outputs[0].path = "../escape.json";
      data.save();
      assert.throws(data.verify);
    } finally {
      rmSync(data.root, { recursive: true });
    }
  });
}

test("a bundle replacement after verification cannot mix new bytes into the import", () => {
  const data = fixture();
  try {
    const verified = data.verify();
    const path = join(data.root, "portal-data/ppb/results_figures/2027.json");
    writeFileSync(path, '{"rows":["new export"]}');
    assert.deepEqual(JSON.parse(verified.readInput(path)), {});
    assert.throws(() => verified.readInput(join(data.root, "unverified.json")));
  } finally {
    rmSync(data.root, { recursive: true });
  }
});

test("verified input snapshots also work through linked checkout data directories", () => {
  const data = fixture();
  const alias = `${data.root}-linked`;
  try {
    symlinkSync(data.root, alias, "dir");
    const verified = verifyResultsExport(
      join(alias, "portal-data"),
      join(alias, "entity-overlay-2027.json"),
      join(alias, "chart-annotations-2027.json"),
      2027,
    );
    assert.deepEqual(
      JSON.parse(
        verified.readInput(
          join(alias, "portal-data/ppb/results_figures/2027.json"),
        ),
      ),
      {},
    );
    assert.deepEqual(
      JSON.parse(verified.readInput(join(alias, "entity-overlay-2027.json"))),
      {},
    );
  } finally {
    rmSync(alias, { force: true });
    rmSync(data.root, { recursive: true });
  }
});
