"""Parse the 2024 Adult Compendium of Physical Activities (raw pdftotext output)
into JSON. Usage: python -I scripts/parse-compendium.py data/raw/c_raw.txt data/activities/compendium-2024.json
Source: Herrmann SD et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci. https://pacompendium.com
"""
import json, re, sys

ROW = re.compile(r"^(?P<heading>[A-Za-z&,/ \-]+?) (?P<code>\d{5}) (?P<met>\d+(?:\.\d+)?) (?P<desc>.+)$")
src, out = sys.argv[1], sys.argv[2]
rows = []
for raw in open(src, encoding="utf-8", errors="replace"):
    line = raw.strip().replace("�", "-")
    if not line or line.startswith("Major Heading") or line.startswith("2024 Adult Compendium"):
        continue
    m = ROW.match(line)
    if m:
        rows.append({"code": m["code"], "heading": m["heading"].strip(), "met": float(m["met"]), "description": m["desc"].strip()})
    elif rows and not re.match(r"^\d+$", line):
        rows[-1]["description"] += " " + line  # wrapped description
seen = {}
for r in rows:
    seen[r["code"]] = r
rows = sorted(seen.values(), key=lambda r: r["code"])
json.dump(rows, open(out, "w", encoding="utf-8"), indent=0, ensure_ascii=False)
print(len(rows), "activities;", len({r["heading"] for r in rows}), "headings")
