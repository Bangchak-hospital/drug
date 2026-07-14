import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../public/data/drugs.json", import.meta.url);
const CACHE_PATH = new URL("./openfda_route_cache.json", import.meta.url);
const API_URL = "https://api.fda.gov/drug/label.json";
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clean = (value = "") => String(value).replace(/\s+/g, " ").trim();
const clip = (value, maximum = 1800) => {
  const text = clean(value);
  return text.length <= maximum ? text : `${text.slice(0, maximum)}…`;
};

function localFamily(value) {
  const text = value.toLowerCase();
  if (/inj|infusion|vial|amp|sterile/.test(text)) return "injection";
  if (/eye|ophth/.test(text)) return "ophthalmic";
  if (/tab|cap|syr|susp|mixt|oral/.test(text)) return "oral";
  if (/cream|ointment|gel|paste|topical/.test(text)) return "topical";
  if (/inhal|mdi|dpi|spray|nebul/.test(text)) return "inhalation";
  return "";
}

function routeFamily(routes) {
  const text = routes.join(" ").toLowerCase();
  if (/intraven|intramus|subcut|injection|epidural|intrathecal/.test(text)) return "injection";
  if (/ophthalmic/.test(text)) return "ophthalmic";
  if (/oral/.test(text)) return "oral";
  if (/topical|cutaneous|vaginal|rectal/.test(text)) return "topical";
  if (/respiratory|inhalation|nasal/.test(text)) return "inhalation";
  return "";
}

const routeCandidates = {
  injection: ["INTRAVENOUS", "INTRAMUSCULAR", "SUBCUTANEOUS", "INJECTION", "EPIDURAL", "INTRATHECAL"],
  ophthalmic: ["OPHTHALMIC"],
  oral: ["ORAL"],
  topical: ["TOPICAL", "CUTANEOUS", "VAGINAL", "RECTAL"],
  inhalation: ["RESPIRATORY (INHALATION)", "INHALATION", "NASAL"],
};

function compactLabel(label) {
  return {
    setId: label.set_id || label.openfda?.spl_set_id?.[0] || "",
    effectiveTime: label.effective_time || "",
    genericNames: label.openfda?.generic_name || [],
    dosageForms: label.openfda?.dosage_form || [],
    routes: label.openfda?.route || [],
    productType: label.openfda?.product_type?.[0] || "",
    applicationNumber: label.openfda?.application_number?.[0] || "",
    drugClasses: label.openfda?.pharm_class_epc || label.openfda?.pharm_class_moa || label.openfda?.pharm_class_cs || [],
    indication: label.indications_and_usage?.[0] || label.purpose?.[0] || "",
    dosage: label.dosage_and_administration?.[0] || label.directions?.[0] || "",
    renal: label.renal_impairment?.[0] || "",
    warnings: label.warnings_and_cautions?.[0] || label.warnings?.[0] || label.precautions?.[0] || "",
    laboratoryTests: label.laboratory_tests?.[0] || "",
  };
}

async function fetchByRoute(genericName, route) {
  const url = new URL(API_URL);
  url.searchParams.set("search", `openfda.generic_name.exact:"${genericName.toUpperCase()}" AND openfda.route.exact:"${route}"`);
  url.searchParams.set("limit", "10");
  const response = await fetch(url, { headers: { "User-Agent": "Bangchak-Hospital-Formulary/1.0" } });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`openFDA ${response.status}`);
  const payload = await response.json();
  return (payload.results || []).map(compactLabel);
}

function sentences(value) {
  return clean(value).split(/(?<=[.;])\s+(?=[A-Z0-9])/).map(clean).filter((item) => item.length >= 24);
}

function extractRenal(label) {
  return clip(sentences([label.renal, label.dosage, label.warnings].filter(Boolean).join(" ")).filter((item) => /\b(?:renal|kidney|eGFR|creatinine)\b/i.test(item)).slice(0, 6).join(" "), 1600);
}

function extractMonitoring(label) {
  return [...new Set(sentences([label.laboratoryTests, label.warnings, label.dosage].filter(Boolean).join(" ")).filter((item) => /\b(?:monitor|measure|assess|periodic|laboratory|test|level|count)\w*\b/i.test(item)).map((item) => clip(item, 360)))].slice(0, 5);
}

let cache = {};
try { cache = JSON.parse(await readFile(CACHE_PATH, "utf8")); } catch { cache = {}; }
const payload = JSON.parse(await readFile(DATA_PATH, "utf8"));
const mismatched = payload.drugs.filter((drug) => {
  if (!drug.officialLabel || drug.lastReviewed) return false;
  const expected = localFamily(`${drug.dosageForm} ${drug.name}`);
  const actual = routeFamily(drug.officialLabel.routes || []);
  return expected && actual && expected !== actual;
});

let corrected = 0;
let removed = 0;
for (const drug of mismatched) {
  const family = localFamily(`${drug.dosageForm} ${drug.name}`);
  const genericName = drug.officialLabel.matchedGenericName;
  let labels = [];
  for (const route of routeCandidates[family] || []) {
    const cacheKey = `${genericName}|${route}`;
    if (!Object.hasOwn(cache, cacheKey)) {
      try { cache[cacheKey] = await fetchByRoute(genericName, route); } catch { cache[cacheKey] = []; }
      await sleep(275);
    }
    labels = cache[cacheKey].filter((label) => routeFamily(label.routes) === family && (label.indication || label.dosage));
    if (labels.length) break;
  }

  const label = labels.sort((a, b) => Number(b.effectiveTime || 0) - Number(a.effectiveTime || 0))[0];
  const oldUrl = drug.officialLabel.sourceUrl;
  if (!label) {
    drug.officialLabel = null;
    drug.references = (drug.references || []).filter((url) => url !== oldUrl);
    drug.evidenceStatus = drug.thaiNdi ? "thai-ndi-pending-review" : "unmatched";
    removed += 1;
    continue;
  }

  const sourceUrl = `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${label.setId}`;
  drug.references = [...new Set([...(drug.references || []).filter((url) => url !== oldUrl), sourceUrl])];
  drug.officialLabel = {
    provider: "openFDA / DailyMed",
    matchedGenericName: label.genericNames[0] || genericName,
    dosageForms: label.dosageForms,
    routes: label.routes,
    indication: clip(label.indication),
    dosage: clip(label.dosage, 2400),
    renal: extractRenal(label),
    monitoring: extractMonitoring(label),
    setId: label.setId,
    effectiveDate: label.effectiveTime,
    sourceUrl,
    importedAt: new Date().toISOString().slice(0, 10),
  };
  corrected += 1;
}

await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
payload.meta.routeValidation = { checkedRecords: mismatched.length, correctedRecords: corrected, removedRecords: removed, validatedAt: new Date().toISOString().slice(0, 10) };
await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload.meta.routeValidation, null, 2));
