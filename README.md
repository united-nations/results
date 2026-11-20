![WIP](https://img.shields.io/badge/status-WIP-yellow)

# UN Results

- **UN Secretariat:** Explore programme-budget results as a grid grouped by priority area or beneficiary, or as an ungrouped grid. Expand groups into entities and subprogrammes, preview results, and open official objectives, strategies and full result content in sidebars. The locations map remains available at `/locations/`.
- **UN System:** Explore UN country results frameworks and browse 46 reporting entities by their largest SDG expenditure allocation or by Open UN's System Chart grouping at `/system/` (also `/un-system/`). The directory prototype includes sample impact statements, strategic plan and results framework links, and inactive annual report placeholders.

## Run locally

Use Node.js 24 (22.18 or later is supported) and pnpm 11.22.0.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). For local site or analytics
settings, copy `.env.example` to `.env.local`.

## Refresh the data

The entity directory uses `data/system-entities.json`, a local 2025 snapshot of
Open UN's CEB SDG expenditure, entity expenditure totals and organization
grouping. Source URLs pinned to repository commits are recorded in the snapshot.
Descriptions and available logos come from the UN System Chart; missing logos
use a generic icon. The earlier `data/systemchart-entity-documents.json` snapshot
is retained as an input for its cleaned strategic plan and results framework
links. Annual reports are intentionally inactive placeholders, and the five
impact statements per entity are explicitly labelled illustrative copy.

Each entity is assigned to its largest positive allocation across SDGs 1–17.
Equal allocations use the lower goal number. Entities with no allocation to
those goals appear in an eighteenth **Non-SDG** entry. This represents explicitly
reported CEB code X00, not missing reporting. Other positive contributors to each
category appear in a compact, progressively revealed list. The 2025 snapshot
displays 46 reporting entities, of which five have no allocation to goals 1–17.
UNODC is excluded as a separate directory entry; its expenditure remains in
the source system and SDG totals and is not merged into the Secretariat's figures.
The directory covers these financial reporting entities, rather than every body
in the System Chart.

The System page opens on an **Organizations** tab; **Country teams** contains
the country map and scope note. Switching tabs preserves each view's controls.
The country map uses pale framework-coverage shading with proportional
expenditure circles styled after Open UN. Each circle shows reported expenditure
for calendar 2025; hover to see the annual USD amount. Shared country-team
workspaces have one joint circle rather than duplicated country totals. A compact
three-bar note compares 2025 CEB system expenditure, the published 2024 UN
country-team benchmark and 2025 reported UN INFO expenditure; each label shows
its year, and definitions and sources are in its
expander. `python/09-fetch_uninfo_annual.py --years 2025` refreshes the annual raw
observations; `python/11-export_uninfo_annual.py --year 2025` creates
`public/data/uninfo/annual-expenditure-2025.json`. The CEB function input is kept
at `data/system-function-expenditure-2025.json`; the published country-team
benchmark is in `data/un-country-team-spending.json`. See `docs/uninfo-methodology.md`
for source definitions, the annual processing commands and coverage limitations.
Country sidebars focus on expenditure for the selected framework period. A
country/shared-framework overview and every strategic priority, outcome and
output offer collapsed **Expenditure by entity** and **Required, available and
expenditure** sections. Entity allocations follow source project-to-framework
parent IDs; separately retained direct API groupings take precedence where
available. Missing metrics remain unreported. All money on the system page uses
`formatBudget` from `@un-eosg/ui/format-budget`, matching Open UN.
SDG groups can be sorted by goal number (with Non-SDG last) or by expenditure,
highest first, including the Non-SDG category. Changing sort preserves the open
group and the original goal numbers.
System Chart categories also show their share of total system expenditure and
can be sorted by chart order or expenditure. Category totals retain all source
expenditure, including UNODC even though it has no separate directory entry.

Category percentages use total CEB system expenditure as the denominator,
including Non-SDG and signed "Not specified" reconciliation differences. The
latter remain separate from the Non-SDG entry; displayed category shares can
therefore differ from 100% in total. Open UN combines accrual and budgetary
expenditure in this export. These allocations describe reported expenditure,
not mandates or measured impact.

To regenerate the snapshot and copy available organization logos, provide local
Open UN and System Chart checkouts and their source commit identifiers:

```bash
node scripts/prepare-system-entities.mjs ../open ../un-system-chart-navigator <open-commit> <system-chart-commit>
```

This is an explicit preparation step with no database access or runtime writes.
The script currently selects 2025. Official SDG artwork is stored locally in
`public/images/sdgs/01.jpg` through `17.jpg`, downloaded from
`https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-01.jpg` (substitute each
two-digit goal number). Copied organization logos live in
`public/images/system-entities/`.

The site builds from `data/ppb-2027.json`. Page content comes from the 2027
proposed programme budget exports. Priority grouping assigns each entity to its
largest spending priority in Open UN's 2025 financial reporting, summed across
funding sources.

Beneficiary grouping uses `data/oict-result-tags-2027.json`. A result with two
beneficiaries appears in both groups; group counts must not be summed as a unique
total. Results without imported beneficiary tags remain in an Unclassified group.

Search and filters apply before grouping. Search matches result content, entity and
subprogramme names, priority areas, beneficiaries and location names. Priority area, beneficiary,
location and budget-structure filters combine with OR within each filter and AND
across filters. Global coverage is separate from country tags. The ungrouped view
shows each matching result once, using neutral compact tiles or readable cards. Switching
grouping preserves search and filters. The budget filter follows the part, section,
entity, subprogramme and component hierarchy; selecting a parent includes its
descendant results.

Search suggestions offer matching categories alongside a free-text option. Enter
keeps free-text search unless a suggestion is highlighted with the arrow keys.
Selecting a category adds that filter, clears the query and preserves grouping.
Removable filter chips remain visible when the filter panel is collapsed.

Result sidebars show entity, subprogramme and priority-area context cards, related results from
the same subprogramme (or entity), and budget-document sources at the bottom.
Overview pages, sidebars and hover previews share the same minimal result card.

Priority-area sidebars use the official 2025 annual report's opening Context and
Our goals passages; effective functioning uses Our work and our people. The
extracted text, printed page numbers, PDF spread pages, source URLs and inspected
PDF hash are stored in `data/priority-area-introductions-2025.json`. PDF line breaks
are normalized to spaces; the source wording and section headings are retained.
The sidebars identify the report edition and link to the inspected UN-hosted PDF.
Priority-area context cards open the same sidebar as the overview Learn more links,
preserving the current grouping and returning to the source result when closed.
These passages provide annual-report context and do not change financial priority
assignments or budget results.

Entity and subprogramme overview text uses the objectives and strategies in the
programme budget snapshot. Keep this official source text intact when refreshing
the export; do not add separately written entity summaries.

With the Programme Budget Data and Open UN checkouts alongside this one, prepare
the 2027 results export in Programme Budget Data from committed extraction code:

```bash
cd ../programme-budget-data
uv run python scripts/build_results_export.py \
  --edition 2027 \
  --financial-input data/processed/financial/2027.json \
  --output data/processed/ppb2027/results-export-verified --replace
uv run python -m pipeline.verify.results_attribution \
  --published-data-dir data/processed/ppb2027/results-export-verified/portal-data
cd ../results
```

For a one-time replacement of a dedicated pre-manifest bundle, also pass
`--replace-legacy`. If the old folder contains unrelated assets, choose a new
output directory rather than deleting them. The builder reparses the selected official Word documents
into isolated intermediates and leaves financial assets unchanged. It rejects
source changes during the build. The importer verifies every bundle checksum
and reads a consistent captured copy; development exports made from uncommitted
extractor code are rejected. The snapshot retains the export manifest and source
fingerprints under `extraction`.

Then import the verified bundle:

```bash
results_export=../programme-budget-data/data/processed/ppb2027/results-export-verified
node scripts/import-programme-budget.mjs \
  "$results_export/portal-data" \
  "$results_export/entity-overlay-2027.json" \
  ../open/public/data/secretariat-overview-2025.json \
  "$results_export/chart-annotations-2027.json"
```

The importer checks that the entity overlay matches the budget exports and records
the input checksums. Chart annotations identify explicit missing values and
percentages from the Word charts. Review any unmapped entities or strategies
reported during the import. The original OICT dashboard exports are preserved
in `data/oict/` for reference. The results pages use the proposed programme
budget snapshot.

After refreshing the budget snapshot, run `node scripts/match-oict-results.mjs`
to rebuild the beneficiary and location links. The script matches on document,
result type, and title, with reviewed exceptions for shortened and revised
titles. Unmatched OICT entries are reported separately. Locations use the UNDP
choropleth map and country names from Open UN. The bundled [UNDP basemap](https://github.com/UNDP-Data/dv-country-geojson)
is distributed under its [MIT license](public/data/world-map.LICENSE.txt).
To rebuild the location lookup as well, pass the Open UN
`public/data/geographic-expenses-2025.json` export and an ISO 3166-1 JSON file
from the `iso-codes` package as the two arguments.

## Checks and publishing

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

The [GitHub Pages workflow](.github/workflows/nextjs.yml) builds the static site
on pushes to `main`.

- [Customize the site](docs/customization.md)
- [Configure GitHub Pages](docs/github-pages.md)
- [Maintain dependencies and run checks](docs/maintenance.md)
