"""Fetch entity allocations within each published plan's framework levels."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
import json
import subprocess
import argparse

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/uninfo/plans/raw"
BASE = "https://api.uninfo.org/v1.0/planEntity/finance/overview"
LEVELS = ("sp", "oc", "ou")


def merge_snapshot(existing, groupings, plan_ids, framework_entities, retrieved_at):
    """Replace only requested plans' allocations, preserving other snapshots."""
    requested = {int(plan_id) for plan_id in plan_ids}
    if not requested:
        raise ValueError("No plans requested for the agency refresh")
    if set(groupings) != set(LEVELS):
        raise ValueError("A refresh must include priorities, outcomes and outputs")
    if existing and existing.get("finance_scope") != "all_reported_years_for_explicit_plan":
        raise ValueError("Cannot merge agency snapshots with different financial scopes")
    if existing and existing.get("endpoint") != BASE:
        raise ValueError("Cannot merge agency snapshots from different endpoints")

    node_plans = {}
    for entity in framework_entities:
        node_id = int(entity["id"])
        plan_id = int(entity["planId"])
        if node_id in node_plans and node_plans[node_id] != plan_id:
            raise ValueError(f"Framework node {node_id} belongs to conflicting plans")
        node_plans[node_id] = plan_id

    previous_plans = {int(plan_id) for plan_id in existing.get("finance_plan_ids", [])}
    merged = {}
    for level in LEVELS:
        retained = []
        for agency in existing.get("groupings", {}).get(level, []):
            nodes = []
            for node in agency.get("planEntities", []):
                node_id = int(node["id"])
                if node_id not in node_plans:
                    raise ValueError(f"Cannot map retained framework node {node_id} to a plan")
                plan_id = node_plans[node_id]
                if plan_id not in previous_plans:
                    raise ValueError(f"Retained node {node_id} falls outside the recorded plan scope")
                if plan_id not in requested:
                    nodes.append(node)
            if nodes:
                retained.append({**agency, "planEntities": nodes})

        for agency in groupings[level]:
            for node in agency.get("planEntities", []):
                node_id = int(node["id"])
                if node_id not in node_plans:
                    raise ValueError(f"Cannot map refreshed framework node {node_id} to a plan")
                if node_plans[node_id] not in requested:
                    raise ValueError(f"Refreshed node {node_id} falls outside the requested plans")
        merged[level] = retained + groupings[level]

    # A legacy cache has one timestamp for its whole recorded plan scope.
    # Once plans are refreshed independently, retain their actual source dates.
    previous_dates = existing.get("retrieved_at_by_plan", {})
    dates = {
        str(plan_id): previous_dates.get(str(plan_id), existing.get("retrieved_at"))
        for plan_id in previous_plans
    }
    dates.update({str(plan_id): retrieved_at for plan_id in requested})
    return {
        **existing,
        "retrieved_at": retrieved_at,
        "retrieved_at_by_plan": dates,
        "finance_scope": "all_reported_years_for_explicit_plan",
        "finance_plan_ids": sorted(previous_plans | requested),
        "endpoint": BASE,
        "groupings": merged,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan-ids", type=int, nargs="+")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "public/data/uninfo/plans/manifest.json").read_text())
    plan_ids = sorted(set(args.plan_ids or [int(value) for value in manifest["plans"]]))

    def fetch(level):
        params = [("planIds", value) for value in plan_ids]
        params.extend([("grouping", "agency"), ("grouping", f"planEntity:{level.upper()}")])
        # This source currently requires a browser-compatible public request.
        response = subprocess.run([
            "curl", "--fail", "--silent", "--show-error", "--location",
            "--compressed", "--retry", "2", "--max-time", "180",
            "--user-agent", "Mozilla/5.0", BASE + "?" + urlencode(params),
        ], check=True, capture_output=True)
        rows = json.loads(response.stdout)
        # Retain financial observations and stable IDs; narratives already live
        # in the independently retained public framework-entity snapshot.
        records = [{
            "id": agency["id"], "abbreviation": agency.get("abbreviation"),
            "name": agency.get("name"),
            "planEntities": [{"id": node["id"], "metrics": node.get("metrics", [])}
                             for node in agency.get("planEntities", [])],
        } for agency in rows]
        return level, records

    results = {}
    with ThreadPoolExecutor(max_workers=3) as pool:
        for task in as_completed([pool.submit(fetch, level) for level in LEVELS]):
            level, records = task.result()
            results[level] = records
            print(f"Fetched {level}: {sum(len(row['planEntities']) for row in records)} entity allocations", flush=True)
    destination = RAW / "agency_framework_finances.json"
    existing = json.loads(destination.read_text()) if destination.exists() else {}
    framework_entities = json.loads((RAW / "public_framework_entities.json").read_text())
    payload = merge_snapshot(
        existing, results, plan_ids, framework_entities,
        datetime.now(timezone.utc).isoformat(),
    )
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False))
    temporary.replace(destination)
    print(
        f"Refreshed {len(plan_ids)} plans; retained allocations for "
        f"{len(payload['finance_plan_ids'])} plans in total.",
        flush=True,
    )


if __name__ == "__main__":
    main()
