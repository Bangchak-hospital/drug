import { readFile, writeFile } from "node:fs/promises";

const normalize = (value) => value.toLocaleLowerCase("en").replace(/[^a-z0-9ก-๙]+/g, "");
const dataPath = new URL("../public/data/drugs.json", import.meta.url);
const profilesPath = new URL("./clinical_profiles.json", import.meta.url);

const [payload, profiles] = await Promise.all([
  readFile(dataPath, "utf8").then(JSON.parse),
  readFile(profilesPath, "utf8").then(JSON.parse),
]);

payload.drugs = payload.drugs.map((drug) => {
  const dueRequired = drug.status === "มีเกณฑ์ DUE" || drug.groups.includes("ยาที่มีเกณฑ์ DUE");
  const base = {
    ...drug,
    genericName: drug.genericName || drug.name,
    drugClass: drug.drugClass || "",
    indications: drug.indications || [],
    renalAdjustment: drug.renalAdjustment || {
      eGFR_45_or_more: "",
      eGFR_30_to_44: "",
      eGFR_below_30: "",
    },
    monitoring: drug.monitoring || [],
    hospitalStatus: drug.hospitalStatus || {
      essentialDrug: drug.essential,
      dueRequired,
    },
    references: drug.references || [],
    lastReviewed: drug.lastReviewed || null,
  };
  const enriched = { ...base, ...(profiles[normalize(drug.name)] || {}) };
  enriched.essential = Boolean(enriched.hospitalStatus.essentialDrug);
  return enriched;
});

await writeFile(dataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Enriched ${payload.drugs.length} drug records.`);
