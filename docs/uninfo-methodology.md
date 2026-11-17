# UNINFO processing

UNINFO Cooperation Framework resources remain separate from CEB and Secretariat
finances. The retained snapshot has country SDG queries for 2024 where verified;
unverified periods, shared-workspace geography, and missing project/framework
query periods retain their existing qualifications in the exports and interface.
Refreshing these exports does not fetch or update the underlying source snapshot.

## SDG groups and overall resources

Country **Overall** resources sum every reported group in that country's SDG
response, including the group whose source SDG ID is null. That group is exported
as `unclassified` and displayed as **Not classified by SDG**. It is a reported
classification gap, not a calculated balance or an allocation to any numbered
goal. An absent group remains absent; an explicitly reported zero group remains
present. Signed observations are retained.

The global SDG export preserves the global source response independently,
including its own null-ID group where reported. It does not calculate a global
amount from country sums. Country comparisons include only verified 2024
country observations and exclude shared-workspace totals, so they need not sum
to global observations.

## Results framework identity

Strategic priorities, outcomes, and outputs use the API's stable source IDs.
Display codes can repeat under different parents and never establish duplicate
identity. Dated descriptions of the same source ID count once when their parent,
code, and financial observations agree; the description with the latest end date
is retained. Conflicting amounts or parent relationships fail export for review.
Every retained outcome and output must link to its reported parent at the
preceding level; orphaned IDs fail export rather than silently disappearing.
Parent and child financial amounts describe overlapping hierarchy levels and
must not be summed together.

Regression checks in `python/tests/test_uninfo_integrity.py` compare every
exported framework identity and parent with the retained raw snapshot, and check
country and global SDG amounts independently against their own source responses.

## Import and refresh in Results

The retained raw snapshot and processing code were copied from the local
`open/` checkout at commit `d61db4a2038d27b96e7ce0854cbfdafe485f365e`.
The index has 127 countries and areas with framework data. Nine Pacific entries
share workspace 241 and its financial observations. The map highlights
availability and lets users open each country's entry, including shared
workspaces. Both `/system/` and the existing `/un-system/` page expose the map.

Run these commands from the repository root. Python 3.13 and uv are sufficient.
The requirements file pins country-converter and constrains pandas to its
compatible 2.x series.

```sh
# Regenerate public JSON from the retained raw snapshot.
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/10-export_uninfo_json.py

# Fetch a fresh 2024 snapshot, then regenerate public JSON.
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/08-fetch_uninfo.py
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python python/10-export_uninfo_json.py

# Check source identity, hierarchy, and financial consistency.
uv run --no-project --python 3.13 --with-requirements python/uninfo-requirements.txt python -m unittest discover -s python/tests -p test_uninfo_integrity.py
```

The fetcher queries 2024 explicitly, makes fresh requests on every run, and
collects the complete response set before replacing raw files. It records
verified query periods in `data/uninfo/raw/period-provenance.json` after a
successful refresh. That file is absent from the imported snapshot, so its
project, framework, and global financial query periods remain unverified.
Country SDG periods retain their source qualifications.

The exporter preserves full framework and activity names and descriptions.
It writes `public/data/uninfo-countries-index.json`, individual files under
`public/data/uninfo-countries/`, and `public/data/uninfo-sdgs.json`. The
country files load when a country opens. The frontend reads bundled public
JSON and supports GitHub Pages subpaths.

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
where populated. The live results endpoints were investigated separately from
the retained financial snapshot displayed on the map.

The API documentation and the public portal's API calls supplied the endpoint
references. [UN INFO API documentation](https://api.uninfo.org/docs),
[public portal JavaScript](https://uninfo.org/main.js),
[Afghanistan public plan](https://api.uninfo.org/v1.0/plan/public/1945),
[Georgia public plan](https://api.uninfo.org/v1.0/plan/public/774).
