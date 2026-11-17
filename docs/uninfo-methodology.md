# UN INFO processing

The fetcher runs in this repository and retrieves published Cooperation Frameworks
and UNDAFs alongside financial observations for 2022–2026. Each year's
`period-provenance.json` records the query year and retrieval time. The live
refresh was run here on 17 November 2026, replacing the initial imported snapshot.

## Framework and financial coverage

The map highlights countries with a published results framework active in the
selected year. Coverage comes from `POST /plan/public/search` with plan types
3 and 7 and the selected year, followed by the published strategic priority,
outcome, and output entities from `POST /plan/public/entity/search`.
Countries inherit their workspace's framework, including shared regional plans.

Financial observations come from the separate finance overview endpoint.
Every query passes explicit `planIds` from the published plans active in the
selected year, together with `financeYears`. The API's `workspaceIds` parameter
implicitly selects the newest framework cycle. Using it for an older financial
year can produce an empty response while the historical plan has reported money.
For example, Ethiopia's 2024 observations belong to plan 794 (2020–2025), while
workspace 170 defaults to plan 2693 (2025–2030).

Framework rows show available resources in USD beside their funding bars.
Tooltips retain required, available and expenditure amounts. Expanded branches
show their children immediately, followed by the full source description.
Frameworks with empty financial responses remain available on the map.

| Year | Countries with published frameworks | Countries with financial observations | Frameworks with no financial observations |
| ---- | ----------------------------------- | ------------------------------------- | ----------------------------------------- |
| 2022 | 130                                 | 122                                   | 8                                         |
| 2023 | 153                                 | 148                                   | 5                                         |
| 2024 | 155                                 | 154                                   | 1                                         |
| 2025 | 155                                 | 154                                   | 1                                         |
| 2026 | 147                                 | 146                                   | 1                                         |

Every country with financial observations also has a published framework in this
refresh. The old copied snapshot highlighted 127 countries for 2024 using
financial availability. The API's current published frameworks cover 155
countries and areas for that year, including members of shared Caribbean and
Pacific frameworks. Selecting explicit active plan IDs restores financial
observations for 32 additional country entries in 2024 compared with the earlier
workspace-only refresh. Syria has a published framework with an empty 2024
financial response. Published records can change between retrieval dates.

The map and country picker use `has_framework`. The legend therefore reads
“countries with available results frameworks”. Each year's `coverage.json`
records both sets and their differences. Tests verify every published entity ID,
parent, country, and basemap join for all five years.

The shared year selector updates the map, legend, country financial observations,
framework, and activities together. The default is 2025, the latest completed
calendar year at retrieval. The selector also includes the current year 2026.

## SDG groups and resources

Country overall resources sum all source SDG groups, including the null-ID
group exported as `unclassified`. Explicit zero values and signed adjustments
are retained. Global observations retain their independent API response.
Country totals cover their source workspace. Shared workspace entries display
the member countries. Parent and child framework financial observations overlap.

## Results framework identity

Strategic priorities, outcomes, and outputs use the API's stable source IDs.
Display codes can repeat under different parents and never establish duplicate
identity. Dated descriptions of the same source ID count once when their parent,
code, and financial observations agree; the description with the latest end date
is retained. Conflicting amounts or parent relationships fail export for review.
Linked outcomes and outputs retain their reported parent at the preceding
level. Published root outcomes and outputs retain their null parent. Missing
parent IDs fail export.
Parent and child financial amounts describe overlapping hierarchy levels and
must not be summed together.

Regression checks in `python/tests/test_uninfo_integrity.py` compare every
exported framework identity and parent with the retained raw snapshot, and check
country and global SDG amounts independently against their own source responses.

## Fetch and process in Results

Run from the repository root with Python 3.13 and uv. The requirements file pins
country-converter and constrains pandas to its compatible 2.x series.

```sh
# Fetch live data for all supported years, then process it.
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/08-fetch_uninfo.py
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/10-export_uninfo_json.py

# Refresh selected years with a bounded number of concurrent queries.
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/08-fetch_uninfo.py --years 2024 2025 --workers 8

# Validate all exported framework identities, coverage and source financials.
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python -m unittest discover -s python/tests -p test_uninfo_integrity.py
```

The fetcher paginates searches, retries transient HTTP errors, and fetches shared
workspace observations once per year. It completes requests for every selected
year in temporary storage before publishing the refreshed raw files.

Raw files live under `data/uninfo/raw/<year>/`. The exporter writes
`public/data/uninfo/<year>/uninfo-countries-index.json`, country detail files
under `countries/`, `uninfo-sdgs.json`, and `coverage.json`.
`public/data/uninfo/manifest.json` lists available years, the default year and
official SDG labels and colors from the API. The frontend loads the selected
year's index and country data using GitHub Pages base paths.

## Shared UI components

The country sidebar uses the same `FinancialDetailPanel`,
`FinancialPanelYearSelector`, heading hierarchy, drawer proportions, funding
bars, compact expandable results tree and project cards as `open/`.

Reusable drawer behavior, resource bars, results framework trees and activity
cards are implemented in `@un-eosg/ui`. Shared UI commit
`a0274f8f304c1b3a0158f51a40f73bf6f0458ff6` is on the local
`codex/uninfo-results-components` branch in the shared UI repository.
The app installs its package from `vendor/un-eosg-ui-a0274f8.tgz` through pnpm.
The packaged dependency makes installation reproducible while publication of the
shared UI branch awaits authorization. Storybook examples and registry entries
live in the shared library source.

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
