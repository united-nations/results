"""Scoped agency refreshes must not discard other plans' retained allocations."""
import copy
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "uninfo_agency_fetch", ROOT / "python/12-fetch_uninfo_agency_finances.py",
)
fetcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetcher)

OLD_DATE = "2026-11-17T12:00:00+00:00"
NEW_DATE = "2026-11-20T12:00:00+00:00"
ENTITIES = [
    {"id": 1, "planId": 1024}, {"id": 2, "planId": 2694},
    {"id": 3, "planId": 2694}, {"id": 4, "planId": 794},
]


def agency(*allocations):
    return {
        "id": 2, "abbreviation": "FAO", "name": "Food and Agriculture Organization",
        "planEntities": [
            {"id": node_id, "metrics": [{"metricName": "Total Expenditure", "total": spent}]}
            for node_id, spent in allocations
        ],
    }


def snapshot():
    return {
        "retrieved_at": OLD_DATE,
        "finance_scope": "all_reported_years_for_explicit_plan",
        "finance_plan_ids": [1024, 2694],
        "endpoint": fetcher.BASE,
        "groupings": {"sp": [agency((1, 10), (2, 20), (3, 30))], "oc": [], "ou": []},
    }


def allocations(payload):
    return {
        node["id"]: node["metrics"][0]["total"]
        for rows in payload["groupings"].values()
        for record in rows for node in record["planEntities"]
    }


class AgencyRefreshTests(unittest.TestCase):
    def test_selected_refresh_replaces_scope_and_preserves_other_plans_and_dates(self):
        existing = snapshot()
        before = copy.deepcopy(existing)
        fresh = {"sp": [agency((2, 200))], "oc": [], "ou": []}
        result = fetcher.merge_snapshot(existing, fresh, [2694], ENTITIES, NEW_DATE)
        self.assertEqual(allocations(result), {1: 10, 2: 200})
        self.assertEqual(result["finance_plan_ids"], [1024, 2694])
        self.assertEqual(result["retrieved_at_by_plan"], {"1024": OLD_DATE, "2694": NEW_DATE})
        self.assertEqual(existing, before)

        # A later refresh preserves the per-plan date, not the cache update date.
        later = fetcher.merge_snapshot(
            result, {"sp": [agency((4, 40))], "oc": [], "ou": []},
            [794], ENTITIES, "2026-11-21T12:00:00+00:00",
        )
        self.assertEqual(allocations(later), {1: 10, 2: 200, 4: 40})
        self.assertEqual(later["retrieved_at_by_plan"]["1024"], OLD_DATE)
        self.assertEqual(later["retrieved_at_by_plan"]["2694"], NEW_DATE)

    def test_empty_refresh_removes_only_requested_plans_stale_allocations(self):
        result = fetcher.merge_snapshot(
            snapshot(), {level: [] for level in fetcher.LEVELS}, [2694], ENTITIES, NEW_DATE,
        )
        self.assertEqual(allocations(result), {1: 10})
        self.assertEqual(result["finance_plan_ids"], [1024, 2694])
        self.assertEqual(result["retrieved_at_by_plan"]["2694"], NEW_DATE)

    def test_unmapped_or_conflicting_old_node_identity_fails_without_discarding_it(self):
        fresh = {level: [] for level in fetcher.LEVELS}
        for metadata in [ENTITIES[1:], ENTITIES + [{"id": 1, "planId": 794}]]:
            with self.subTest(metadata=metadata), self.assertRaises(ValueError):
                fetcher.merge_snapshot(snapshot(), fresh, [2694], metadata, NEW_DATE)

    def test_out_of_scope_or_unmapped_fresh_allocations_fail(self):
        for node_id in [1, 999]:
            with self.subTest(node_id=node_id), self.assertRaises(ValueError):
                fetcher.merge_snapshot(
                    snapshot(), {"sp": [agency((node_id, 200))], "oc": [], "ou": []},
                    [2694], ENTITIES, NEW_DATE,
                )

    def test_partial_level_refresh_is_rejected(self):
        with self.assertRaises(ValueError):
            fetcher.merge_snapshot(snapshot(), {"sp": []}, [2694], ENTITIES, NEW_DATE)

    def test_main_writes_a_merged_cache_after_a_selected_plan_download(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            raw = root / "raw"
            raw.mkdir()
            manifest = root / "public/data/uninfo/plans/manifest.json"
            manifest.parent.mkdir(parents=True)
            manifest.write_text(json.dumps({"plans": {"1024": {}, "2694": {}}}))
            destination = raw / "agency_framework_finances.json"
            destination.write_text(json.dumps(snapshot()))
            (raw / "public_framework_entities.json").write_text(json.dumps(ENTITIES))

            def response(command, **kwargs):
                params = parse_qs(urlparse(command[-1]).query)
                self.assertEqual(params["planIds"], ["2694"])
                rows = [agency((2, 200))] if "planEntity:SP" in params["grouping"] else []
                return SimpleNamespace(stdout=json.dumps(rows).encode())

            with patch.object(fetcher, "ROOT", root), patch.object(fetcher, "RAW", raw), \
                    patch.object(fetcher.subprocess, "run", side_effect=response), \
                    patch("sys.argv", ["fetch", "--plan-ids", "2694"]):
                fetcher.main()
            saved = json.loads(destination.read_text())
            self.assertEqual(allocations(saved), {1: 10, 2: 200})
            self.assertEqual(saved["retrieved_at_by_plan"]["1024"], OLD_DATE)
            self.assertEqual(saved["finance_plan_ids"], [1024, 2694])
            self.assertFalse(destination.with_suffix(".tmp").exists())


if __name__ == "__main__":
    unittest.main()
