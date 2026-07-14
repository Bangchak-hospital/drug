import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../public/data/drugs.json", import.meta.url);
const CACHE_PATH = new URL("./openfda_label_cache.json", import.meta.url);
const API_URL = "https://api.fda.gov/drug/label.json";
const REQUEST_DELAY_MS = 275;
const CACHE_VERSION = 2;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clean = (value = "") => String(value).replace(/\s+/g, " ").trim();
const clip = (value, maximum = 1800) => {
  const text = clean(value);
  if (text.length <= maximum) return text;
  const shortened = text.slice(0, maximum);
  const boundary = Math.max(shortened.lastIndexOf(". "), shortened.lastIndexOf("; "));
  return `${shortened.slice(0, boundary > maximum * 0.55 ? boundary + 1 : maximum)}…`;
};

const replacements = [
  [/\bparacetamol\b/gi, "acetaminophen"],
  [/\bsalbutamol\b/gi, "albuterol"],
  [/\badrenaline\b/gi, "epinephrine"],
  [/\baluminium\b/gi, "aluminum"],
  [/\bsimeticone\b/gi, "simethicone"],
  [/\bglibenclamide\b/gi, "glyburide"],
  [/\bglyceryl\s+trinitrate\b/gi, "nitroglycerin"],
  [/\blignocaine\b/gi, "lidocaine"],
  [/\bhyoscine\b/gi, "scopolamine"],
  [/\bcaptropril\b/gi, "captopril"],
  [/\bdoxazocin\b/gi, "doxazosin"],
  [/\bamitryptyline\b/gi, "amitriptyline"],
  [/\bfluoxitine\b/gi, "fluoxetine"],
  [/\bhydrochoride\b/gi, "hydrochloride"],
  [/\bbrinzolomidel\b/gi, "brinzolamide"],
  [/\bcholrpheniramine\b/gi, "chlorpheniramine"],
  [/\bclorazepate\b/gi, "clorazepate"],
  [/\bdi\s*hcl\b/gi, "dihydrochloride"],
  [/\bhcl\b/gi, "hydrochloride"],
  [/\bbesilate\b/gi, "besylate"],
  [/\bsulphate\b/gi, "sulfate"],
  [/\bk\s+clavulanate\b/gi, "clavulanate potassium"],
  [/\bmg\s+hydroxide\b/gi, "magnesium hydroxide"],
];

function queryName(name) {
  let value = name.normalize("NFKC").replace(/[®*]/g, " ");
  for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
  value = value
    .replace(/\([^)]*\)/g, " ")
    .replace(/[ก-๙].*$/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|unit|%|dose)\b.*$/i, " ")
    .replace(/\b(?:tab(?:let)?|cap(?:sule)?|inj(?:ection)?|susp(?:ension)?|syrup|eye\s*drops?|ointment|cream|gel|spray|amp(?:oule)?)\b.*$/i, " ")
    .replace(/\s*\+\s*/g, " AND ")
    .replace(/\s+/g, " ")
    .trim();
  return value;
}

function compactLabel(label) {
  return {
    setId: label.set_id || label.openfda?.spl_set_id?.[0] || "",
    effectiveTime: label.effective_time || "",
    genericNames: label.openfda?.generic_name || [],
    substanceNames: label.openfda?.substance_name || [],
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

async function fetchLabels(query) {
  const search = `openfda.generic_name.exact:"${query.replaceAll('"', "").toUpperCase()}"`;
  const url = new URL(API_URL);
  url.searchParams.set("search", search);
  url.searchParams.set("limit", "10");
  const response = await fetch(url, { headers: { "User-Agent": "Bangchak-Hospital-Formulary/1.0" } });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`openFDA ${response.status} for ${query}`);
  const payload = await response.json();
  return (payload.results || []).map(compactLabel);
}

function formTokens(value) {
  const text = value.toLowerCase();
  if (/tab|tablet/.test(text)) return ["tablet"];
  if (/cap|capsule/.test(text)) return ["capsule"];
  if (/inj|sterile|amp|vial/.test(text)) return ["injection", "solution"];
  if (/susp/.test(text)) return ["suspension"];
  if (/syr|mixt/.test(text)) return ["syrup", "solution"];
  if (/eye|ophth|drop/.test(text)) return ["ophthalmic", "drop", "solution"];
  if (/cream/.test(text)) return ["cream"];
  if (/ointment/.test(text)) return ["ointment"];
  if (/gel/.test(text)) return ["gel"];
  if (/spray|mdi|dpi|inhal/.test(text)) return ["spray", "aerosol", "inhalation", "powder"];
  return [];
}

function chooseLabel(drug, labels) {
  const expectedForms = formTokens(`${drug.dosageForm} ${drug.name}`);
  return [...labels].sort((left, right) => {
    const score = (label) => {
      const formText = `${label.dosageForms.join(" ")} ${label.routes.join(" ")}`.toLowerCase();
      const formScore = expectedForms.some((token) => formText.includes(token)) ? 6 : 0;
      const contentScore = (label.indication ? 3 : 0) + (label.dosage ? 3 : 0) + (label.applicationNumber ? 2 : 0);
      const approvalPenalty = /unapproved|homeopathic/i.test(label.productType) ? -8 : 0;
      return formScore + contentScore + approvalPenalty + Number(label.effectiveTime || 0) / 1e9;
    };
    return score(right) - score(left);
  })[0];
}

function sentences(value) {
  return clean(value)
    .replace(/\(\s*\d+(?:\.\d+)*\s*\)/g, "")
    .split(/(?<=[.;])\s+(?=[A-Z0-9])/)
    .map((item) => clean(item))
    .filter((item) => item.length >= 24);
}

function extractRenal(label) {
  const candidates = sentences([label.renal, label.dosage, label.warnings].filter(Boolean).join(" "))
    .filter((item) => /\b(?:renal|kidney|eGFR|creatinine)\b/i.test(item));
  const unique = [...new Set(candidates)].slice(0, 6);
  return clip(unique.join(" "), 1600);
}

function extractMonitoring(label) {
  const candidates = sentences([label.laboratoryTests, label.warnings, label.dosage].filter(Boolean).join(" "))
    .filter((item) => /\b(?:monitor|measure|assess|periodic|laboratory|test|level|count)\w*\b/i.test(item))
    .map((item) => clip(item, 360));
  return [...new Set(candidates)].slice(0, 5);
}

let cache = {};
try {
  cache = JSON.parse(await readFile(CACHE_PATH, "utf8"));
} catch {
  cache = {};
}
if (cache._meta?.version !== CACHE_VERSION) cache = { _meta: { version: CACHE_VERSION } };

const payload = JSON.parse(await readFile(DATA_PATH, "utf8"));
const queries = [...new Set(payload.drugs.map((drug) => queryName(drug.name)).filter(Boolean))];
let completed = 0;
let fetched = 0;

for (const query of queries) {
  if (!Object.hasOwn(cache, query)) {
    try {
      cache[query] = { fetchedAt: new Date().toISOString(), labels: await fetchLabels(query) };
    } catch (error) {
      cache[query] = { fetchedAt: new Date().toISOString(), labels: [], error: String(error) };
    }
    fetched += 1;
    await sleep(REQUEST_DELAY_MS);
  }
  completed += 1;
  if (completed % 25 === 0) {
    await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
    console.log(`Official labels: ${completed}/${queries.length} names checked`);
  }
}
await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");

let matched = 0;
for (const drug of payload.drugs) {
  if (drug.lastReviewed) {
    drug.evidenceStatus = "reviewed";
    continue;
  }
  const query = queryName(drug.name);
  const label = chooseLabel(drug, cache[query]?.labels || []);
  if (!label || (!label.indication && !label.dosage)) {
    drug.evidenceStatus = "unmatched";
    drug.officialLabel = null;
    continue;
  }

  const reference = label.setId
    ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${label.setId}`
    : "https://open.fda.gov/apis/drug/label/";
  const genericName = label.genericNames[0] || drug.genericName || drug.name;
  const drugClass = label.drugClasses[0]?.replace(/\s*\[[^\]]+]\s*$/, "") || drug.drugClass;
  drug.genericName = genericName.replace(/\b([A-Z])([A-Z]+)\b/g, (_, first, rest) => `${first}${rest.toLowerCase()}`);
  drug.drugClass = drugClass;
  drug.references = [...new Set([...(drug.references || []), reference])];
  drug.evidenceStatus = "official-label-pending-review";
  drug.officialLabel = {
    provider: "openFDA / DailyMed",
    matchedGenericName: genericName,
    dosageForms: label.dosageForms,
    routes: label.routes,
    indication: clip(label.indication),
    dosage: clip(label.dosage, 2400),
    renal: extractRenal(label),
    monitoring: extractMonitoring(label),
    setId: label.setId,
    effectiveDate: label.effectiveTime,
    sourceUrl: reference,
    importedAt: new Date().toISOString().slice(0, 10),
  };
  matched += 1;
}

payload.meta.clinicalEvidence = {
  provider: "openFDA / DailyMed",
  importedAt: new Date().toISOString().slice(0, 10),
  matchedRecords: matched,
  unmatchedRecords: payload.drugs.length - matched - payload.drugs.filter((drug) => drug.lastReviewed).length,
  reviewedRecords: payload.drugs.filter((drug) => drug.lastReviewed).length,
};

await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ names: queries.length, fetched, ...payload.meta.clinicalEvidence }, null, 2));
