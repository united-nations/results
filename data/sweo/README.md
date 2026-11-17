# UN Evaluation Evidence Map (2021–2024)

These CSVs were extracted from the public ArcGIS country-coverage data published by the UNSDG System-Wide Evaluation Office. [Evidence map](https://system-wide-evaluation-office.github.io/UN_evaluation_evidence_map/) · [ArcGIS country layer](https://services6.arcgis.com/HlnImfDko6qaRGJJ/arcgis/rest/services/For_ArcGis_Country_Type_Updated_Cote_Turkey/FeatureServer/0)

- `reports.csv` has one row per distinct report title and source link. The generated `report_id` joins the two report files within each export.
- `report-countries.csv` has one row per populated report slot in a country or territory and category. It retains the numbered slot from the source and the three-digit UN M49 code.
- `country-counts.csv` compares published totals by category with the number of identifiable report entries for each country or territory.

The snapshot contains 693 evaluations and 20 syntheses or summaries. The map description cites 701 evaluations. Published country totals exceed the extracted entries by 53 across seven countries. One report's source link is `0`, which is exported as a blank URL.

To refresh from the live ArcGIS layer, run this from the repository root. The script uses the Python standard library.

```bash
python3 python/extract_sweo_evidence_map.py
```

Use `--output-dir /path/to/export` to write the CSVs elsewhere.
