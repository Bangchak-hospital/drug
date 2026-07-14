import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../public/data/drugs.json", import.meta.url);
const HERBAL_SOURCE = "https://herbal.fda.moph.go.th/drug-list/category/ann-drug02";
const payload = JSON.parse(await readFile(DATA_PATH, "utf8"));

for (const drug of payload.drugs) {
  if (drug.evidenceStatus !== "unmatched") continue;
  if (drug.groups.includes("ยาสมุนไพร")) {
    drug.evidenceStatus = "thai-herbal-source-pending-review";
    if (!drug.drugClass) drug.drugClass = "ยาจากสมุนไพร";
    drug.references = [...new Set([...(drug.references || []), HERBAL_SOURCE])];
  } else {
    drug.evidenceStatus = "hospital-formulary-only";
  }
}

const statuses = Object.entries(Object.groupBy(payload.drugs, (drug) => drug.evidenceStatus))
  .map(([status, drugs]) => ({ status, count: drugs.length }));
payload.meta.evidenceCoverage = {
  updatedAt: new Date().toISOString().slice(0, 10),
  totalRecords: payload.drugs.length,
  statuses,
  disclaimer: "ข้อมูลจากแหล่งภายนอกต้องผ่านการทบทวนโดยเภสัชกรก่อนใช้ตัดสินใจทางคลินิก",
};

await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload.meta.evidenceCoverage, null, 2));
