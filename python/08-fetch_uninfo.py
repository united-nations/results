"""Fetch published UN INFO frameworks and year-filtered financial observations."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import threading

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://api.uninfo.org/v1.0"
RAW = ROOT / "data/uninfo/raw"
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


def finance(workspace, year, grouping):
    params = [("workspaceIds", workspace), ("financeYears", year)]
    params.extend(("grouping", value) for value in grouping)
    rows = request("GET", "planEntity/finance/overview", params=params)
    if not isinstance(rows, list):
        raise ValueError(f"Expected finance observations for workspace {workspace}, year {year}")
    return rows


def fetch_year(year, workspaces, workers):
    plans = search("plan/public/search", {
        "year": year, "planTypeIds": [3, 7], "limit": 300,
        "exclude": ["assessments", "planDocuments", "planSubmissions", "planSurveys", "planRisks"],
    })
    if not plans:
        raise ValueError(f"No published plans returned for {year}")
    entities = search("plan/public/entity/search", {
        "planIds": [plan["id"] for plan in plans],
        "coreentityTypeIds": [10, 5, 8], "limit": 1000,
    })
    global_sdgs = request("GET", "planEntity/finance/overview",
                          params={"financeYears": year, "grouping": "sdg"})
    observations = {}
    groups = {"sdgs": ["sdg"], "projects": ["agency", "planEntity:SOU"],
              "sp": ["planEntity:SP"], "oc": ["planEntity:OC"], "ou": ["planEntity:OU"]}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        tasks = {
            pool.submit(finance, ws["id"], year, grouping): (ws["id"], name)
            for ws in workspaces for name, grouping in groups.items()
        }
        for completed, task in enumerate(as_completed(tasks), 1):
            workspace, name = tasks[task]
            observations.setdefault(workspace, {})[name] = task.result()
            if completed % 100 == 0 or completed == len(tasks):
                print(f"{year}: fetched {completed}/{len(tasks)} workspace queries", flush=True)

    country_workspaces = {}
    # Prefer the workspace with a published framework for this year when a
    # country belongs to several workspaces.
    active = {plan["workspaceId"] for plan in plans}
    for workspace in sorted(workspaces, key=lambda ws: ws["id"] in active):
        for country in workspace["countries"]:
            country_workspaces[country["name"]] = workspace["id"]
    country_sdgs = {}
    projects = {}
    frameworks = {}
    for country, workspace in country_workspaces.items():
        values = observations[workspace]
        country_sdgs[country] = {
            "workspace_id": workspace, "sdgs": values["sdgs"], "has_year_data": bool(values["sdgs"]),
        }
        projects[country] = values["projects"]
        frameworks[country] = {level: values[level] for level in ("sp", "oc", "ou")}
    return {
        "workspaces.json": country_workspaces,
        "global_sdgs.json": global_sdgs,
        "countries_sdgs.json": country_sdgs,
        "projects_by_country.json": projects,
        "frameworks_by_country.json": frameworks,
        "public_plans.json": plans,
        "public_framework_entities.json": entities,
        "period-provenance.json": {
            "year": year, "projects_year": year, "framework_year": year, "global_sdgs_year": year,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--years", type=int, nargs="+", default=list(range(2022, 2027)))
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()
    workspaces = [row for row in search("workspace/search", {"limit": 300}) if row["countries"]]
    print(f"Fetching {len(workspaces)} country workspaces for {args.years}", flush=True)
    RAW.mkdir(parents=True, exist_ok=True)
    # Keep completed year requests resumable without mixing observations in
    # published raw snapshots. Existing year directories are replaced only
    # after every requested year has been fetched successfully.
    with TemporaryDirectory(prefix=".refresh-", dir=RAW) as temporary:
        staging = Path(temporary)
        for year in sorted(set(args.years)):
            folder = staging / str(year)
            folder.mkdir()
            for name, payload in fetch_year(year, workspaces, args.workers).items():
                (folder / name).write_text(json.dumps(payload, ensure_ascii=False))
        for folder in staging.iterdir():
            destination = RAW / folder.name
            destination.mkdir(exist_ok=True)
            for source in folder.iterdir():
                source.replace(destination / source.name)
    print("Completed live UN INFO refresh.", flush=True)


if __name__ == "__main__":
    main()
