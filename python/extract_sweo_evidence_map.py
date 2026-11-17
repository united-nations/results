"""Export the SWEO country coverage map's public ArcGIS attributes to CSV."""

import csv
import json
from argparse import ArgumentParser
from collections import Counter
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import urlopen


QUERY_URL = (
    "https://services6.arcgis.com/HlnImfDko6qaRGJJ/arcgis/rest/services/"
    "For_ArcGis_Country_Type_Updated_Cote_Turkey/FeatureServer/0/query"
)
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data" / "sweo"

# Each category has numbered title (A) and link (L) fields.
CATEGORIES = (
    ("CP", "Country_Programme", "Country Programme", "country_programme"),
    ("ER", "Emergency_response", "Emergency Response", "emergency_response"),
    (
        "JP",
        "Joint_Programmes_and_Pooled_Fun",
        "Joint Programmes and Pooled Funding",
        "joint_programmes_and_pooled_funding",
    ),
    ("R", "Regional", "Regional", "regional"),
    ("G", "Global", "Global", "global"),
    ("SS", "Synthesis_Summaries", "Synthesis/Summaries", "synthesis_summaries"),
)


def query(**params):
    url = f"{QUERY_URL}?{urlencode(dict(where='1=1', f='json', **params))}"
    with urlopen(url, timeout=45) as response:
        data = json.load(response)
    if "error" in data:
        raise RuntimeError(f"ArcGIS query failed: {data['error']}")
    return data


def fetch_attributes():
    count = query(returnCountOnly="true")["count"]
    data = query(outFields="*", returnGeometry="false")
    if not count or data.get("exceededTransferLimit") or len(data["features"]) != count:
        raise RuntimeError("ArcGIS returned an empty or incomplete feature set.")
    return [feature["attributes"] for feature in data["features"]]


def extract(features):
    countries = {}
    locations = set()
    categories_by_report = {}
    for feature in features:
        code = f"{int(feature['M49_Code']):03}"
        country = feature["Country_or_Area"]
        existing = countries.get(code)
        # The source also contains zero-count copies of Türkiye and Côte d’Ivoire.
        if existing and existing["Total"] and feature["Total"]:
            raise ValueError(f"Multiple nonzero country totals for M49 code {code}")
        if existing is None or feature["Total"]:
            countries[code] = feature
        for prefix, _, category, _ in CATEGORIES:
            for slot in range(1, 41):
                title = (feature[f"{prefix}A{slot}"] or "").strip()
                link = (feature[f"{prefix}L{slot}"] or "").strip()
                if (title, link) in (("", ""), ("No Evaluation", "No Evaluation")):
                    continue
                locations.add((code, country, category, slot, title, link))
                categories_by_report.setdefault((title, link), set()).add(category)
    return countries, locations, categories_by_report


def write_csv(path, header, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(header)
        writer.writerows(rows)


def export(output_dir, countries, locations, categories_by_report):
    report_ids = {
        key: f"{index:04}"
        for index, key in enumerate(sorted(categories_by_report), 1)
    }
    reports = []
    for (title, link), report_id in report_ids.items():
        parsed = urlsplit(link)
        url = link if parsed.scheme in ("http", "https") and parsed.netloc else ""
        categories = " | ".join(sorted(categories_by_report[title, link]))
        reports.append((report_id, title, url, categories))

    report_countries = [
        (report_ids[title, link], code, country, category, slot)
        for code, country, category, slot, title, link in sorted(locations)
    ]
    counts_by_country = Counter(row[1] for row in report_countries)
    country_counts = [
        (
            code,
            feature["Country_or_Area"],
            feature["Total"],
            *(feature[field] for _, field, _, _ in CATEGORIES),
            counts_by_country[code],
        )
        for code, feature in sorted(countries.items())
    ]

    output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(
        output_dir / "reports.csv",
        ["report_id", "title", "report_url", "category"],
        reports,
    )
    write_csv(
        output_dir / "report-countries.csv",
        ["report_id", "m49_code", "country_or_area", "category", "source_slot"],
        report_countries,
    )
    write_csv(
        output_dir / "country-counts.csv",
        [
            "m49_code", "country_or_area", "published_total",
            *(f"published_{name}" for _, _, _, name in CATEGORIES),
            "extracted_report_count",
        ],
        country_counts,
    )
    print(
        f"Wrote {len(reports)} reports and {len(locations)} country associations "
        f"across {len(counts_by_country)} countries or territories to {output_dir}."
    )


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir", type=Path, default=OUTPUT_DIR,
        help="destination for the three CSV files (default: data/sweo)",
    )
    args = parser.parse_args()
    export(args.output_dir, *extract(fetch_attributes()))


if __name__ == "__main__":
    main()
