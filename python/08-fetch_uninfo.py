"""Fetch published UN INFO plans, their results frameworks and full-plan finances."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime, timezone
import threading

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://api.uninfo.org/v1.0"
RAW = ROOT / "data/uninfo/plans/raw"
THREAD = threading.local()


def request(method, path, **kwargs):
    if not hasattr(THREAD, "session"):
        session = requests.Session()
        retry = Retry(total=4, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504],
                      allowed_methods=["GET", "POST"])
        session.mount("https://", HTTPAdapter(max_retries=retry))
        THREAD.session = session
    response = THREAD.session.request(method, f"{BASE}/{path}", timeout=90, **kwargs)
    response.raise_for_status()
    return response.json()


def search(path, body):
    rows = []
    page = 1
    while True:
        result = request("POST", path, json={**body, "page": page})
        rows.extend(result["results"])
        if page >= result["pagination"]["pages"]:
            return rows
        page += 1


def finance(plan_id, grouping):
    # Explicit plan IDs avoid the API's newest-workspace-plan default.
    # Omitting financeYears requests all reported finances for this plan.
    params = [("planIds", plan_id)]
    params.extend(("grouping", value) for value in grouping)
    result = request("GET", "planEntity/finance/overview", params=params)
    if not isinstance(result, list):
        raise ValueError(f"Expected financial observations for plan {plan_id}")
    return result



def framework_entity(entity):
    """Retain source identity and full hierarchy text without embedded related records."""
    version = entity["planEntityVersion"]
    return {
        "id": entity["id"],
        "parentId": entity["parentId"],
        "planId": entity["planId"],
        "entityPrototypeId": entity["entityPrototypeId"],
        "planEntityVersion": {
            key: version.get(key)
            for key in ("name", "code", "description", "startDate", "endDate")
        },
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()
    plans = search("plan/public/search", {
        "planTypeIds": [3, 7], "limit": 300,
        "exclude": ["assessments", "planDocuments", "planSubmissions", "planSurveys", "planRisks"],
    })
    if not plans:
        raise ValueError("No published frameworks returned")
    entities = search("plan/public/entity/search", {
        "planIds": [plan["id"] for plan in plans],
        "coreentityTypeIds": [10, 5, 8], "limit": 1000,
        "exclude": ["parent", "locations", "planEntitySdgs"],
    })
    entities = [framework_entity(entity) for entity in entities]
    workspaces = search("workspace/search", {"limit": 300})
    populated = {entity["planId"] for entity in entities}
    groups = {"projects": ["agency", "planEntity:SOU"], "sp": ["planEntity:SP"],
              "oc": ["planEntity:OC"], "ou": ["planEntity:OU"]}
    observations = {}
    print(f"Fetching full-plan finances for {len(populated)} published frameworks", flush=True)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        tasks = {
            pool.submit(finance, plan_id, grouping): (plan_id, name)
            for plan_id in sorted(populated) for name, grouping in groups.items()
        }
        for completed, task in enumerate(as_completed(tasks), 1):
            plan_id, name = tasks[task]
            observations.setdefault(str(plan_id), {})[name] = task.result()
            if completed % 100 == 0 or completed == len(tasks):
                print(f"Fetched {completed}/{len(tasks)} financial queries", flush=True)
    snapshot = {
        "public_plans.json": plans,
        "public_framework_entities.json": entities,
        "workspaces.json": [
            {"id": workspace["id"], "name": workspace["name"], "countries": [
                {"iso3": country["iso3"], "name": country["name"]}
                for country in workspace.get("countries", [])
            ]}
            for workspace in workspaces
        ],
        "plan_finances.json": observations,
        "provenance.json": {
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "finance_scope": "all_reported_years_for_explicit_plan",
            "finance_plan_ids": sorted(populated),
        },
    }
    RAW.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix=".refresh-", dir=RAW.parent) as temporary:
        staging = Path(temporary)
        for name, payload in snapshot.items():
            (staging / name).write_text(json.dumps(payload, ensure_ascii=False))
        for source in staging.iterdir():
            source.replace(RAW / source.name)
    print("Completed live plan-based UN INFO refresh.", flush=True)


if __name__ == "__main__":
    main()
