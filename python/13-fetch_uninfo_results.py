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
    periods, pages = search("timeframe/search", {"timeframeIds": period_ids})
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
    print(f"Exported {len(records)} indicators, {len(cells)} reporting cells and {len(periods)} periods.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan-id", type=int, default=1488)
    args = parser.parse_args()
    export(args.plan_id)
