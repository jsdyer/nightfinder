"""Prepare a browser-local Canadian gazetteer from the GeoNames cities500 download."""
import argparse
from io import BytesIO
import json
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

SOURCE = "https://download.geonames.org/export/dump/cities500.zip"
REGIONS = dict(zip(
    "01 02 03 04 05 07 08 09 10 11 12 13 14".split(),
    "AB BC MB NB NL NS ON PE QC SK YT NT NU".split(),
))
OUTPUT = Path(__file__).resolve().parents[1] / "web" / "geonames.mjs"


def build(payload):
    rows = []
    with ZipFile(BytesIO(payload)) as archive:
        info = archive.getinfo("cities500.txt")
        date = "%04d-%02d-%02d" % info.date_time[:3]
        with archive.open(info) as source:
            for line in source:
                fields = line.decode("utf-8").rstrip("\r\n").split("\t")
                if fields[8] != "CA" or fields[6] != "P" or fields[7] in {"PPLH", "PPLQ", "PPLW"}:
                    continue
                province = REGIONS[fields[10]]
                latitude, longitude = map(float, fields[4:6])
                if not (40 < latitude < 85 and -142 < longitude < -51 and fields[17]):
                    raise ValueError(f"Invalid coordinates or time zone for GeoNames record {fields[0]}")
                rows.append((int(fields[14] or 0), [fields[1], province, latitude, longitude, fields[17]]))
    if len(rows) < 1000 or {row[1] for _, row in rows} != set(REGIONS.values()):
        raise ValueError("Download does not cover Canada")
    rows.sort(key=lambda entry: (-entry[0], entry[1]))
    encoded = [json.dumps(row, ensure_ascii=False, separators=(",", ":")) for _, row in rows]
    OUTPUT.write_text(
        "// Canadian places adapted from GeoNames cities500, CC BY 4.0. See README.md.\n"
        f"export const sourceDate = {json.dumps(date)};\n"
        "export const places = [\n" + ",\n".join(encoded) + "\n];\n", encoding="utf-8"
    )
    print(f"Prepared {len(rows):,} Canadian places from {date}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=Path, help="Use a previously downloaded cities500.zip")
    args = parser.parse_args()
    if args.zip:
        build(args.zip.read_bytes())
    else:
        with urlopen(SOURCE, timeout=90) as response:
            build(response.read())
