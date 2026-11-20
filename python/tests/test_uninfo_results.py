"""SDG joins, empty exports and observation-preserving metadata refreshes."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("uninfo_results", ROOT / "python/13-fetch_uninfo_results.py")
fetcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetcher)


def entity(identifier, parent=None, links=None):
    return {"id": identifier, "parentId": parent,
            "planEntityVersion": {"name": f"Item {identifier}"},
            "planEntitySdgs": links or []}


def direct_link(goal=1, ref="1.2"):
    return {"goalId": goal, "target": {"ref": ref, "name": "Target definition",
            "sustainableDevelopmentGoal": {"id": goal, "short": "No Poverty"}}}


class ResultsImporterTests(unittest.TestCase):
    def test_exact_catalogue_match_is_explicit_and_ambiguous_matches_are_excluded(self):
        catalogue = [{"id": 7, "name": " People reached ", "primarySdgGoalId": 1,
                      "sustainableDevelopmentGoal": {"id": 1, "short": "No Poverty"},
                      "sdgIndicators": [{"goalId": 1, "ref": "1.2.1", "name": "Poverty measure"}]}]
        for rows, expected in [(catalogue, 7), (catalogue + [{**catalogue[0], "id": 8}], None)]:
            records = [{"id": 12, "title": "PEOPLE  reached"}]
            with patch.object(fetcher, "search", side_effect=[([entity(12)], []), (rows, [])]):
                fetcher.enrich_sdgs(100, records)
            self.assertEqual(records[0]["catalogueId"], expected)
            if expected:
                self.assertEqual(records[0]["sdgs"][0]["source"], "catalogue")
                self.assertEqual(records[0]["sdgs"][0]["indicator"], "1.2.1")
            else:
                self.assertEqual(records[0]["sdgs"], [])

    def test_only_nearest_tagged_ancestor_can_supply_a_framework_link(self):
        entities = [entity(1, links=[direct_link(2, "2.1")]),
                    entity(2, 1, [direct_link()]), entity(3, 2),
                    entity(4, 2, [direct_link(5, "5.1")])]
        records = [{"id": 3, "title": "Unmapped result"}]
        with patch.object(fetcher, "search", side_effect=[(entities, []), ([], [])]):
            fetcher.enrich_sdgs(100, records)
        self.assertEqual([(row["goal"], row["sourceId"], row["source"]) for row in records[0]["sdgs"]], [(1, 2, "framework")])

    def test_direct_country_mapping_takes_precedence_over_identical_catalogue_mapping(self):
        record = {"id": 12, "title": "People reached"}
        catalogue = {"id": 7, "name": "People reached", "sdgIndicators": [{"goalId": 1, "ref": "1.2.1", "name": "Poverty measure"}]}
        link = {"goalId": 1, "indicator": {"ref": "1.2.1", "name": "Poverty measure", "sustainableDevelopmentTarget": {"ref": "1.2"}}}
        with patch.object(fetcher, "search", side_effect=[([entity(12, links=[link])], []), ([catalogue], [])]):
            fetcher.enrich_sdgs(100, [record])
        self.assertEqual(len(record["sdgs"]), 1)
        self.assertEqual(record["sdgs"][0]["source"], "direct")

    def test_metadata_refresh_preserves_original_observations_and_retrieval_date(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            result = root / "public/data/uninfo/results/100.json"
            provenance = root / "data/uninfo/results/100-sources.json"
            result.parent.mkdir(parents=True)
            provenance.parent.mkdir(parents=True)
            observation = {"value": 0, "metricId": 3, "periodId": 18}
            original = {"planId": 100, "retrievedAt": "2025-01-01T00:00:00Z", "indicators": [{"id": 12, "title": "Some result", "cells": [{"observations": [observation]}]}]}
            result.write_text(json.dumps(original))
            provenance.write_text(json.dumps({"retrievedAt": original["retrievedAt"], "requests": [{"sha256": "old observation request"}]}))
            with patch.object(fetcher, "ROOT", root), patch.object(fetcher, "search", side_effect=[([entity(12)], []), ([], [])]):
                fetcher.refresh_metadata(100)
            refreshed = json.loads(result.read_text())
            evidence = json.loads(provenance.read_text())
            self.assertEqual(refreshed["retrievedAt"], original["retrievedAt"])
            self.assertEqual(refreshed["indicators"][0]["cells"], original["indicators"][0]["cells"])
            self.assertIn("metadataRetrievedAt", refreshed)
            self.assertEqual(evidence["requests"], [{"sha256": "old observation request"}])


if __name__ == "__main__":
    unittest.main()
