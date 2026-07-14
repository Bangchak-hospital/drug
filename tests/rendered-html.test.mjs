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
  assert.equal(payload.meta.sourceCount, 12);
  assert.equal(payload.meta.rawRowCount, 904);
  assert.equal(payload.meta.recordCount, 708);
  assert.equal(payload.meta.groups.length, 12);
  assert.equal(payload.drugs.length, 708);
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
