![WIP](https://img.shields.io/badge/status-WIP-yellow)

# UN Results

- **UN Secretariat:** Explore programme-budget results as a grid grouped by priority area or beneficiary, or as an ungrouped grid. Expand groups into entities and subprogrammes, preview results, and open official objectives, strategies and full result content in sidebars. The locations map remains available at `/locations/`.
- **UN System:** TBD.

## Run locally

Use Node.js 24 (22.18 or later is supported) and pnpm 11.22.0.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). For local site or analytics
settings, copy `.env.example` to `.env.local`.

## Refresh the data

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

Result sidebars show entity and subprogramme context links, related results from
the same subprogramme (or entity), and budget-document sources at the bottom.
Overview pages, sidebars and hover previews share the same minimal result card.

Entity and subprogramme overview text uses the objectives and strategies in the
programme budget snapshot. Keep this official source text intact when refreshing
the export; do not add separately written entity summaries.

With the Programme Budget Data and Open UN checkouts alongside this one, prepare
the 2027 results export in Programme Budget Data and run:

```bash
results_export=../programme-budget-data/data/processed/ppb2027/results-export
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
