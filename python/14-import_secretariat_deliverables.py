"""Import source deliverable leaves without summing overlapping parent totals."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
import math
from pathlib import Path
import re
import subprocess
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]


def normalize(value):
    value = re.sub(r"^(?:[IVXLCDM]+|\d+)\.\s*", "", value.strip())
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def select_entity(row, candidates):
    label = row["entity"].strip()
    names = [normalize(label), normalize(row["table_title"].split(":")[0])]
    matches = [entity for entity in candidates if normalize(entity["name"]) in names or normalize(entity["code"] or "") in [name for name in names if name]]
    if len(matches) == 1:
        return matches[0]
    # Named units in shared documents must never be replaced by a section host.
    if not label and row["subprogramme_no"]:
        hosts = {"3": "dppa", "5": "dpo", "8": "ola", "18": "eca", "24": "ohchr", "27": "ocha"}
        host = next((entity for entity in candidates if entity["id"] == hosts.get(row["section"])), None)
        if host:
            return host
    if len(candidates) == 1 and (not label or normalize(candidates[0]["name"]) == normalize(label)):
        return candidates[0]
    return None


def main(source):
    mapping_bytes = (ROOT / "data/ppb-2027.json").read_bytes()
    snapshot = json.loads(mapping_bytes)
    entities = snapshot["entities"]
    by_symbol = {}
    for entity in entities:
        for section in entity["overview"] + [s for p in entity["subprogrammes"] for s in p["sections"]]:
            by_symbol.setdefault(section["symbol"], {})[entity["id"]] = entity
    files = [source / "data/processed/ppb2027/extracted" / name for name in ["deliverables.csv", "deliverables_narrative.csv"]]
    input_bytes = [path.read_bytes() for path in files]
    quantified, narratives = [list(csv.DictReader(io.StringIO(content.decode("utf-8")))) for content in input_bytes]
    grouped = {}
    for row in quantified:
        grouped.setdefault((row["table_uid"], row["row_seq"]), []).append(row)
    parents = {(row["table_uid"], row["parent_seq"]) for row in quantified if row["parent_seq"]}
    leaves = [(rows[0], rows, "numeric") for key, rows in grouped.items() if key not in parents]
    leaves += [(row, [], "narrative") for row in narratives]
    records = []
    unresolved = {}
    for row, values, kind in leaves:
        candidates = list(by_symbol.get(row["symbol"], {}).values())
        label = row["entity"].strip()
        entity = select_entity(row, candidates)
        if not entity:
            name = re.sub(r"^[IVXLCDM]+\.\s*", "", label) or row["table_title"]
            identifier = "source-" + hashlib.sha256(f"{row['symbol']}:{name}".encode()).hexdigest()[:12]
            entity = {"id": identifier, "name": name, "code": None, "mainPriority": "Other budget units", "subprogrammes": []}
            unresolved[identifier] = {"name": name, "symbol": row["symbol"]}
        programme = next((p for p in entity["subprogrammes"] if str(p["number"]) == row["subprogramme_no"]), None)
        programme_name = programme["name"] if programme else row["subprogramme_label"].strip()
        programme_label = f"Subprogramme {row['subprogramme_no']}" if row["subprogramme_no"] else "Programme-wide deliverables" if row["level"] == "programme" else "Entity-wide deliverables"
        if programme_name:
            programme_label += f" · {programme_name}"
        if row["component_no"]:
            component = f"Component {row['component_no']}"
            programme_label = f"{programme_label} · {component}" if row["subprogramme_no"] else component
        observations = []
        for value in values:
            number = float(value["value_num"]) if value["value_num"] else None
            if number is not None and not math.isfinite(number):
                raise ValueError(f"Non-finite deliverable value in {row['table_uid']}:{row['row_seq']}")
            if any(entry["year"] == int(value["calendar_year"]) and entry["measure"] == value["measure"] for entry in observations):
                raise ValueError(f"Duplicate year/measure in {row['table_uid']}:{row['row_seq']}")
            observations.append({"year": int(value["calendar_year"]), "measure": value["measure"], "value": number,
                                 "raw": value["value_raw"], "note": value["value_note"]})
        title = row.get("item_label") or row.get("subgroup_label") or row.get("subcategory_label") or row.get("text") or row["category_label"]
        identifier = f"{kind}:{row['table_uid']}:{row['row_seq']}"
        records.append({"id": identifier, "kind": kind, "title": title, "description": row.get("text", ""),
                        "unit": row.get("unit", ""), "entity": {"id": entity["id"], "name": entity["name"], "code": entity["code"]},
                        "priority": entity["mainPriority"] or "Other budget units", "programme": programme_label,
                        "sourceLevel": row["level"], "component": row["component_no"] or None,
                        "category": row["category_label"], "categoryCode": row["category_code"], "hierarchy": row["hierarchy_path"],
                        "table": row["table_id"], "symbol": row["symbol"], "observations": observations,
                        "source": "https://documents.un.org/api/symbol/access?" + urlencode({"s": row["symbol"], "l": "en", "t": "pdf"}),
                        "attribution": "source-unit" if entity["id"].startswith("source-") else "matched-entity"})
    output = {"edition": 2027, "retrievedAt": datetime.now(timezone.utc).isoformat(),
              "sourceRepository": "https://github.com/united-nations/programme-budget-data", "records": records}
    target = ROOT / "public/data/secretariat-deliverables-2027.json"
    target.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n")
    try:
        revision = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        revision = None
    evidence = {"edition": 2027, "retrievedAt": output["retrievedAt"], "sourceRevision": revision,
                "inputs": [{"path": str(path.relative_to(source)), "sha256": hashlib.sha256(content).hexdigest()} for path, content in zip(files, input_bytes)],
                "mappingSnapshotSha256": hashlib.sha256(mapping_bytes).hexdigest(),
                "numericLeaves": sum(r["kind"] == "numeric" for r in records), "narrativeLeaves": len(narratives),
                "unmatchedSourceUnits": list(unresolved.values()), "basis": "Leaf rows only. No aggregation of subtotals and their components; unmatched units retain their printed identity."}
    (ROOT / "data/secretariat-deliverables-sources.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(f"Imported {len(records)} deliverables: {evidence['numericLeaves']} numerical, {len(narratives)} narrative; {len(unresolved)} unmatched source units retained by printed name.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=ROOT.parent / "programme-budget-data")
    main(parser.parse_args().source)
