# Export DataFrame to JSON in records format
# Export to public/data/

from argparse import ArgumentParser
from pathlib import Path

import pandas as pd

parser = ArgumentParser(description="Convert a CSV to JSON records for the website.")
parser.add_argument("input", type=Path, help="CSV file to convert")
args = parser.parse_args()
df = pd.read_csv(args.input)

output_path = Path("public") / "data" / "data.json"
output_path.parent.mkdir(parents=True, exist_ok=True)

df.to_json(output_path, orient="records", indent=2)
