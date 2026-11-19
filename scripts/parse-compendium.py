"""Parse the 2024 Adult Compendium of Physical Activities (pdftotext -raw output) into JSON.
Usage: pdftotext -raw data/raw/compendium_2024.pdf data/raw/c_raw.txt
       python -I scripts/parse-compendium.py data/raw/c_raw.txt data/activities/compendium-2024.json
Source: Herrmann SD, et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci 2024;13(1):6-12.
https://pacompendium.com
"""
import json, re, sys

HEADINGS = ["Bicycling", "Conditioning Exercise", "Dancing", "Fishing & Hunting", "Home Activities", "Home Repair",
            "Inactivity", "Lawn & Garden", "Miscellaneous", "Music Playing", "Occupation", "Running", "Self Care",
            "Sexual Activity", "Sports", "Transportation", "Walking", "Water Activities", "Winter Activities",
            "Religious Activities", "Volunteer Activities", "Video Games"]
src, out = sys.argv[1], sys.argv[2]
text = " ".join(l.strip().replace("�", "-") for l in open(src, encoding="utf-8", errors="replace"))
text = re.sub(r"Major Heading Activity Code MET Value Activity Description", " ", text)
text = re.sub(r"2024 Adult Compendium of Physical Activities", " ", text)
anchor = re.compile(r"(?:^|\s)(" + "|".join(re.escape(h) for h in HEADINGS) + r")\s+(\d{5})\s+(\d+(?:\.\d+)?)\s+")
matches = list(anchor.finditer(text))
rows = {}
for i, m in enumerate(matches):
    end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
    desc = re.sub(r"\s+", " ", text[m.end():end]).strip()
    desc = re.sub(r"\s+\d+$", "", desc)  # trailing page numbers
    rows[m.group(2)] = {"code": m.group(2), "heading": m.group(1), "met": float(m.group(3)), "description": desc}
rows = sorted(rows.values(), key=lambda r: r["code"])
json.dump(rows, open(out, "w", encoding="utf-8"), indent=0, ensure_ascii=False)
print(len(rows), "activities")
