import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../public/data/drugs.json", import.meta.url);

const corrections = [
  [/azithromycin(?=\d)/gi, "azithromycin "],
  [/clarithromycin(?=\d)/gi, "clarithromycin "],
  [/cefdinir(?=\d)/gi, "cefdinir "],
  [/cefixime(?=\d)/gi, "cefixime "],
  [/colistin(?=\d)/gi, "colistin "],
  [/ertapenem(?=\d)/gi, "ertapenem "],
  [/fosfomycin(?=\d)/gi, "fosfomycin "],
  [/ketorolac(?=\d)/gi, "ketorolac "],
  [/levofloxacin(?=\d)/gi, "levofloxacin "],
  [/meropenem(?=\d)/gi, "meropenem "],
  [/piperacillin\s*\+\s*tazobactam(?=\d)/gi, "piperacillin + tazobactam "],
  [/vancomycin(?=\d)/gi, "vancomycin "],
  [/meropenam/gi, "meropenem"],
  [/mefenemic/gi, "mefenamic"],
  [/misoprostrol/gi, "misoprostol"],
  [/polymycin/gi, "polymyxin"],
  [/salbactam/gi, "sulbactam"],
  [/miconized/gi, "micronized"],
  [/hydrogenperoxide/gi, "hydrogen peroxide"],
  [/hydroxychloroquin/gi, "hydroxychloroquine"],
  [/bicarbinate/gi, "bicarbonate"],
  [/hypochloride/gi, "hypochlorite"],
  [/vitamine/gi, "vitamin"],
  [/propanolol/gi, "propranolol"],
  [/pregesterone/gi, "progesterone"],
  [/tenofoviralafenamide/gi, "tenofovir alafenamide"],
  [/tenofovirdisoproxilfumarate/gi, "tenofovir disoproxil fumarate"],
  [/tiotropiumbr/gi, "tiotropium br"],
];

function canonical(value) {
  let text = value.normalize("NFKC").toLowerCase().replace(/®/g, " ");
  for (const [pattern, replacement] of corrections) text = text.replace(pattern, replacement);
  return text
    .replace(/\([^)]*\)/g, " ")
    .replace(/[ก-๙].*$/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|unit|%|dose)\b.*$/i, " ")
    .replace(/\b(?:tab(?:let)?|cap(?:sule)?|inj(?:ection)?|susp(?:ension)?|syrup|eye\s*drops?|ointment|cream|gel|spray|amp(?:oule)?)\b.*$/i, " ")
    .replace(/\s*\+\s*/g, "+")
    .replace(/[^a-z0-9+ก-๙]+/g, "")
    .trim();
}

function formFamily(value) {
  const text = value.toLowerCase();
  if (/tab/.test(text)) return "tablet";
  if (/cap/.test(text)) return "capsule";
  if (/inj|vial|amp|sterile/.test(text)) return "injection";
  if (/eye|ophth/.test(text)) return "ophthalmic";
  if (/susp|syr|mixt/.test(text)) return "liquid";
  if (/cream|ointment|gel|paste/.test(text)) return "topical";
  if (/inhal|mdi|dpi|spray/.test(text)) return "inhalation";
  return "";
}

const payload = JSON.parse(await readFile(DATA_PATH, "utf8"));
const officialSources = payload.drugs.filter((drug) => drug.officialLabel);
const ndiSources = payload.drugs.filter((drug) => drug.thaiNdi);
let officialInherited = 0;
let ndiInherited = 0;

for (const drug of payload.drugs) {
  if (drug.lastReviewed) continue;
  const nameKey = canonical(drug.name);
  const family = formFamily(`${drug.dosageForm} ${drug.name}`);

  if (!drug.officialLabel && nameKey) {
    const matches = officialSources.filter((source) => canonical(source.name) === nameKey);
    const source = matches.find((candidate) => !family || formFamily(`${candidate.dosageForm} ${candidate.name}`) === family) || matches[0];
    if (source) {
      drug.officialLabel = { ...source.officialLabel, inheritedFrom: source.id };
      drug.genericName = source.genericName;
      if (!drug.drugClass) drug.drugClass = source.drugClass;
      drug.references = [...new Set([...(drug.references || []), ...(source.references || [])])];
      drug.evidenceStatus = "official-label-pending-review";
      officialInherited += 1;
    }
  }

  if (!drug.thaiNdi && nameKey) {
    const source = ndiSources.find((candidate) => canonical(candidate.name) === nameKey);
    if (source) {
      drug.thaiNdi = { ...source.thaiNdi, inheritedFrom: source.id };
      if (!drug.drugClass) drug.drugClass = source.drugClass;
      drug.references = [...new Set([...(drug.references || []), source.thaiNdi.sourceUrl])];
      if (drug.evidenceStatus === "unmatched") drug.evidenceStatus = "thai-ndi-pending-review";
      ndiInherited += 1;
    }
  }
}

payload.meta.inheritedEvidence = {
  importedAt: new Date().toISOString().slice(0, 10),
  officialLabelRecords: officialInherited,
  thaiNdiRecords: ndiInherited,
};

await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload.meta.inheritedEvidence, null, 2));
