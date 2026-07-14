import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../public/data/drugs.json", import.meta.url);
const CACHE_PATH = new URL("./thai_ndi_cache.json", import.meta.url);
const SOURCE_URL = "https://ndi.fda.moph.go.th/index.php/drug_national/search";

const clean = (value = "") => String(value).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const aliases = [
  [/acetaminophen/gi, "paracetamol"],
  [/aluminum/gi, "aluminium"],
  [/albuterol/gi, "salbutamol"],
  [/epinephrine/gi, "adrenaline"],
  [/simethicone/gi, "simeticone"],
  [/glyburide/gi, "glibenclamide"],
  [/nitroglycerin/gi, "glyceryl trinitrate"],
  [/lidocaine/gi, "lignocaine"],
  [/scopolamine/gi, "hyoscine"],
  [/captropril/gi, "captopril"],
  [/doxazocin/gi, "doxazosin"],
  [/amitryptyline/gi, "amitriptyline"],
  [/fluoxitine/gi, "fluoxetine"],
  [/hydrochoride/gi, "hydrochloride"],
  [/brinzolomidel/gi, "brinzolamide"],
  [/cholrpheniramine/gi, "chlorpheniramine"],
];

const saltWords = new Set([
  "hydrochloride", "hcl", "besilate", "besylate", "maleate", "fumarate", "succinate",
  "tartrate", "citrate", "mesylate", "mesilate", "sulfate", "sulphate", "phosphate",
  "acetate", "lactate", "propionate", "valerate", "calcium", "monohydrate", "dihydrate",
]);

function tokens(value, relaxed = false) {
  let text = value.normalize("NFKC").toLowerCase().replace(/®/g, " ");
  for (const [pattern, replacement] of aliases) text = text.replace(pattern, replacement);
  text = text
    .replace(/\([^)]*\)/g, " ")
    .replace(/[ก-๙].*$/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|unit|%|dose)\b.*$/i, " ")
    .replace(/\b(?:tab(?:let)?|cap(?:sule)?|inj(?:ection)?|susp(?:ension)?|syrup|eye\s*drops?|ointment|cream|gel|spray|amp(?:oule)?)\b.*$/i, " ")
    .replace(/\band\b|\+/g, " ")
    .replace(/[^a-z0-9ก-๙]+/g, " ");
  const parts = text.split(/\s+/).filter((part) => part.length > 1 && (!relaxed || !saltWords.has(part)));
  return [...new Set(parts)].sort();
}

const key = (value, relaxed = false) => tokens(value, relaxed).join(" ");

function scoreMatch(localName, ndiName) {
  const strictLocal = key(localName);
  const strictNdi = key(ndiName);
  if (strictLocal && strictLocal === strictNdi) return 1;
  const relaxedLocal = key(localName, true);
  const relaxedNdi = key(ndiName, true);
  if (relaxedLocal && relaxedLocal === relaxedNdi && !["chloride", "water", "alcohol"].includes(relaxedLocal)) return 0.96;
  const left = new Set(tokens(localName, true));
  const right = new Set(tokens(ndiName, true));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((item) => right.has(item)).length;
  return intersection / new Set([...left, ...right]).size;
}

function parseEntries(html) {
  const entries = [];
  const pattern = /<div class="t-drug01"><a href="([^"]+)">([^<]+)<span>\s*([^<]*)<\/span><\/a><\/div>[\s\S]*?<strong>รูปแบบยา\s*:\s*<\/strong><span>([\s\S]*?)<\/span>[\s\S]*?<strong>กลุ่มยา\s*:\s*<\/strong><span>([\s\S]*?)<\/span>[\s\S]*?<strong>บัญชี\s*:\s*<\/strong><span>([\s\S]*?)<\/span>/g;
  for (const match of html.matchAll(pattern)) {
    entries.push({
      sourceUrl: match[1],
      genericName: clean(`${match[2]} ${match[3]}`),
      dosageForms: clean(match[4]),
      drugClass: clean(match[5]),
      account: clean(match[6]),
    });
  }
  return entries;
}

let entries;
try {
  entries = JSON.parse(await readFile(CACHE_PATH, "utf8")).entries;
} catch {
  const response = await fetch(SOURCE_URL, { headers: { "User-Agent": "Bangchak-Hospital-Formulary/1.0" } });
  if (!response.ok) throw new Error(`Thai NDI ${response.status}`);
  entries = parseEntries(await response.text());
  await writeFile(CACHE_PATH, `${JSON.stringify({ fetchedAt: new Date().toISOString(), sourceUrl: SOURCE_URL, entries }, null, 2)}\n`, "utf8");
}

const payload = JSON.parse(await readFile(DATA_PATH, "utf8"));
let matched = 0;
for (const drug of payload.drugs) {
  let best = null;
  let bestScore = 0;
  for (const entry of entries) {
    const score = scoreMatch(drug.name, entry.genericName);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  if (!best || bestScore < 0.9) {
    drug.thaiNdi = null;
    continue;
  }
  drug.thaiNdi = { ...best, matchScore: Number(bestScore.toFixed(2)) };
  if (!drug.drugClass) drug.drugClass = best.drugClass;
  drug.references = [...new Set([...(drug.references || []), best.sourceUrl])];
  if (drug.evidenceStatus === "unmatched") drug.evidenceStatus = "thai-ndi-pending-review";
  matched += 1;
}

payload.meta.thaiNdiEvidence = {
  provider: "สำนักงานคณะกรรมการอาหารและยา กระทรวงสาธารณสุข",
  sourceUrl: SOURCE_URL,
  importedAt: new Date().toISOString().slice(0, 10),
  sourceEntries: entries.length,
  matchedRecords: matched,
};

await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload.meta.thaiNdiEvidence, null, 2));
