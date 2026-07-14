"""Extract searchable drug records from the Bangchak Hospital formulary PDFs."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

import pdfplumber

APP_DIR = Path(__file__).resolve().parents[1]
PDF_DIR = APP_DIR.parent
OUTPUT = APP_DIR / "public" / "data" / "drugs.json"
CLINICAL_PROFILES = APP_DIR / "scripts" / "clinical_profiles.json"

SOURCE_GROUPS = {
    "1 ": "กรอบยาโรงพยาบาล",
    "2 ": "ยานอกบัญชียาหลัก (NED)",
    "3 ": "ยาต้านไวรัส (ARV)",
    "4 ": "ยาวัณโรค (TB)",
    "5 ": "ยาจิตเวชผู้ใหญ่",
    "6 ": "ยาคลินิกตา",
    "7 ": "ยาแก้พิษ (Antidote)",
    "8 ": "ยาเสพติดและวัตถุออกฤทธิ์",
    "9.": "ยาที่จำกัดการสั่งใช้",
    "10 ": "ยาที่มีเกณฑ์ DUE",
    "11 ": "ยาสมุนไพร",
    "12 ": "กรอบยา รพ.สต.",
}


def clean(value: object) -> str:
    text = "" if value is None else str(value)
    return re.sub(r"\s+", " ", text.replace("\u200b", " ")).strip()


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9ก-๙]+", "", value.casefold())


def source_group(filename: str) -> str:
    for prefix, group in SOURCE_GROUPS.items():
        if filename.startswith(prefix):
            return group
    return "เอกสารอื่น"


def header_index(headers: list[str], *needles: str) -> int | None:
    for index, header in enumerate(headers):
        compact = clean(header).casefold()
        if any(needle.casefold() in compact for needle in needles):
            return index
    return None


def value_at(row: list[object], index: int | None) -> str:
    if index is None or index >= len(row):
        return ""
    return clean(row[index])


def extract_pdf(path: Path) -> list[dict[str, object]]:
    group = source_group(path.name)
    records: list[dict[str, object]] = []
    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables():
                if not table or len(table) < 2:
                    continue
                headers = [clean(cell) for cell in table[0]]
                name_i = header_index(headers, "ชื่อยา", "รายการ")
                if name_i is None:
                    continue
                number_i = header_index(headers, "ที่", "ลําดับ", "ลำดับ")
                account_i = header_index(headers, "บัญชี")
                form_i = header_index(headers, "dosage form", "รูปแบบยา")
                strength_i = header_index(headers, "strength", "ความแรง")
                brand_i = header_index(headers, "ยี่ห้อ")
                company_i = header_index(headers, "บริษัท")
                note_i = header_index(headers, "หมายเหตุ")
                measure_i = header_index(headers, "มาตรการ")
                symptom_i = header_index(headers, "กลุ่มอาการ")
                code_i = header_index(headers, "รหัสยา 24")
                purchase_i = header_index(headers, "จัดซื้อ")
                specialty_i = header_index(headers, "แพทย์ เฉพาะทาง", "แพทย์เฉพาะทาง")
                general_i = header_index(headers, "แพทย์ทั่วไป")
                hosp_i = header_index(headers, "hosxp")
                attach_i = header_index(headers, "แนบใบ due")

                for row in table[1:]:
                    row = list(row or [])
                    number = value_at(row, number_i)
                    name = value_at(row, name_i)
                    if not name or name in {"ชื่อยา", "รายการ"}:
                        continue
                    if number_i is not None and not re.search(r"\d", number):
                        continue
                    form = value_at(row, form_i)
                    strength = value_at(row, strength_i)
                    account = value_at(row, account_i)
                    status = "พร้อมใช้"
                    if group in {"ยาเสพติดและวัตถุออกฤทธิ์", "ยาที่จำกัดการสั่งใช้"}:
                        status = "จำกัดการใช้"
                    elif group == "ยาที่มีเกณฑ์ DUE":
                        status = "มีเกณฑ์ DUE"
                    elif group not in {"กรอบยาโรงพยาบาล", "กรอบยา รพ.สต."}:
                        status = "รายการเฉพาะ"

                    due_parts = []
                    if value_at(row, specialty_i):
                        due_parts.append(f"แพทย์เฉพาะทาง: {value_at(row, specialty_i)}")
                    if value_at(row, general_i):
                        due_parts.append(f"แพทย์ทั่วไป: {value_at(row, general_i)}")
                    if value_at(row, hosp_i):
                        due_parts.append(f"เกณฑ์ใน HOSxP: {value_at(row, hosp_i)}")
                    if value_at(row, attach_i):
                        due_parts.append(f"แนบใบ DUE: {value_at(row, attach_i)}")

                    records.append({
                        "name": name,
                        "dosageForm": form,
                        "strength": strength,
                        "account": account,
                        "status": status,
                        "groups": [group],
                        "brand": value_at(row, brand_i),
                        "company": value_at(row, company_i),
                        "note": value_at(row, note_i),
                        "measure": value_at(row, measure_i),
                        "symptomGroup": value_at(row, symptom_i),
                        "drugCode24": value_at(row, code_i),
                        "purchase": value_at(row, purchase_i),
                        "dueCriteria": " · ".join(due_parts),
                        "sourceFiles": [path.name],
                        "sourcePages": [page_number],
                    })
    return records


def merge_records(records: list[dict[str, object]]) -> list[dict[str, object]]:
    clinical_profiles = {}
    if CLINICAL_PROFILES.exists():
        clinical_profiles = json.loads(CLINICAL_PROFILES.read_text(encoding="utf-8"))

    merged: dict[str, dict[str, object]] = {}
    for record in records:
        key = "|".join(normalize(str(record[field])) for field in ("name", "dosageForm", "strength"))
        if key not in merged:
            merged[key] = record
            continue
        target = merged[key]
        for list_field in ("groups", "sourceFiles", "sourcePages"):
            for value in record[list_field]:
                if value not in target[list_field]:
                    target[list_field].append(value)
        for field in ("account", "brand", "company", "note", "measure", "symptomGroup", "drugCode24", "purchase", "dueCriteria"):
            if not target[field] and record[field]:
                target[field] = record[field]
        if record["status"] in {"จำกัดการใช้", "มีเกณฑ์ DUE"}:
            target["status"] = record["status"]

    result = list(merged.values())
    result.sort(key=lambda item: (normalize(str(item["name"])), normalize(str(item["strength"]))))
    for index, record in enumerate(result, start=1):
        record["id"] = f"BCH-{index:04d}"
        account = str(record["account"]).upper()
        record["essential"] = bool(account) and "NED" not in account
        record.update({
            "genericName": record["name"],
            "drugClass": "",
            "indications": [],
            "renalAdjustment": {
                "eGFR_45_or_more": "",
                "eGFR_30_to_44": "",
                "eGFR_below_30": "",
            },
            "monitoring": [],
            "hospitalStatus": {
                "essentialDrug": record["essential"],
                "dueRequired": record["status"] == "มีเกณฑ์ DUE" or "ยาที่มีเกณฑ์ DUE" in record["groups"],
            },
            "references": [],
            "lastReviewed": None,
        })

        curated = clinical_profiles.get(normalize(str(record["name"])))
        if curated:
            record.update(curated)
            record["essential"] = bool(record["hospitalStatus"]["essentialDrug"])
    return result


def main() -> None:
    pdfs = sorted(PDF_DIR.glob("*.pdf"), key=lambda path: path.name)
    if not pdfs:
        raise SystemExit(f"No PDFs found in {PDF_DIR}")
    raw = [record for pdf in pdfs for record in extract_pdf(pdf)]
    records = merge_records(raw)
    groups = Counter(group for record in records for group in record["groups"])
    payload = {
        "meta": {
            "title": "กรอบบัญชียา โรงพยาบาลบางจาก ปี 2569",
            "generatedAt": "14 กรกฎาคม 2569",
            "sourceCount": len(pdfs),
            "rawRowCount": len(raw),
            "recordCount": len(records),
            "groups": [{"name": name, "count": count} for name, count in groups.most_common()],
        },
        "drugs": records,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload["meta"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Extraction failed: {exc}", file=sys.stderr)
        raise
