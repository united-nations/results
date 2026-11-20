The Secretariat’s Deliverables prototype reads the 2027 numerical and narrative
deliverables CSV exports from the sibling Programme Budget Data checkout.
Refresh it from this repository with:

```bash
python3 python/14-import_secretariat_deliverables.py
```

The public snapshot is `public/data/secretariat-deliverables-2027.json`.
Input hashes, the source revision and unmatched source-unit names are retained
in `data/secretariat-deliverables-sources.json`. This uses the existing
deliverables extraction, separately from the verified results-only bundle.

Each numerical card represents a leaf row in its source table and keeps its
individual year/measure observations. Parent totals that contain those leaves
are excluded to avoid displaying overlapping totals and components together.
Cards and unlike units are never summed. The 2027 budget commonly provides
2025 actual and planned values, plus 2026 and 2027 plans. The selected year is
explicit; a planned value is labelled as planned. Narrative deliverables belong
to the budget edition and are not presented as annual measured achievements.

Entity joins use source names or unique ownership of the source document in the
existing results snapshot. Shared documents are not forced onto one entity.
Unmatched units remain under their printed source identity in Other budget
units. Beneficiary and location tags from results are not copied to deliverables.

The initial import contains 3,059 numerical leaves and 840 narrative leaves.
This is a quick prototype; its new import and UI have not undergone a separate
review or test cycle.
