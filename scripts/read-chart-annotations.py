"""Read missing-value and percentage annotations from PPB Word charts."""

import json
import math
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

CHART = "http://schemas.openxmlformats.org/drawingml/2006/chart"
TEXT = "http://schemas.openxmlformats.org/drawingml/2006/main"
SOURCE = re.compile(
    r"A_(\d+)_(\d+) \(Sect\.\s*(\d+[A-Z]?)\)"
    r"(?:[ _](Add\.\d+|Corr\.\d+))?(?: preliminary)?\.docx",
    re.IGNORECASE,
)
MISSING = re.compile(r"(?:[-–—]|n\s*/?\s*a\.?|not (?:available|applicable))", re.IGNORECASE)


def chart_tag(name):
    return f"{{{CHART}}}{name}"


def point_index(element):
    index = element.find(chart_tag("idx"))
    return int(index.get("val")) if index is not None else None


def read_annotations(source_directory):
    masks = []
    percentages = []
    for path in sorted(source_directory.glob("*.docx")):
        match = SOURCE.fullmatch(path.name)
        if not match:
            continue
        session, number, section, supplement = match.groups()
        symbol = f"A/{session}/{number} (Sect. {section.upper()})"
        if supplement:
            symbol += f"/{supplement.capitalize()}"
        with zipfile.ZipFile(path) as archive:
            for name in sorted(archive.namelist()):
                if not re.fullmatch(r"word/charts/chart\d+\.xml", name):
                    continue
                chart = ElementTree.fromstring(archive.read(name))
                for series in chart.iter(chart_tag("ser")):
                    series_index = point_index(series)
                    if series_index is None:
                        continue
                    values = series.find(chart_tag("val"))
                    if values is None:
                        values = series.find(chart_tag("yVal"))
                    raw_points = {}
                    if values is not None:
                        for point in values.iter(chart_tag("pt")):
                            text = point.findtext(chart_tag("v"))
                            try:
                                raw_points[int(point.get("idx"))] = float(text)
                            except (TypeError, ValueError):
                                continue
                    checked_scales = set()
                    for label in series.findall(f"{chart_tag('dLbls')}/{chart_tag('dLbl')}"):
                        value = "".join(node.text or "" for node in label.iter(f"{{{TEXT}}}t")).strip()
                        index = point_index(label)
                        if index is not None and MISSING.fullmatch(value):
                            masks.append([symbol, Path(name).name, series_index, index])
                        if index in raw_points and re.fullmatch(r"-?\d+(?:\.\d+)?%", value):
                            printed = float(value[:-1])
                            raw = raw_points[index]
                            if printed == raw == 0:
                                continue
                            if math.isclose(printed, raw * 100, abs_tol=1e-8):
                                checked_scales.add(100)
                            elif math.isclose(printed, raw, abs_tol=1e-8):
                                checked_scales.add(1)
                            else:
                                checked_scales.add(None)
                    scale = next(iter(checked_scales)) if len(checked_scales) == 1 else None
                    if not checked_scales and values is not None and any(
                        re.fullmatch(r"0(?:\.0+)?%", node.text or "")
                        for node in values.iter(chart_tag("formatCode"))
                    ):
                        scale = 100
                    if scale:
                        percentages.append([symbol, Path(name).name, series_index, scale])
    if not masks:
        raise ValueError(f"No missing chart annotations found in {source_directory}")
    return {"missing": masks, "percentages": percentages}


if __name__ == "__main__":
    print(json.dumps(read_annotations(Path(sys.argv[1]))))
