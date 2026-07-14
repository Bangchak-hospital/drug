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
  assert.match(html, /ระบบค้นหาและ Dashboard/);
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
