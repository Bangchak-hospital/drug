import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("exports a complete static drug dashboard", async () => {
  const [html, payload] = await Promise.all([
    readFile(new URL("out/index.html", root), "utf8"),
    readFile(new URL("public/data/drugs.json", root), "utf8").then(JSON.parse),
  ]);

  assert.match(html, /คลังยา รพ\.บางจาก/);
  assert.match(html, /ค้นให้เจอ/);
  assert.match(html, /ก่อนเลือกใช้/);
  assert.match(html, /บัญชียาหลักแห่งชาติด้านสมุนไพร/);
  assert.equal(payload.meta.sourceCount, 12);
  assert.equal(payload.meta.rawRowCount, 904);
  assert.equal(payload.meta.recordCount, 708);
  assert.equal(payload.meta.groups.length, 12);
  assert.equal(payload.drugs.length, 708);
});

test("maps every hospital herbal medicine to Herb_2566 knowledge", async () => {
  const [payload, herbalSource] = await Promise.all([
    readFile(new URL("public/data/drugs.json", root), "utf8").then(JSON.parse),
    readFile(new URL("app/herbal-data.ts", root), "utf8"),
  ]);
  const herbalDrugs = payload.drugs.filter((drug) => drug.groups.includes("ยาสมุนไพร"));
  const mappedIds = [...herbalSource.matchAll(/profile\("(BCH-\d+)"/g)].map((match) => match[1]);

  assert.equal(herbalDrugs.length, 35);
  assert.equal(mappedIds.length, 35);
  assert.equal(new Set(mappedIds).size, 35);
  assert.deepEqual(new Set(mappedIds), new Set(herbalDrugs.map((drug) => drug.id)));
  assert.match(herbalSource, /BCH-0672[\s\S]*ยาขมิ้นชัน[\s\S]*500 มิลลิกรัม–1 กรัม/);
  assert.match(herbalSource, /BCH-0700[\s\S]*andrographolide รวม 60–120 มิลลิกรัมต่อวัน/);
  assert.match(herbalSource, /BCH-0677[\s\S]*รูปแบบการใช้ไม่ตรงกัน[\s\S]*review/);
});

test("keeps records searchable and traceable to source PDFs", async () => {
  const payload = JSON.parse(await readFile(new URL("public/data/drugs.json", root), "utf8"));
  const amoxicillin = payload.drugs.find((drug) => drug.name.toLowerCase().includes("amoxicillin"));
  assert.ok(amoxicillin);
  assert.ok(amoxicillin.dosageForm);
  assert.ok(amoxicillin.sourceFiles.length > 0);
  assert.ok(amoxicillin.sourcePages.length > 0);
  assert.ok(payload.drugs.some((drug) => drug.groups.includes("ยาที่มีเกณฑ์ DUE")));
  assert.ok(payload.drugs.some((drug) => drug.groups.includes("ยาสมุนไพร")));
});

test("adds the clinical profile schema to every drug without inventing missing data", async () => {
  const payload = JSON.parse(await readFile(new URL("public/data/drugs.json", root), "utf8"));
  for (const drug of payload.drugs) {
    assert.equal(typeof drug.genericName, "string");
    assert.equal(typeof drug.drugClass, "string");
    assert.ok(Array.isArray(drug.indications));
    assert.equal(typeof drug.renalAdjustment, "object");
    assert.ok(Array.isArray(drug.monitoring));
    assert.equal(typeof drug.hospitalStatus.essentialDrug, "boolean");
    assert.equal(typeof drug.hospitalStatus.dueRequired, "boolean");
    assert.ok(Array.isArray(drug.references));
    assert.ok(Object.hasOwn(drug, "lastReviewed"));
  }

  const metformin = payload.drugs.find((drug) => drug.name === "Metformin HCl");
  assert.equal(metformin.genericName, "Metformin");
  assert.equal(metformin.strength, "500 mg tablet");
  assert.equal(metformin.drugClass, "Biguanide");
  assert.equal(metformin.renalAdjustment.eGFR_below_30, "ห้ามใช้");
  assert.equal(metformin.hospitalStatus.essentialDrug, true);
  assert.equal(metformin.lastReviewed, "2026-07-14");
});

test("attaches official evidence with route-safe matching and review status", async () => {
  const payload = JSON.parse(await readFile(new URL("public/data/drugs.json", root), "utf8"));
  const statusCount = payload.meta.evidenceCoverage.statuses.reduce((sum, item) => sum + item.count, 0);
  assert.equal(statusCount, 708);
  assert.equal(payload.meta.evidenceCoverage.totalRecords, 708);
  assert.ok(payload.drugs.filter((drug) => drug.officialLabel).length >= 400);
  assert.ok(payload.drugs.filter((drug) => drug.thaiNdi).length >= 480);

  for (const drug of payload.drugs) {
    assert.equal(typeof drug.evidenceStatus, "string");
    if (drug.officialLabel) {
      assert.match(drug.officialLabel.sourceUrl, /^https:\/\/dailymed\.nlm\.nih\.gov\//);
      assert.ok(drug.officialLabel.indication || drug.officialLabel.dosage);
    }
    if (drug.thaiNdi) assert.match(drug.thaiNdi.sourceUrl, /^https:\/\/ndi\.fda\.moph\.go\.th\//);
  }

  const paracetamolInfusion = payload.drugs.find((drug) => drug.name === "Paracetamol" && drug.dosageForm === "infusion");
  assert.ok(paracetamolInfusion.officialLabel.routes.includes("INTRAVENOUS"));
  assert.equal(payload.meta.routeValidation.checkedRecords, 64);
  assert.equal(payload.meta.routeValidation.correctedRecords + payload.meta.routeValidation.removedRecords, 64);
});
