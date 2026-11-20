"""Prepare annual UN INFO map amounts and a same-year CEB scale comparison."""
import argparse
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def expenditure(rows):
    values = [
        Decimal(str(metric["total"]))
        for row in rows
        for metric in row.get("metrics", [])
        if metric["metricName"] == "Total Expenditure"
    ]
    return sum(values, Decimal(0)) if values else None


def export_annual(year):
    raw = ROOT / "data/uninfo/raw" / str(year)
    read = lambda file: json.loads(file.read_text())
    provenance = read(raw / "period-provenance.json")
    if provenance.get("global_sdgs_year") != year:
        raise ValueError("The global UN INFO observation must be year-filtered")
    ceb = read(ROOT / "data/system-entities.json")
    if ceb["year"] != year:
        raise ValueError("Use the same reporting year for UN INFO and CEB")
    functions = read(ROOT / f"data/system-function-expenditure-{year}.json")
    function_totals = {row["key"]: row["total"] for row in functions["functions"]}
    country_team_benchmark = read(ROOT / "data/un-country-team-spending.json")
    source = read(raw / "countries_sdgs.json")
    metadata = read(ROOT / "data/uninfo/plans/raw/workspaces.json")
    codes = {country["name"]: country["iso3"] for workspace in metadata for country in workspace["countries"]}
    workspaces = {}
    countries = {}
    for name, record in source.items():
        code = codes[name]
        workspace_id = str(record["workspace_id"])
        amount = expenditure(record["sdgs"]) if record.get("has_year_data") else None
        workspace = workspaces.setdefault(workspace_id, {
            "id": record["workspace_id"],
            "expenditure": float(amount) if amount is not None else None,
            "countries": [],
            "codes": [],
        })
        if workspace["expenditure"] != (float(amount) if amount is not None else None):
            raise ValueError(f"Conflicting shared workspace totals for {workspace_id}")
        workspace["countries"].append(name)
        workspace["codes"].append(code)
        countries[code] = {"workspace_id": record["workspace_id"], "expenditure": workspace["expenditure"]}

    global_spent = expenditure(read(raw / "global_sdgs.json"))
    if global_spent is None:
        raise ValueError("No global annual expenditure observation")
    # Preserve a reconciliation record. Do not sum copies of shared workspaces.
    workspace_spent = sum((Decimal(str(row["expenditure"])) for row in workspaces.values() if row["expenditure"] is not None), Decimal(0))
    result = {
        "year": year,
        "retrieved_at": provenance.get("retrieved_at"),
        "uninfoExpenditure": float(global_spent),
        "cebExpenditure": ceb["totalSpending"],
        "countryTeamBenchmark": country_team_benchmark,
        "developmentExpenditure": function_totals["development"],
        "humanitarianExpenditure": function_totals["humanitarian"],
        "developmentSystemActivitiesExpenditure": function_totals["development"] + function_totals["humanitarian"],
        "cebFunctionsSource": ceb["source"].replace(f"sdg-expenses-{year}.json", f"function-geography-{year}.json"),
        "cebFunctionsDownload": functions["meta"]["downloadUrl"],
        "cebFunctionReconciliationDifference": functions["total"] - ceb["totalSpending"],
        "developmentDefinitionSource": "https://digitallibrary.un.org/record/4114681",
        "uninfoCoverageSource": "https://www.unaids.org/sites/default/files/2025-09/2025_New-Generation-UN-Country-Teams_en_0.pdf",
        "ratio": float(global_spent / Decimal(str(ceb["totalSpending"]))),
        "workspaceExpenditure": float(workspace_spent),
        "reconciliationDifference": float(global_spent - workspace_spent),
        "reportingWorkspaces": sum(row["expenditure"] is not None for row in workspaces.values()),
        "reportingCountries": sum(row["expenditure"] is not None for row in countries.values()),
        "uninfoSource": "https://uninfo.org/",
        "scopeSource": "https://workspace.uninfo.org/",
        "cebSource": ceb["source"].replace(f"sdg-expenses-{year}.json", f"entity-spending-{year}.json"),
        "query": {
            "endpoint": "https://api.uninfo.org/v1.0/planEntity/finance/overview",
            "financeYears": year,
            "grouping": ["sdg"],
            "planIds": sorted(set(provenance["finance_plan_ids"])),
        },
        "method": "Sum Total Expenditure across all reported SDG groups, including unclassified. Map uses annual workspace totals once per workspace, with no full-plan fallback. The UN INFO/system ratio uses the same-year CEB snapshot. The separately labelled UN country team benchmark is the published 2024 UN80 figure, not a current-year estimate. The chart compares scale across different scopes and explicitly labelled years, not an accounting partition or an audited coverage rate.",
        "countries": countries,
        "workspaces": workspaces,
    }
    output = ROOT / f"public/data/uninfo/annual-expenditure-{year}.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"Prepared {year} annual expenditure: {result['uninfoExpenditure']:,.2f} UN INFO / {result['cebExpenditure']:,.2f} CEB = {result['ratio']:.1%}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, default=2025)
    export_annual(parser.parse_args().year)
