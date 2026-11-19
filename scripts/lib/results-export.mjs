import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const requiredResultsDatasets = [
  "document_outline",
  "narratives",
  "results_objectives",
  "results_areas",
  "results_performance_narratives",
  "results_performance_measures",
  "results_figures",
  "results_figure_links",
  "ppb_figure_points",
  "budget_entity_groups",
];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function verifyResultsExport(
  portalData,
  identityFile,
  annotationsFile,
  edition,
) {
  const logicalRoot = resolve(portalData, "..");
  const root = realpathSync(logicalRoot);
  assert.equal(
    realpathSync(portalData),
    resolve(root, "portal-data"),
    "Expected the results bundle's portal-data directory",
  );
  const manifestBytes = readFileSync(resolve(root, "manifest.json"));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(
    manifest.schemaVersion,
    1,
    "Unsupported results export manifest",
  );
  assert.equal(manifest.kind, "programme-budget-results-export");
  assert.equal(
    manifest.scope,
    "results-only",
    "A complete results-only export is required",
  );
  assert.equal(manifest.edition, edition, "Results export edition mismatch");
  assert.equal(
    manifest.producerCodeState,
    "clean",
    "Development exports from uncommitted code cannot be imported",
  );
  assert.ok(
    Array.isArray(manifest.inputs) && manifest.inputs.length,
    "Missing source provenance",
  );
  assert.ok(
    Array.isArray(manifest.codeInputs) && manifest.codeInputs.length,
    "Missing extractor provenance",
  );
  assert.match(
    manifest.producerGitHead ?? "",
    /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/,
    "Missing producer commit",
  );
  for (const [label, descriptors] of [
    ["source", manifest.inputs],
    ["extractor", manifest.codeInputs],
  ]) {
    const paths = new Set();
    for (const item of descriptors) {
      assert.ok(
        item &&
          typeof item.path === "string" &&
          item.path.length > 0 &&
          !isAbsolute(item.path) &&
          !item.path.split(/[\\/]/).includes(".."),
        `Invalid ${label} provenance path`,
      );
      assert.match(
        item.sha256 ?? "",
        /^[a-f0-9]{64}$/,
        `Invalid ${label} provenance checksum`,
      );
      assert.ok(!paths.has(item.path), `Duplicate ${label} provenance input`);
      paths.add(item.path);
    }
  }
  assert.ok(Array.isArray(manifest.outputs), "Missing output checksums");
  const outputs = new Map();
  const verifiedBytes = new Map();
  const aliases = new Map();
  for (const item of manifest.outputs) {
    assert.ok(
      typeof item.path === "string" && !isAbsolute(item.path),
      "Invalid bundle output path",
    );
    const path = resolve(root, item.path);
    assert.ok(
      path.startsWith(`${root}${sep}`),
      "Bundle output escapes its root",
    );
    assert.ok(
      realpathSync(path).startsWith(`${root}${sep}`),
      "Bundle output points outside its root",
    );
    assert.ok(!outputs.has(item.path), `Duplicate output entry: ${item.path}`);
    assert.match(item.sha256, /^[a-f0-9]{64}$/, "Invalid output checksum");
    const bytes = readFileSync(path);
    assert.equal(
      sha(bytes),
      item.sha256,
      `Stale or modified export: ${item.path}`,
    );
    outputs.set(item.path, item.sha256);
    verifiedBytes.set(path, bytes);
  }
  for (const dataset of requiredResultsDatasets) {
    assert.ok(
      outputs.has(`portal-data/ppb/${dataset}/${edition}.json`),
      `Missing results export dataset: ${dataset}`,
    );
  }
  for (const input of [
    resolve(root, "portal-data/reference.json"),
    identityFile,
    annotationsFile,
  ]) {
    const path = realpathSync(input);
    assert.ok(
      outputs.has(relative(root, path)),
      `Import input is not bound to this export: ${path}`,
    );
    aliases.set(resolve(input), path);
  }
  return {
    manifest,
    sha256: sha(manifestBytes),
    readInput(path) {
      const requested = resolve(path);
      const capturedPath =
        aliases.get(requested) ??
        (requested.startsWith(`${logicalRoot}${sep}`)
          ? resolve(root, relative(logicalRoot, requested))
          : requested);
      const bytes = verifiedBytes.get(capturedPath);
      assert.ok(bytes, "Input was not captured in the verified export");
      return Buffer.from(bytes);
    },
  };
}
