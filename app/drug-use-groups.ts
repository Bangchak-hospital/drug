export type GroupableDrug = {
  id: string;
  name: string;
  genericName: string;
  drugClass: string;
  groups: string[];
  thaiNdi: { drugClass: string } | null;
};

export type DrugUseGroup = {
  id: string;
  name: string;
  mark: string;
  color: string;
  description: string;
  match: (drug: GroupableDrug) => boolean;
};

const classText = (drug: GroupableDrug) =>
  [drug.thaiNdi?.drugClass, drug.drugClass].filter(Boolean).join(" | ");
const nameText = (drug: GroupableDrug) =>
  [drug.name, drug.genericName].filter(Boolean).join(" ");
const classMatches = (drug: GroupableDrug, pattern: RegExp) => pattern.test(classText(drug));
const nameMatches = (drug: GroupableDrug, pattern: RegExp) => pattern.test(nameText(drug));

export const drugUseGroups: DrugUseGroup[] = [
  {
    id: "contraceptives",
    name: "ยาคุมกำเนิด",
    mark: "คุม",
    color: "#a45172",
    description: "ยาเม็ด ยาฉีด ยาฝัง และยาคุมกำเนิดฉุกเฉิน",
    match: (drug) =>
      classMatches(drug, /7\.3 Contraceptives/i)
      || nameMatches(drug, /depot medroxy|ethinyl|etonogestrel|levonorgestrel|lynestrenol/i),
  },
  {
    id: "diabetes",
    name: "ยาเบาหวาน",
    mark: "DM",
    color: "#92702e",
    description: "อินซูลินและยาลดระดับน้ำตาลในเลือด",
    match: (drug) =>
      classMatches(drug, /^6\.1|antidiabetic|insulin|biguanide/i)
      || nameMatches(drug, /insulin|metformin|gliclazide|glipizide|glibenclamide|gemigliptin|sitagliptin|linagliptin|dapagliflozin|empagliflozin|pioglitazone/i),
  },
  {
    id: "cardiovascular",
    name: "ยาโรคหัวใจและความดัน",
    mark: "CV",
    color: "#a74646",
    description: "ยาความดัน หัวใจเต้นผิดจังหวะ ขับปัสสาวะ และยาขยายหลอดเลือด",
    match: (drug) =>
      classMatches(drug, /^2\.(1|2|3|4|5|6|7)|anti-arrhythmic|antihypertensive|diuretic|calcium-channel|beta-adrenoceptor|nitrate/i)
      || nameMatches(drug, /amlodipine|atenolol|bisoprolol|carvedilol|propranolol|enalapril|losartan|valsartan|hydralazine|furosemide|spironolactone|digoxin|amiodarone|diltiazem|verapamil|isosorbide|nitroglycerin/i),
  },
  {
    id: "antithrombotic",
    name: "ยาต้านลิ่มเลือด",
    mark: "AC",
    color: "#814752",
    description: "ยาต้านการแข็งตัวของเลือด ยาต้านเกล็ดเลือด และยาละลายลิ่มเลือด",
    match: (drug) =>
      classMatches(drug, /^2\.(8|9|10|11)|anticoagul|antiplatelet|thrombo|fibrinolytic|hemostatic|factor xa/i)
      || nameMatches(drug, /apixaban|rivaroxaban|warfarin|heparin|enoxaparin|clopidogrel|aspirin|alteplase|tranexamic/i),
  },
  {
    id: "lipids",
    name: "ยาลดไขมัน",
    mark: "LDL",
    color: "#7a6540",
    description: "ยากลุ่ม statin, fibrate และยาลดไขมันชนิดอื่น",
    match: (drug) =>
      classMatches(drug, /^2\.12|lipid|statin|fibrate/i)
      || nameMatches(drug, /atorvastatin|simvastatin|rosuvastatin|pravastatin|fenofibrate|gemfibrozil|ezetimibe/i),
  },
  {
    id: "antibiotics",
    name: "ยาปฏิชีวนะ",
    mark: "AB",
    color: "#316e73",
    description: "ยาฆ่าเชื้อแบคทีเรียชนิดรับประทาน ฉีด และใช้เฉพาะที่",
    match: (drug) =>
      classMatches(drug, /^5\.1(?!\.9)|antibacterial|antibiotic|cephalosporin|macrolide/i)
      || nameMatches(drug, /amoxicillin|ampicillin|azithromycin|clarithromycin|cef|ceph|cloxacillin|dicloxacillin|doxycycline|ertapenem|fosfomycin|levofloxacin|ciprofloxacin|meropenem|piperacillin|tazobactam|vancomycin|colistin|sulbactam|trimethoprim|gentamicin|amikacin/i),
  },
  {
    id: "tuberculosis",
    name: "ยาวัณโรค",
    mark: "TB",
    color: "#526f78",
    description: "ยาสำหรับรักษาวัณโรคจากกรอบโรงพยาบาล",
    match: (drug) =>
      classMatches(drug, /5\.1\.9/i)
      || drug.groups.includes("ยาวัณโรค (TB)")
      || nameMatches(drug, /isoniazid|rifampicin|rifampin|pyrazinamide|ethambutol/i),
  },
  {
    id: "antivirals",
    name: "ยาต้านไวรัส",
    mark: "AV",
    color: "#8c4d67",
    description: "ยาต้านไวรัสทั่วไป เอชไอวี และไวรัสตับอักเสบ",
    match: (drug) =>
      classMatches(drug, /^5\.3|antiviral|virus|nucleotide analog/i)
      || drug.groups.includes("ยาต้านไวรัส (ARV)")
      || nameMatches(drug, /acyclovir|favipiravir|molnupiravir|remdesivir|oseltamivir|tenofovir|lamivudine|dolutegravir|efavirenz|lopinavir|ritonavir/i),
  },
  {
    id: "antifungals",
    name: "ยาต้านเชื้อราและปรสิต",
    mark: "AF",
    color: "#507448",
    description: "ยาต้านเชื้อรา พยาธิ มาลาเรีย และปรสิต",
    match: (drug) =>
      classMatches(drug, /^5\.(2|4|5)|antifungal|anthelmint|parasit/i)
      || nameMatches(drug, /fluconazole|itraconazole|ketoconazole|clotrimazole|albendazole|mebendazole|primaquine|quinine|artesunate/i),
  },
  {
    id: "gastrointestinal",
    name: "ยาระบบทางเดินอาหาร",
    mark: "GI",
    color: "#a16e35",
    description: "ยาลดกรด ยาระบาย ยาแก้ท้องเสีย ยาแก้อาเจียน และยาปรับการเคลื่อนไหวลำไส้",
    match: (drug) =>
      classMatches(drug, /^1\.|nausea and vomiting|vestibular disorders|antacid|laxative|antispasmodic|diarrhea|ulcer/i)
      || nameMatches(drug, /aluminium hydroxide|magnesium hydroxide|simethicone|omeprazole|pantoprazole|ondansetron|metoclopramide|domperidone|dimenhydrinate|betahistine|bisacodyl|lactulose|loperamide|carminative|sodium chloride enema/i),
  },
  {
    id: "respiratory",
    name: "ยาระบบทางเดินหายใจ",
    mark: "RESP",
    color: "#407b87",
    description: "ยาพ่น ยาขยายหลอดลม ยาละลายเสมหะ และยาแก้ไอ",
    match: (drug) =>
      classMatches(drug, /^3\.(?!4)|^12\.2(?!\.1)|bronchodilator|cough|expectorant|decongestant/i)
      || nameMatches(drug, /salbutamol|salmeterol|fluticasone|budesonide|ipratropium|tiotropium|theophylline|bromhexine|ambroxol|dextromethorphan|acetylcysteine|glycopyr|umeclidinium|vilanterol/i),
  },
  {
    id: "allergy",
    name: "ยาแก้แพ้",
    mark: "ALG",
    color: "#5c7f91",
    description: "ยาต้านฮิสตามีนและยารักษาภูมิแพ้",
    match: (drug) =>
      classMatches(drug, /^3\.4|^12\.2\.1|antihistamine|allerg/i)
      || nameMatches(drug, /cetirizine|loratadine|fexofenadine|chlorpheniramine|hydroxyzine|desloratadine/i),
  },
  {
    id: "psychiatry",
    name: "ยาจิตเวช",
    mark: "PSY",
    color: "#765789",
    description: "ยานอนหลับ คลายกังวล ต้านซึมเศร้า ต้านโรคจิต และควบคุมอารมณ์",
    match: (drug) =>
      classMatches(drug, /^4\.(1|2|3|4|10)|antipsychotic|antidepressant|antimanic|anxiolytic|benzodiazepine|smoking cessation/i)
      || drug.groups.includes("ยาจิตเวชผู้ใหญ่")
      || nameMatches(drug, /alprazolam|clonazepam|diazepam|lorazepam|olanzapine|quetiapine|risperidone|haloperidol|fluoxetine|sertraline|venlafaxine|flupentixol|fluphenazine|lithium/i),
  },
  {
    id: "neurology",
    name: "ยากันชักและระบบประสาท",
    mark: "NEU",
    color: "#535f8d",
    description: "ยากันชัก ยาพาร์กินสัน และยาที่ออกฤทธิ์ต่อระบบประสาท",
    match: (drug) =>
      classMatches(drug, /^4\.(8|9)|epilep|movement disorder|n-methyl-d-aspartate/i)
      || nameMatches(drug, /carbamazepine|levetiracetam|phenytoin|phenobarbital|valproate|lamotrigine|gabapentin|pregabalin|trihexyphenidyl|levodopa/i),
  },
  {
    id: "pain",
    name: "ยาแก้ปวดและลดไข้",
    mark: "PAIN",
    color: "#a45542",
    description: "ยาแก้ปวด ลดไข้ NSAIDs ยาแก้ปวดเส้นประสาท และ opioid",
    match: (drug) =>
      classMatches(drug, /^4\.(6|7)|^10\.1\.1|analgesic|antipyretic|opioid|nonsteroidal|NSAID|migraine/i)
      || nameMatches(drug, /paracetamol|acetaminophen|diclofenac|ibuprofen|naproxen|etoricoxib|celecoxib|ketorolac|mefenamic|morphine|fentanyl|tramadol|orphenadrine/i),
  },
  {
    id: "musculoskeletal",
    name: "ยากล้ามเนื้อ ข้อ และเกาต์",
    mark: "MSK",
    color: "#79623f",
    description: "ยาคลายกล้ามเนื้อ ยาเกาต์ และยาที่ใช้ในโรคข้อ",
    match: (drug) =>
      classMatches(drug, /^10\.|muscle relaxant|gout|neuromuscular/i)
      || nameMatches(drug, /allopurinol|colchicine|baclofen|tizanidine|glucosamine|hydroxychloroquine/i),
  },
  {
    id: "hormones",
    name: "ยาไทรอยด์และฮอร์โมน",
    mark: "ENDO",
    color: "#8b6f82",
    description: "ยาไทรอยด์ สเตียรอยด์ และฮอร์โมนเพศที่ไม่ใช่ยาคุมกำเนิด",
    match: (drug) =>
      classMatches(drug, /^6\.(2|3|4|5)|thyroid|corticosteroid|hormone|progestin/i)
      || nameMatches(drug, /thyroxine|levothyroxine|methimazole|propylthiouracil|hydrocortisone|dexamethasone|prednisolone|progesterone|medroxyprogesterone/i),
  },
  {
    id: "bone",
    name: "ยากระดูกและแร่ธาตุ",
    mark: "BONE",
    color: "#87734d",
    description: "ยารักษากระดูกพรุน แคลเซียม และแร่ธาตุ",
    match: (drug) =>
      classMatches(drug, /^6\.6|^9\.5|bone metabolism|mineral/i)
      || nameMatches(drug, /alendronate|calcitonin|calcium|alfacalcidol|calcitriol/i),
  },
  {
    id: "obgyn-urology",
    name: "ยาสูติ-นรีเวชและทางเดินปัสสาวะ",
    mark: "OB",
    color: "#a05f78",
    description: "ยาทางสูติกรรม นรีเวช ต่อมลูกหมาก และระบบทางเดินปัสสาวะ",
    match: (drug) =>
      classMatches(drug, /^7\.|prostatic|vaginal|vulval|oxytocic/i)
      || nameMatches(drug, /carbetocin|misoprostol|sulprostone|oxytocin|tamsulosin|finasteride|oxybutynin|solifenacin/i),
  },
  {
    id: "oncology",
    name: "ยารักษามะเร็งและกดภูมิ",
    mark: "ONC",
    color: "#6c536a",
    description: "ยาเคมีบำบัด ฮอร์โมนรักษามะเร็ง และยากดภูมิคุ้มกัน",
    match: (drug) =>
      classMatches(drug, /^8\.|antineoplastic|immunosuppress|antimetabolite/i)
      || nameMatches(drug, /methotrexate|tamoxifen|cyclophosphamide|azathioprine|cyclosporine/i),
  },
  {
    id: "nutrition",
    name: "วิตามิน สารน้ำ และโภชนาการ",
    mark: "IV",
    color: "#4f7e72",
    description: "วิตามิน เกลือแร่ สารน้ำทางหลอดเลือด และสารอาหาร",
    match: (drug) =>
      classMatches(drug, /^9\.|vitamin|fluid|electrolyte|nutrition|plasma volume/i)
      || nameMatches(drug, /ringer|dextrose|glucose|sodium chloride|sterile water|albumin|dextran|hydroxyethyl starch|folic acid|ferrous|multivitamin/i),
  },
  {
    id: "eye",
    name: "ยาตา",
    mark: "EYE",
    color: "#3f7885",
    description: "ยาหยอดตา ยาป้ายตา น้ำตาเทียม และยารักษาต้อหิน",
    match: (drug) =>
      classMatches(drug, /^11\./i)
      || drug.groups.includes("ยาคลินิกตา")
      || nameMatches(drug, /ophthalmic|eye drop|artificial tear|hpmc|carbomer.*cetrimide/i),
  },
  {
    id: "ent",
    name: "ยาหู คอ จมูก",
    mark: "ENT",
    color: "#4c7682",
    description: "ยาหยอดหู ยาพ่นจมูก และยาที่ใช้เฉพาะทางหูคอจมูก",
    match: (drug) =>
      classMatches(drug, /^12\./i)
      || nameMatches(drug, /ear drop|otic|nasal spray|mouth wash|oral paste/i),
  },
  {
    id: "dermatology",
    name: "ยาผิวหนังและน้ำยาฆ่าเชื้อ",
    mark: "SKIN",
    color: "#6e7650",
    description: "ยาทาผิวหนัง ยาฆ่าเชื้อ แผล และผลิตภัณฑ์ปกป้องผิว",
    match: (drug) =>
      classMatches(drug, /^13\.|^5\.6|antiseptic|emollient|topical/i)
      || nameMatches(drug, /alcohol|chlorhexidine|povidone iodine|hydrogen peroxide|vaseline|petrolatum|mupirocin|fusidic|clotrimazole cream/i),
  },
  {
    id: "vaccines",
    name: "วัคซีนและภูมิคุ้มกัน",
    mark: "VAC",
    color: "#447a68",
    description: "วัคซีน อิมมูโนโกลบูลิน และแอนติท็อกซิน",
    match: (drug) =>
      classMatches(drug, /^14\.|vaccine|immunological/i)
      || nameMatches(drug, /vaccine|vaccice|antitoxoid|immunoglobulin/i),
  },
  {
    id: "anesthesia",
    name: "ยาชาและยาระงับความรู้สึก",
    mark: "ANE",
    color: "#657078",
    description: "ยาชา ยาดมสลบ ยาหย่อนกล้ามเนื้อ และยาระหว่างผ่าตัด",
    match: (drug) =>
      classMatches(drug, /^15\.|anesthe|anaesthe/i)
      || nameMatches(drug, /bupivacaine|lidocaine|propofol|ketamine|sevoflurane|rocuronium|suxamethonium|succinylcholine/i),
  },
  {
    id: "antidotes",
    name: "ยาแก้พิษ",
    mark: "ANT",
    color: "#9b4646",
    description: "ยาแก้พิษ สารต้านพิษ และยาสำหรับภาวะได้รับสารพิษ",
    match: (drug) =>
      classMatches(drug, /^16\.|antidote|poison/i)
      || drug.groups.includes("ยาแก้พิษ (Antidote)"),
  },
  {
    id: "herbal",
    name: "ยาสมุนไพร",
    mark: "HERB",
    color: "#56805a",
    description: "ยาจากสมุนไพรในกรอบโรงพยาบาล",
    match: (drug) => drug.groups.includes("ยาสมุนไพร"),
  },
];

export const FALLBACK_DRUG_GROUP = {
  id: "other",
  name: "อื่น ๆ / รอจัดกลุ่ม",
  mark: "Rx",
  color: "#6f7773",
  description: "รายการที่ยังไม่มีข้อมูลกลุ่มชัดเจนในกรอบยา",
} satisfies Omit<DrugUseGroup, "match">;

export const getDrugUseGroup = (drug: GroupableDrug) =>
  drugUseGroups.find((group) => group.match(drug)) ?? FALLBACK_DRUG_GROUP;
