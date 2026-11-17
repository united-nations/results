# UN INFO processing

The country map lists every country or area with a published Cooperation Framework
or UNDAF results hierarchy. Opening a country selects its latest published plan,
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
Each framework row shows available resources in USD. Tooltips show required,
available and expenditure figures. Parent and child hierarchy finances overlap.

The sidebar presents the results hierarchy. Fully uppercase source
titles display in title case. Expanded items show full descriptions before
child items, aligned with the parent title text. Numbered badges show their
strategic priority, outcome or output type. Shared workspace member
countries are identified in the sidebar.

## Fetch and process

Run these commands from the repository root with Python 3.13 and uv.

```sh
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/08-fetch_uninfo.py
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/10-export_uninfo_json.py
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
plans and the latest plan IDs. Countries sharing a framework read the same
plan payload. Previous year-indexed files remain historical snapshots.
The current interface and import scripts use the plan-based dataset.

Source IDs establish framework identity. Duplicate dated descriptions of a source
ID retain the latest end date when parents, codes and financial observations
agree. Conflicting amounts and orphaned parents fail export. Published root
outcomes and outputs retain their null parent and actual level. Regression
checks verify every exported identity, description, parent, finance join and
country-to-plan relationship, including its basemap representation.

## Shared UI

The sidebar uses `FinancialDetailPanel`, the shared
`FinancialPanelPeriodSelector`, drawer controls, framework funding bars and
activity cards from `@un-eosg/ui`. The existing year-selector API delegates to
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
where populated. The map uses the live year-filtered framework and finance refresh described above.

The API documentation and the public portal's API calls supplied the endpoint
references. [UN INFO API documentation](https://api.uninfo.org/docs),
[public portal JavaScript](https://uninfo.org/main.js),
[Afghanistan public plan](https://api.uninfo.org/v1.0/plan/public/1945),
[Georgia public plan](https://api.uninfo.org/v1.0/plan/public/774).
