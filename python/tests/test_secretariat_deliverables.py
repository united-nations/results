"""Attribution regressions for shared Secretariat budget documents."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("deliverables", ROOT / "python/14-import_secretariat_deliverables.py")
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class DeliverableAttributionTests(unittest.TestCase):
    def test_human_rights_subprogrammes_use_ohchr_in_the_shared_section(self):
        candidates = [{"id": "ohchr", "name": "Office of the High Commissioner for Human Rights", "code": "OHCHR"},
                      {"id": "iimm", "name": "Independent Investigative Mechanism for Myanmar", "code": "IIMM"}]
        row = {"section": "24", "entity": "", "subprogramme_no": "1 (a)", "table_title": "Subprogramme 1 (a): deliverables"}
        self.assertEqual(importer.select_entity(row, candidates)["id"], "ohchr")

    def test_named_cross_cutting_unit_cannot_inherit_the_section_host(self):
        row = {"section": "3", "entity": "II. Cross-cutting information", "subprogramme_no": "1", "table_title": "Cross-cutting deliverables"}
        candidates = [{"id": "dppa", "name": "Department of Political and Peacebuilding Affairs", "code": "DPPA"}]
        self.assertIsNone(importer.select_entity(row, candidates))

    def test_exact_printed_entity_takes_precedence_over_section_host(self):
        candidates = [{"id": "dppa", "name": "Department of Political and Peacebuilding Affairs", "code": "DPPA"},
                      {"id": "oct", "name": "Office of Counter-Terrorism", "code": "OCT"}]
        row = {"section": "3", "entity": "V. Office of Counter-Terrorism", "subprogramme_no": "1", "table_title": "Deliverables"}
        self.assertEqual(importer.select_entity(row, candidates)["id"], "oct")

    def test_ambiguous_unnamed_units_are_not_forced_onto_an_entity(self):
        candidates = [{"id": "a", "name": "Office A", "code": "A"}, {"id": "b", "name": "Office B", "code": "B"}]
        row = {"section": "31", "entity": "", "subprogramme_no": "", "table_title": "Deliverables"}
        self.assertIsNone(importer.select_entity(row, candidates))


if __name__ == "__main__":
    unittest.main()
