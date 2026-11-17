"""Export plan-based UN INFO results frameworks for the frontend."""
import json
from pathlib import Path
from collections import defaultdict
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/uninfo/plans/raw"
OUT = ROOT / "public/data/uninfo/plans"

def extract_metrics(item: dict) -> dict:
    metrics = {m["metricName"]: m["total"] for m in item.get("metrics", [])}
    return {
        "required": round(metrics.get("Total Required Resources", 0), 2),
        "available": round(metrics.get("Total Available Resources", 0), 2),
        "spent": round(metrics.get("Total Expenditure", 0), 2),
    }

def build_framework_tree(fw: dict, allow_roots: bool = False) -> list[dict] | None:
    """Build nested framework tree from SP/OC/OU data."""
    if not fw or not any(fw.values()):
        return None

    sps, ocs, ous = fw.get("sp", []), fw.get("oc", []), fw.get("ou", [])
    # Codes are display labels local to a parent, not node identities. The API
    # can return several dated descriptions of one ID; count that ID once only
    # when its financial observations and parent agree.
    def dedupe(items: list) -> list:
        by_id = {}
        for item in items:
            node_id = item.get("id")
            if node_id is None:
                raise ValueError("UNINFO framework node has no source ID")
            existing = by_id.get(node_id)
            if existing is not None:
                for key in ("parentId", "code"):
                    if existing.get(key) != item.get(key):
                        raise ValueError(f"Conflicting {key} for UNINFO node {node_id}")
                metrics = lambda row: {m["metricName"]: m["total"] for m in row.get("metrics", [])}
                if metrics(existing) != metrics(item):
                    raise ValueError(f"Conflicting financial observations for UNINFO node {node_id}")
            end = item.get("endDate") or ""
            existing_end = (existing or {}).get("endDate") or ""
            if existing is None or end > existing_end:
                by_id[node_id] = item
        return list(by_id.values())

    sps, ocs, ous = dedupe(sps), dedupe(ocs), dedupe(ous)

    levels = [sps, ocs, ous]
    all_ids = [item["id"] for items in levels for item in items]
    if len(all_ids) != len(set(all_ids)):
        raise ValueError("UNINFO framework ID appears at multiple levels")
    for children, parents in ((ocs, sps), (ous, ocs)):
        parent_ids = {item["id"] for item in parents}
        for item in children:
            if item.get("parentId") not in parent_ids and not (allow_roots and item.get("parentId") is None):
                raise ValueError(f"Unreachable UNINFO framework node {item['id']}")

    # Build OC -> OU mapping
    ous_by_parent = defaultdict(list)
    for ou in ous:
        if ou.get("parentId"):
            ous_by_parent[ou["parentId"]].append(ou)

    # Build SP -> OC mapping
    ocs_by_parent = defaultdict(list)
    for oc in ocs:
        if oc.get("parentId"):
            ocs_by_parent[oc["parentId"]].append(oc)

    node_levels = {item["id"]: level for level, items in enumerate(levels) for item in items}

    def fmt_item(item: dict, children: list = None) -> dict:
        m = extract_metrics(item)
        result = {
            "id": item["id"],
            "level": node_levels[item["id"]],
            "code": item.get("code", ""),
            "name": item.get("name", ""),
            **m,
        }
        if "has_financial_data" in item:
            result["has_financial_data"] = item["has_financial_data"]
        if item.get("description"):
            result["description"] = item["description"]
        if children:
            result["children"] = children
        return result

    # Build tree: SP -> OC -> OU
    tree = []
    for sp in sorted(sps, key=lambda x: x.get("code", "")):
        sp_ocs = ocs_by_parent.get(sp["id"], [])
        oc_items = []
        for oc in sorted(sp_ocs, key=lambda x: x.get("code", "")):
            oc_ous = ous_by_parent.get(oc["id"], [])
            ou_items = [fmt_item(ou) for ou in sorted(oc_ous, key=lambda x: x.get("code", ""))]
            oc_items.append(fmt_item(oc, ou_items if ou_items else None))
        tree.append(fmt_item(sp, oc_items if oc_items else None))

    if allow_roots:
        for oc in ocs:
            if oc.get("parentId") is None:
                children = [fmt_item(ou) for ou in ous_by_parent.get(oc["id"], [])]
                tree.append(fmt_item(oc, children or None))
        tree.extend(fmt_item(ou) for ou in ous if ou.get("parentId") is None)
    return tree if tree else None

def build_plan_framework(plan, entities, finances):
    levels = {
        prototype["id"]: {10: "sp", 5: "oc", 8: "ou"}.get(prototype["coreentityTypeId"])
        for prototype in plan.get("entityPrototypes", [])
    }
    metrics = {}
    for level in ("sp", "oc", "ou"):
        for row in finances.get(level, []):
            previous = metrics.get(row["id"])
            if previous is not None and extract_metrics({"metrics": previous}) != extract_metrics(row):
                raise ValueError(f"Conflicting financial observations for node {row['id']}")
            metrics[row["id"]] = row.get("metrics", [])
    framework = {level: [] for level in ("sp", "oc", "ou")}
    for entity in entities:
        level = levels.get(entity["entityPrototypeId"])
        if not level:
            continue
        version = entity["planEntityVersion"]
        framework[level].append({
            "id": entity["id"], "parentId": entity["parentId"],
            "code": version.get("code") or "", "name": version.get("name") or "",
            "description": version.get("description") or "",
            "endDate": version.get("endDate"),
            "metrics": metrics.get(entity["id"], []),
            "has_financial_data": entity["id"] in metrics,
        })
    return build_framework_tree(framework, allow_roots=True)


def build_projects(agencies):
    projects = []
    for agency_index, agency in enumerate(agencies):
        for project_index, project in enumerate(agency.get("planEntities", [])):
            projects.append({
                "id": project.get("id"),
                "row_key": f"{project.get('id')}:{agency.get('id')}:{agency_index}:{project_index}",
                "agency": agency.get("abbreviation") or "",
                "code": project.get("code") or "",
                "name": project.get("name") or "",
                "description": project.get("description"),
                "outcome": project.get("parentName"),
                "start": project.get("startDate"), "end": project.get("endDate"),
                **extract_metrics(project),
            })
    return sorted(projects, key=lambda row: -row["required"])


def plan_summary(plan):
    version = plan["planVersion"]
    return {
        "id": plan["id"], "workspace_id": plan["workspaceId"],
        "name": version.get("name") or "",
        "start": version.get("startDate"), "end": version.get("endDate"),
    }


def export_snapshot(raw=RAW, output=OUT):
    plans = json.loads((raw / "public_plans.json").read_text())
    entities = json.loads((raw / "public_framework_entities.json").read_text())
    finances = json.loads((raw / "plan_finances.json").read_text())
    workspaces = {
        workspace["id"]: workspace for workspace in json.loads((raw / "workspaces.json").read_text())
    }
    entities_by_plan = defaultdict(list)
    for entity in entities:
        entities_by_plan[entity["planId"]].append(entity)
    countries = {}
    summaries = {}
    payloads = {}
    for plan in plans:
        rows = entities_by_plan.get(plan["id"], [])
        if not rows:
            continue
        observations = finances[str(plan["id"])]
        framework = build_plan_framework(plan, rows, observations)
        if not framework:
            continue
        summary = plan_summary(plan)
        workspace = workspaces[plan["workspaceId"]]
        summaries[str(plan["id"])] = summary
        payloads[plan["id"]] = {
            **summary,
            "workspace_countries": sorted(country["name"] for country in workspace["countries"]),
            "framework": framework,
            "projects": build_projects(observations.get("projects", [])),
        }
        for country in workspace["countries"]:
            iso3 = country["iso3"]
            entry = countries.setdefault(iso3, {"name": country["name"], "plan_ids": []})
            entry["plan_ids"].append(plan["id"])
    for country in countries.values():
        country["plan_ids"] = sorted(set(country["plan_ids"]), key=lambda plan_id: (
            summaries[str(plan_id)]["start"] or "",
            summaries[str(plan_id)]["end"] or "",
            plan_id,
        ), reverse=True)
        country["latest_plan_id"] = country["plan_ids"][0]
    manifest = {"countries": countries, "plans": summaries}
    output.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix=".export-", dir=output.parent) as temporary:
        staging = Path(temporary)
        for plan_id, payload in payloads.items():
            (staging / f"{plan_id}.json").write_text(json.dumps(payload, ensure_ascii=False))
        (staging / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
        for source in staging.iterdir():
            source.replace(output / source.name)
    print(f"Exported {len(payloads)} plans for {len(countries)} countries and areas.", flush=True)
    return manifest


if __name__ == "__main__":
    export_snapshot()
