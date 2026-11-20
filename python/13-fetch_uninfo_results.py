"""Fetch one country's published indicator definitions and reported observations."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import threading
import html

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://api.uninfo.org/v1.0"
THREAD = threading.local()
RESULTS = ROOT / "public/data/uninfo/results"


def write_result_manifest():
    """Index complete local exports, preserving the plan directory's workspace identity."""
    directory = json.loads((ROOT / "public/data/uninfo/plans/manifest.json").read_text())
    entries = []
    for path in RESULTS.glob("*.json"):
        if path.name == "manifest.json":
            continue
        data = json.loads(path.read_text())
        plan = directory["plans"][str(data["planId"])]
        countries = data["countries"]
        label = countries[0] if len(countries) == 1 else f"Pacific · shared framework ({len(countries)} countries)" if data["planId"] == 1517 else " / ".join(countries)
        entries.append({"planId": data["planId"], "label": label, "countries": countries,
                        "planName": data["planName"], "start": plan["start"], "end": plan["end"],
                        "retrievedAt": data["retrievedAt"], "source": data["source"],
                        "indicatorCount": len(data["indicators"]),
                        "cellCount": sum(len(row["cells"]) for row in data["indicators"])})
    manifest = {"defaultPlanId": 1488, "frameworks": sorted(entries, key=lambda row: row["label"])}
    temporary = RESULTS / "manifest.tmp"
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(RESULTS / "manifest.json")


def search(path, body):
    if not hasattr(THREAD, "session"):
        session = requests.Session()
        session.headers.update({"User-Agent": "Mozilla/5.0"})
        retry = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=["POST"])
        session.mount("https://", HTTPAdapter(max_retries=retry))
        THREAD.session = session
    rows, pages = [], []
    page = 1
    while True:
        response = THREAD.session.post(f"{BASE}/{path}", json={**body, "page": page, "limit": 200}, timeout=60)
        response.raise_for_status()
        data = response.json()
        rows.extend(data["results"])
        pages.append({"endpoint": path, "request": {**body, "page": page, "limit": 200}, "sha256": hashlib.sha256(response.content).hexdigest(), "rows": len(data["results"])})
        if page >= data["pagination"]["pages"]:
            return rows, pages
        page += 1


def text(value):
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def enrich_sdgs(plan_id, records):
    entities, sources = search("plan/public/entity/search", {"planIds": [plan_id]})
    catalogue, pages = search("indicator/search", {})
    sources.extend(pages)
    by_id = {row["id"]: row for row in entities}
    goal_names = {row["sustainableDevelopmentGoal"]["id"]: text(row["sustainableDevelopmentGoal"].get("short"))
                  for row in catalogue if row.get("sustainableDevelopmentGoal")}
    by_title = {}
    normalize = lambda value: re.sub(r"\s+", " ", text(value)).strip().casefold()
    for row in catalogue:
        by_title.setdefault(normalize(row.get("name")), []).append(row)
    for record in records:
        links = []
        entity = by_id.get(record["id"])
        visited = set()
        while entity and entity["id"] not in visited:
            visited.add(entity["id"])
            for link in entity.get("planEntitySdgs", []):
                if link.get("deletedAt"):
                    continue
                indicator = link.get("indicator") or {}
                target = link.get("target") or indicator.get("sustainableDevelopmentTarget") or {}
                goal = target.get("sustainableDevelopmentGoal") or indicator.get("sustainableDevelopmentGoal") or {}
                if not link.get("goalId"):
                    continue
                links.append({"goal": link["goalId"], "goalName": text(goal.get("short") or goal.get("name")),
                              "target": target.get("ref"), "targetName": text(target.get("name")) or None,
                              "indicator": indicator.get("ref"), "indicatorName": text(indicator.get("name")) or None,
                              "source": "direct" if entity["id"] == record["id"] else "framework",
                              "sourceId": entity["id"], "sourceTitle": text((entity.get("planEntityVersion") or {}).get("name"))})
            if links:
                break
            entity = by_id.get(entity.get("parentId"))
        matches = by_title.get(normalize(record["title"]), [])
        # A unique exact definition match supplies catalogue mappings, not country observations.
        match = matches[0] if len(matches) == 1 else None
        record["catalogueId"] = match["id"] if match else None
        if match:
            goal = match.get("sustainableDevelopmentGoal") or {}
            for indicator in match.get("sdgIndicators", []):
                links.append({"goal": indicator["goalId"], "goalName": goal_names.get(indicator["goalId"], ""),
                              "target": ".".join(indicator["ref"].split(".")[:2]), "targetName": None,
                              "indicator": indicator["ref"], "indicatorName": text(indicator.get("name")),
                              "source": "catalogue", "sourceId": match["id"], "sourceTitle": text(match.get("name"))})
            if match.get("primarySdgGoalId") and not any(link["goal"] == match["primarySdgGoalId"] for link in links):
                links.append({"goal": match["primarySdgGoalId"], "goalName": text(goal.get("short") or goal.get("name")),
                              "target": None, "targetName": None, "indicator": None, "indicatorName": None,
                              "source": "catalogue", "sourceId": match["id"], "sourceTitle": text(match.get("name"))})
        unique = {}
        for link in links:
            unique.setdefault((link["goal"], link["target"], link["indicator"]), link)
        record["sdgs"] = sorted(unique.values(), key=lambda link: (link["goal"], link["target"] or "", link["indicator"] or ""))
    return sources


def refresh_metadata(plan_id):
    target = ROOT / f"public/data/uninfo/results/{plan_id}.json"
    output = json.loads(target.read_text())
    sources = enrich_sdgs(plan_id, output["indicators"])
    output["metadataRetrievedAt"] = datetime.now(timezone.utc).isoformat()
    target.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    provenance = ROOT / f"data/uninfo/results/{plan_id}-sources.json"
    evidence = json.loads(provenance.read_text())
    evidence.update({"metadataRetrievedAt": output["metadataRetrievedAt"], "metadataRequests": sources})
    provenance.write_text(json.dumps(evidence, indent=2) + "\n")
    print(f"Updated SDG metadata for {len(output['indicators'])} indicators.")


def export(plan_id):
    manifest = json.loads((ROOT / "public/data/uninfo/plans/manifest.json").read_text())
    plan = manifest["plans"][str(plan_id)]
    indicators, sources = search("plan/public/entity/search", {"planIds": [plan_id], "coreentityTypeIds": [7]})
    identifiers = [item["id"] for item in indicators]
    batches = [identifiers[index:index + 15] for index in range(0, len(identifiers), 15)]
    cells = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for rows, pages in pool.map(lambda ids: search("planEntityCell/search", {"planEntityIds": ids}), batches):
            cells.extend(rows)
            sources.extend(pages)
    period_ids = sorted({assessment["timeframeId"] for cell in cells for assessment in cell.get("assessments", []) if assessment.get("timeframeId") is not None})
    periods, pages = search("timeframe/search", {"timeframeIds": period_ids}) if period_ids else ([], [])
    sources.extend(pages)
    by_indicator = {}
    for cell in cells:
        observations = []
        for assessment in cell.get("assessments", []):
            version = assessment.get("assessmentVersion") or {}
            observations.append({"metricId": assessment.get("metricId"), "periodId": assessment.get("timeframeId"), "value": (version.get("properties") or {}).get("value"), "updatedAt": version.get("updatedAt")})
        agency = cell.get("agency") or {}
        location = cell.get("location") or {}
        clean = {"id": cell["id"], "agency": {"id": agency.get("id"), "code": agency.get("abbreviation"), "name": agency.get("name")} if agency else None,
                 "category": (cell.get("designedCategory") or {}).get("name"), "location": location.get("name"),
                 "implementingPartnerId": cell.get("implementingPartnerId"), "contributingPartnerId": cell.get("contributingPartnerId"),
                 "observations": observations}
        by_indicator.setdefault(cell["planEntityId"], []).append(clean)
    records = []
    for indicator in indicators:
        version = indicator.get("planEntityVersion") or {}
        properties = version.get("value") or {}
        parent = indicator.get("parent") or {}
        parent_version = parent.get("planEntityVersion") or {}
        records.append({"id": indicator["id"], "code": version.get("code"), "title": text(version.get("name")), "description": text(version.get("description")),
                        "unit": (properties.get("unit") or {}).get("name"), "calculation": properties.get("calculated"), "autoSum": properties.get("autoSum"),
                        "commonIndicator": properties.get("isCommonIndicator"), "parentId": indicator.get("parentId"), "parentCode": parent_version.get("code"), "parentTitle": text(parent_version.get("name")),
                        "cells": sorted(by_indicator.get(indicator["id"], []), key=lambda item: item["id"])})
    sources.extend(enrich_sdgs(plan_id, records))
    output = {"planId": plan_id, "planName": plan["name"], "countries": plan.get("workspace_countries", []), "retrievedAt": datetime.now(timezone.utc).isoformat(), "source": f"{BASE}/plan/public/{plan_id}", "apiBase": BASE,
              "periods": [{"id": row["id"], "start": row["startDate"], "end": row["endDate"], "type": row.get("type")} for row in periods],
              "indicators": records}
    folder = ROOT / "public/data/uninfo/results"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"{plan_id}.json"
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    temporary.replace(target)
    provenance = ROOT / f"data/uninfo/results/{plan_id}-sources.json"
    provenance.parent.mkdir(parents=True, exist_ok=True)
    provenance.write_text(json.dumps({"planId": plan_id, "retrievedAt": output["retrievedAt"], "requests": sources, "indicatorCount": len(records), "cellCount": len(cells)}, indent=2) + "\n")
    write_result_manifest()
    print(f"Exported {len(records)} indicators, {len(cells)} reporting cells and {len(periods)} periods.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan-id", type=int, default=1488)
    parser.add_argument("--metadata-only", action="store_true")
    args = parser.parse_args()
    if args.metadata_only:
        refresh_metadata(args.plan_id)
        write_result_manifest()
    else:
        export(args.plan_id)
