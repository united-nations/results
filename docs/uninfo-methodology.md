# UN INFO processing

The country map lists every country or area with a published Cooperation Framework
or UNDAF results hierarchy. Opening a country selects the most recent published
plan overlapping the map's reporting year (2025), or the latest plan if none
overlaps. Available plans are
ordered by its actual start date, end date and source plan ID. The sidebar offers
that country's available plan spans using the shared period selector.

## Plan periods and finances

Framework periods vary by country. Ethiopia's published plans span July 2020–June
2025 and July 2025–June 2030. Kenya has a July 2022–June 2027 plan, while Nepal's
2023–2027 plan uses calendar years. Mid-year dates remain visible in selector
labels. If two published source plans have the same date span, their IDs
disambiguate the options.

Financial requests use explicit `planIds` and include all reported financial
years for the selected plan. The API's `workspaceIds` parameter otherwise
selects its newest plan, which can hide an older plan's financial observations.
Each framework row shows expenditure in USD, with an expenditure-only tooltip.
The country/shared-framework overview and every hierarchy item have separate,
collapsed sections for entity expenditure and for the required/available/spent
comparison. Parent and child hierarchy finances overlap.

## Expenditure circles

The map overlays expenditure circles using Open UN's circle styling: translucent
blue fill, solid blue outlines and circle area proportional to USD expenditure.
A $1 billion reference circle has a 12px radius at the initial zoom. The country
fill is pale blue for single-country frameworks and pale orange for shared
frameworks. Shared expenditure circles use orange outlines and fills, while
single-country circles retain UN Blue. The legend labels both categories; size
scaling is the same for both. Circles counter-scale map zoom completely to keep
their screen sizes consistent with the fixed expenditure-size legend.
The category legend sits directly above the map, after the scope note and country
selector. The initial map scale is capped at 0.9 to leave space for the shared
Pacific marker near the date line; the earlier enlarged view could clip it.

The map uses calendar-year **2025** expenditure, rather than full-plan figures.
`python/09-fetch_uninfo_annual.py` explicitly binds finance requests to published
plan IDs active in the selected year and passes `financeYears`. The annual
country-team workspace totals sum reported `Total Expenditure` across all SDG
groups, including the unclassified group. These groups are not added to the
separate framework hierarchy or project totals. There is no full-period fallback.

`python/11-export_uninfo_annual.py` prepares the map and comparison payload at
`public/data/uninfo/annual-expenditure-2025.json`, with the exact source query,
year, retrieval time and reconciliation values. The 2025 global UN INFO amount
is $15,521,335,435.275 before display rounding; it matches the sum of unique
workspace totals. A country with missing annual observations remains null.
Zero, negative or absent expenditure produces no circle; frameworks remain
selectable. Shared multi-country workspaces produce one circle, positioned at
the spherical mean of their displayed member-country coordinates. Tooltips label
shared totals as such, rather than inventing country allocations.

The selected sidebar continues to show full-plan framework figures, with a
visible note distinguishing those figures from the annual map. The manifest
also retains full-period expenditure summaries: these sum a non-overlapping
framework finance frontier, using a parent's reported expenditure when present
and descending only when it is absent. They are not used for map circles.

## Scope comparison

The compact context note above the map shows three zero-based bars with explicit
years on every label:

- CEB UN system expenditure (2025): **$64.4 billion**.
- UN country teams (2024): **$43.5 billion**.
- Country-framework expenditure reported in UN INFO (2025): **$15.5 billion**.

The second amount is the rounded, published figure from the
[UN80 country-team reconfiguration briefing](https://www.un.org/un80-initiative/sites/default/files/2026-01/UN80%20Look%20Public%20WP5%20UNCT%20Reconfiguration_for%20distribution_FINAL.pdf).
It is stored in `data/un-country-team-spending.json`, including its source year,
published precision and attribution to CEB 2024 expenditure data. The briefing
does not provide the full filters or calculation. This amount is intentionally
not converted or extrapolated to 2025. It is not an independently reproduced
country-team ledger total, and the difference against 2025 UN INFO is not a
same-year funding or reporting gap.
The retained current CEB export does not reproduce the slide's country-level
or system total; the relevant vintage or population filters remain unresolved.
This does not disprove the briefing's country-team label. Country-team spending
is combined agency expenditure, not the operating budget of Resident
Coordinator offices.

The annual payload also retains contextual CEB activity figures, which are not
the middle bar: development ($22.526462039 billion) plus humanitarian assistance
($25.100379972 billion). Their snapshot is `data/system-function-expenditure-2025.json`, copied from
Open UN's `public/data/function-geography-2025.json`. That export uses E06 rows
from CEB's country/function dataset; source metadata and hashes remain in the
snapshot. Its system total differs from the entity-spending control by about
$1.14 because of source precision, which is recorded in the annual payload.
All displayed ratios use the entity-spending control as their denominator.

The UN development system funding report defines operational activities for
development to include development and humanitarian assistance. The latest
formal report found during this investigation reports **2024** ($48.5 billion,
74% of UN system expenditure); it is definition/context evidence, not the source
of the displayed country-team amount. See the
[DESA funding report, paragraphs 32–34](https://digitallibrary.un.org/record/4114681)
and [CEB function methodology](https://unsceb.org/statistics/expenses-by-function/).

UN INFO's 2025 reported amount is equivalent to **24.1%** of overall CEB system
expenditure in the same year. This ratio is not an audited coverage rate. No
ratio is shown against the differently dated country-team benchmark. The bars
compare scale across explicitly labelled years; they are not an
accounting partition. UN INFO covers Cooperation Framework workplans rather
than every development-system financial transaction. Country coverage alone
does not establish monetary coverage.

The [2025 SWEO evaluation](https://www.unaids.org/sites/default/files/2025-09/2025_New-Generation-UN-Country-Teams_en_0.pdf)
documents incomplete or outdated workplan data (printed p.75, paragraph 169),
inconsistent entity participation across all 13 sampled workplans (p.77,
paragraph 180), incompatible reporting systems and duplicate entry (p.79),
and difficulty disaggregating regional commissions' budgets by country. These
are documented limitations, not a quantified explanation for every dollar of
the gap. CEB also includes humanitarian, regional and global activities. The
difference cannot be assigned wholly to headquarters costs or unreported work.
Definitions, percentages and sources stay inside the chart's collapsed expander.

The sidebar presents the results hierarchy. Fully uppercase source
titles display in title case. Expanded items show full descriptions before
child items, aligned with the parent title text. Numbered badges show their
strategic priority, outcome or output type. Shared workspace member
countries are identified in the sidebar.

## Entity finance breakdowns

All system-page amounts use `formatBudget` from `@un-eosg/ui/format-budget`, the
same formatter used by Open UN. It rounds compact USD amounts consistently and
keeps tiny non-zero amounts distinct from zero.

`python/10-export_uninfo_json.py` adds nullable resource metrics and entity
allocations to plan payloads. Country/shared-framework totals use a non-overlapping
frontier of framework observations. Overall entity records use the agency totals
already returned by the source agency/project grouping. Node entity records roll
each reported agency/project finance row up its stable parent-ID chain into the
corresponding output, outcome and strategic priority. These allocations are
alternative views of the same spending and must not be summed across levels.

Every reported dated project finance row is retained: the API's agency totals
include these rows even where dates share one project ID. An investigation of
the retained snapshot found that the resulting allocations match the aggregate
framework finances except for 38 nodes in Mali plan 1024, where source groupings
differ. Direct agency/framework records for that plan are retained in
`data/uninfo/plans/raw/agency_framework_finances.json` and take precedence over
the project roll-up. To refresh a selected plan's direct groupings:

```sh
python3 python/12-fetch_uninfo_agency_finances.py --plan-ids 1024
python3 python/10-export_uninfo_json.py
```

The fetcher requires curl and uses public, read-only API requests. Its stored
scope and retrieval time identify the explicitly requested plan IDs. Omitting
`--plan-ids` requests all published plans and can take substantially longer.
Plan period selection and full-period scope remain explicit in the sidebar;
the map still shows the separate 2025 annual workspace totals. Absent financial
observations display as unreported rather than fabricated zeroes. An actual
disagreement between entity allocations and the reported aggregate is displayed
inside the entity expander; amounts are never prorated to force reconciliation.

## Fetch and process

Run these commands from the repository root with Python 3.13 and uv.

```sh
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/08-fetch_uninfo.py
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/10-export_uninfo_json.py
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/09-fetch_uninfo_annual.py --years 2025
uv run --no-project --python 3.13 python python/11-export_uninfo_annual.py --year 2025
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python -m unittest discover -s python/tests -p test_uninfo_integrity.py
```

The fetcher retrieves all public plan records, their strategic priorities,
outcomes and outputs, source workspace countries and full-plan financial
observations. It paginates searches and retries transient request failures.
All requests complete before the new raw snapshot is published.

The source snapshot in `data/uninfo/plans/raw/` retains framework IDs, parent
and plan links, complete titles, descriptions and dates, plus financial responses.
The exporter writes one payload per
source plan in `public/data/uninfo/plans/<id>.json` and creates
`public/data/uninfo/plans/manifest.json` with country membership, available
plans, plan expenditure totals, workspace member names and the latest plan IDs. Countries sharing a framework read the same
plan payload. Previous year-indexed files remain historical snapshots.
The sidebar uses the plan-based dataset; annual map figures come from the
separately year-filtered snapshot in `data/uninfo/raw/2025/`.

Source IDs establish framework identity. Duplicate dated descriptions of a source
ID retain the latest end date when parents, codes and financial observations
agree. Conflicting amounts and orphaned parents fail export. Published root
outcomes and outputs retain their null parent and actual level. Regression
checks verify every exported identity, description, parent, finance join and
country-to-plan relationship, including its basemap representation.

## Country-framework evaluation links

The UNSDG [country-team evaluation listing](https://unsdg.un.org/resources/unct-key-documents?f%5B0%5D=country_document_type_api:Eval&page=0)
is a separate document source. The 20 November 2026 discovery snapshot covers
all 18 paginated pages and 207 entries, including repeated uploads and documents
that the source classifies as evaluations but are actually terms of reference,
inception reports, drafts or supporting files.

`data/unct-evaluations-source.json` retains the listing inventory and document
verification evidence. `public/data/uninfo/evaluations.json` contains the compact
links indexed by existing UN INFO plan ID. Links require an explicit evaluated
framework cycle and matching country or shared workspace. Publication year alone
does not establish the evaluated period. Sidebars list all verified reports
across the country's retained plans and verified historical reports, grouped into the latest framework (current
period) and previous periods, independently of the selected financial period.
Each report retains its own evaluated cycle. Cover previews are explicitly
marked placeholders until real cover images are extracted.
`data/unct-evaluation-country-reports.json` retains evidence for additional
country reports whose cycles have no exact retained financial plan. These do
not get invented plan IDs. Reports predating the latest framework appear under
previous periods; those covering its time span appear under current period,
retaining their own explicit evaluated dates rather than claiming an exact
framework match. Regional scope conflicts, preliminary reports and ambiguous
cycles remain excluded. `node scripts/export-unct-evaluations.mjs` combines the
plan-bound reports and this reviewed inventory into the public country groups.
Duplicate uploads of the same report are shown
once. Non-final documents and unresolved matches are omitted from direct report
links. The sidebar always links to the full source listing; an absent match does
not mean that no evaluation exists.

To rediscover the complete listing, install Playwright's Chromium runtime and run:

```sh
pnpm exec playwright install chromium
node scripts/fetch-unct-evaluation-listing.mjs /tmp/unct-evaluation-listing.json
```

The crawler follows and validates pagination, checks every item range and the
final total, records page hashes and writes the inventory atomically only when
complete. This discovery output does not overwrite reviewed plan matches.
Inspect each report's actual title, document type and evaluated cycle before
updating the source evidence and public link index. Unavailable or ambiguous
documents stay unresolved rather than acquiring a country-only match.

## Shared UI

The sidebar uses `FinancialDetailPanel`, the shared
`FinancialPanelPeriodSelector`, drawer controls, `FinancialBreakdownRow` and
financial comparison rows from `@un-eosg/ui`. The existing year-selector API delegates to
the same selector. Its background uses Results' neutral `secondary` token.

The reusable components are published on the shared UI repository's `main`
branch. Results pins the published Git commit through pnpm. Shared component
source, Storybook examples and registry entries live in that library.

## Public API investigation on 17 November 2026

Public endpoints expose indicator results with baseline, target, and reached
observations, alongside framework descriptions and finances. Unauthenticated
requests to the following endpoints returned HTTP 200. Their base URL is
`https://api.uninfo.org/v1.0`.

| Endpoint                          | Read-only request and available data                                                                                                                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /plan/public/search`        | `{"workspaceIds":[21],"planTypeIds":[3,7],"year":2024,"limit":10}` returns published Cooperation Framework and UNDAF plans. Afghanistan's plan ID is 1945.                                                                                                           |
| `GET /plan/public/1945`           | Full published plan, entity prototypes, metric definitions, assessments, milestone records, and framework hierarchy. Indicator prototypes have `coreentityTypeId: 7` and define metrics 1 Baseline, 2 Target, and 3 Reached.                                         |
| `POST /plan/public/entity/search` | `{"planIds":[1945],"coreentityTypeIds":[7],"limit":100,"page":1}` returns country-specific indicators with names, units, calculation metadata, stable IDs, and parent outcome/output IDs. Pagination reports 133 Afghanistan indicators. Georgia's plan 774 has 108. |
| `POST /planEntityCell/search`     | `{"planEntityIds":[112861],"limit":100,"page":1}` returns disaggregation cells, category labels, and their assessments. Link `planEntityId` to the indicator, then `assessmentVersion.properties.value` by `metricId` and `timeframeId`.                             |
| `POST /timeframe/search`          | `{"timeframeIds":[17,18,1289],"limit":100}` resolves reporting intervals. ID 17 is calendar 2024, 18 is calendar 2025, and 1289 is the custom interval July 2023–December 2024.                                                                                      |

The vaccine indicator 112861 has separate cells for measles and Penta-3.
In the published response, cell 458036 reports measles baseline 74% in custom
timeframe 1289, reached 72.9% in 2024, and target 90% in 2025. Cell 458035
reports Penta-3 baseline 61% in timeframe 1289, reached 78.7% in 2024, and target
80% in 2025. These observations demonstrate that measured results can support a
country indicator view with disaggregation and year-specific comparisons.
The baseline and target reporting periods need to stay visible.

A future results import can paginate published indicator entities, batch their
IDs into cell searches, resolve timeframe IDs, and retain the raw observations,
units, parent relationships, and source IDs. Values include percentage strings,
numbers, free text, and blanks. Preserve their types and disaggregations
through processing. Aggregate only indicators with compatible units, definitions,
reporting periods, and calculation metadata.

The generic `POST /indicator/search` returned indicator catalogue entries with
empty `planEntities` in the sampled response. Supplying `planIds` did not make
those rows country observations. The country entity search above provides the
verified path for country-specific indicator records. The administrative
`GET /plan/indicator/evaluate/1945` returned HTTP 401.

Other available leads include framework-cycle dates, means-of-verification form
definitions, SDG links, milestone planned/actual dates and comments, and
assessment disaggregation by designed category, agency, location, or partner
where populated. The map uses the annual financial snapshot described above.

The API documentation and the public portal's API calls supplied the endpoint
references. [UN INFO API documentation](https://api.uninfo.org/docs),
[public portal JavaScript](https://uninfo.org/main.js),
[Afghanistan public plan](https://api.uninfo.org/v1.0/plan/public/1945),
[Georgia public plan](https://api.uninfo.org/v1.0/plan/public/774).
