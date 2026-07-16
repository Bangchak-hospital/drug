"use client";

import { useEffect, useMemo, useState } from "react";
import { HERBAL_SOURCE, herbalProfiles } from "./herbal-data";
import { FALLBACK_DRUG_GROUP, drugUseGroups, getDrugUseGroup } from "./drug-use-groups";

type Drug = {
  id: string; name: string; dosageForm: string; strength: string; account: string;
  status: string; groups: string[]; brand: string; company: string; note: string;
  measure: string; symptomGroup: string; drugCode24: string; purchase: string;
  dueCriteria: string; sourceFiles: string[]; sourcePages: number[]; essential: boolean;
  genericName: string; drugClass: string;
  indications: {
    name: string;
    adultDose: { initial: string; titration: string; maximum: string };
  }[];
  renalAdjustment: {
    eGFR_45_or_more: string;
    eGFR_30_to_44: string;
    eGFR_below_30: string;
  };
  monitoring: string[];
  hospitalStatus: { essentialDrug: boolean; dueRequired: boolean };
  references: string[];
  lastReviewed: string | null;
  evidenceStatus: "reviewed" | "official-label-pending-review" | "thai-ndi-pending-review" | "thai-herbal-source-pending-review" | "hospital-formulary-only";
  officialLabel: {
    provider: string; matchedGenericName: string; dosageForms: string[]; routes: string[];
    indication: string; dosage: string; renal: string; monitoring: string[];
    setId: string; effectiveDate: string; sourceUrl: string; importedAt: string;
    inheritedFrom?: string;
  } | null;
  thaiNdi: {
    sourceUrl: string; genericName: string; dosageForms: string; drugClass: string;
    account: string; matchScore: number; inheritedFrom?: string;
  } | null;
};

type DrugData = {
  meta: { title: string; generatedAt: string; sourceCount: number; rawRowCount: number; recordCount: number; groups: { name: string; count: number }[] };
  drugs: Drug[];
};

const categoryStyle: Record<string, { mark: string; color: string }> = {
  "กรอบยาโรงพยาบาล": { mark: "รพ", color: "#1c6657" },
  "กรอบยา รพ.สต.": { mark: "สต", color: "#42668f" },
  "ยาจิตเวชผู้ใหญ่": { mark: "จว", color: "#7d5e8d" },
  "ยาที่จำกัดการสั่งใช้": { mark: "จำ", color: "#b5543d" },
  "ยาสมุนไพร": { mark: "สม", color: "#56805a" },
  "ยานอกบัญชียาหลัก (NED)": { mark: "NE", color: "#a26d2e" },
  "ยาคลินิกตา": { mark: "ตา", color: "#3f7b87" },
  "ยาต้านไวรัส (ARV)": { mark: "AR", color: "#984e67" },
  "ยาเสพติดและวัตถุออกฤทธิ์": { mark: "วอ", color: "#725b52" },
  "ยาที่มีเกณฑ์ DUE": { mark: "DU", color: "#9a782d" },
  "ยาวัณโรค (TB)": { mark: "TB", color: "#58717b" },
  "ยาแก้พิษ (Antidote)": { mark: "AN", color: "#a84646" },
};

const filterOptions = ["ทั้งหมด", "บัญชียาหลัก", "จำกัดการใช้", "มีเกณฑ์ DUE"];
const formatReviewDate = (value: string) => value.split("-").reverse().join("/");
const evidenceLabel = (drug: Drug) => {
  if (drug.lastReviewed) return `ทบทวน ${formatReviewDate(drug.lastReviewed)}`;
  if (drug.evidenceStatus === "official-label-pending-review") return "พบฉลากทางการ · รอทบทวน";
  if (drug.evidenceStatus === "thai-ndi-pending-review") return "ข้อมูล อย.ไทย · รอทบทวน";
  if (drug.evidenceStatus === "thai-herbal-source-pending-review") return "บัญชีสมุนไพร · รอทบทวน";
  return "ข้อมูลกรอบยาโรงพยาบาลเท่านั้น";
};
const evidenceCode = (drug: Drug) => drug.lastReviewed ? "VERIFIED" : drug.officialLabel ? "OFFICIAL LABEL" : drug.thaiNdi ? "THAI NDI" : drug.evidenceStatus === "thai-herbal-source-pending-review" ? "THAI HERBAL" : "FORMULARY";
const herbalProfileById = new Map(herbalProfiles.map((item) => [item.hospitalDrugId, item]));

export default function Home() {
  const [data, setData] = useState<DrugData | null>(null);
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ทั้งหมด");
  const [selectedFilter, setSelectedFilter] = useState("ทั้งหมด");
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [visibleCount, setVisibleCount] = useState(14);
  const [loadError, setLoadError] = useState(false);
  const [activeView, setActiveView] = useState<"formulary" | "groups" | "herbal">("formulary");
  const [selectedUseGroup, setSelectedUseGroup] = useState("all");

  useEffect(() => {
    fetch("./data/drugs.json")
      .then((response) => { if (!response.ok) throw new Error("data"); return response.json(); })
      .then((payload: DrugData) => setData(payload))
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("#drug-search")?.focus();
      }
      if (event.key === "Escape") setSelectedDrug(null);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const drugs = useMemo(() => data?.drugs ?? [], [data]);
  const groups = data?.meta.groups ?? [];
  const filteredDrugs = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("th");
    return drugs.filter((drug) => {
      const groupMatch = selectedGroup === "ทั้งหมด" || drug.groups.includes(selectedGroup);
      const filterMatch = selectedFilter === "ทั้งหมด"
        || (selectedFilter === "บัญชียาหลัก" && drug.essential)
        || (selectedFilter === "จำกัดการใช้" && drug.status === "จำกัดการใช้")
        || (selectedFilter === "มีเกณฑ์ DUE" && drug.status === "มีเกณฑ์ DUE");
      const searchable = [
        drug.name,
        drug.genericName,
        drug.drugClass,
        drug.brand,
        drug.strength,
        drug.dosageForm,
        drug.account,
        drug.groups.join(" "),
        drug.measure,
        drug.symptomGroup,
        drug.indications.map((item) => item.name).join(" "),
        drug.officialLabel?.indication,
        drug.officialLabel?.dosage,
        drug.thaiNdi?.drugClass,
      ].join(" ").toLocaleLowerCase("th");
      return groupMatch && filterMatch && (!keyword || searchable.includes(keyword));
    });
  }, [drugs, query, selectedGroup, selectedFilter]);

  const herbalItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("th");
    const drugById = new Map(drugs.map((drug) => [drug.id, drug]));
    return herbalProfiles
      .map((profile) => ({ profile, drug: drugById.get(profile.hospitalDrugId) }))
      .filter((item): item is typeof item & { drug: Drug } => Boolean(item.drug))
      .filter(({ profile, drug }) => !keyword || [
        drug.name,
        profile.matchedTitle,
        profile.officialForms,
        profile.accountCategory,
        profile.indication,
        profile.dosage,
        profile.safety.join(" "),
      ].join(" ").toLocaleLowerCase("th").includes(keyword));
  }, [drugs, query]);

  const useGroupStats = useMemo(() => {
    const definitions = [...drugUseGroups, FALLBACK_DRUG_GROUP];
    return definitions.map((group) => {
      const matched = drugs.filter((drug) => getDrugUseGroup(drug).id === group.id);
      return {
        ...group,
        count: matched.length,
        samples: matched.slice(0, 3).map((drug) => drug.name),
      };
    }).filter((group) => group.count > 0);
  }, [drugs]);

  const useGroupDrugs = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("th");
    return drugs.filter((drug) => {
      const group = getDrugUseGroup(drug);
      if (selectedUseGroup !== "all" && group.id !== selectedUseGroup) return false;
      if (!keyword) return true;
      return [
        drug.name,
        drug.genericName,
        drug.strength,
        drug.dosageForm,
        drug.brand,
        drug.drugClass,
        drug.thaiNdi?.drugClass,
        group.name,
      ].join(" ").toLocaleLowerCase("th").includes(keyword);
    });
  }, [drugs, query, selectedUseGroup]);

  const resetPage = () => setVisibleCount(14);
  const chooseGroup = (group: string) => { setSelectedGroup(group); resetPage(); };
  const nedCount = drugs.filter((drug) => drug.groups.includes("ยานอกบัญชียาหลัก (NED)")).length;
  const essentialCount = drugs.filter((drug) => drug.essential).length;
  const restrictedCount = drugs.filter((drug) => drug.status === "จำกัดการใช้").length;
  const dueCount = drugs.filter((drug) => drug.status === "มีเกณฑ์ DUE").length;
  const officialEvidenceCount = drugs.filter((drug) => drug.officialLabel).length;
  const thaiEvidenceCount = drugs.filter((drug) => drug.thaiNdi || drug.evidenceStatus === "thai-herbal-source-pending-review").length;
  const sourceBackedCount = drugs.filter((drug) => drug.officialLabel || drug.thaiNdi || drug.evidenceStatus === "thai-herbal-source-pending-review").length;
  const chartGroups = groups.filter((group) => group.name !== "กรอบยาโรงพยาบาล").slice(0, 6);
  const chartMax = Math.max(...chartGroups.map((group) => group.count), 1);
  const selectedHerbalProfile = selectedDrug ? herbalProfileById.get(selectedDrug.id) ?? null : null;
  const herbalReviewCount = herbalProfiles.filter((item) => item.matchStatus === "review").length;
  const herbalSpecificCount = herbalProfiles.filter((item) => item.accountCategory === "บัญชีรายการยาเฉพาะ").length;
  const unclassifiedCount = useGroupStats.find((group) => group.id === FALLBACK_DRUG_GROUP.id)?.count ?? 0;
  const selectedUseGroupMeta = useGroupStats.find((group) => group.id === selectedUseGroup);
  const contraceptiveCount = useGroupStats.find((group) => group.id === "contraceptives")?.count ?? 0;
  const changeView = (view: "formulary" | "groups" | "herbal") => {
    setActiveView(view);
    setQuery("");
    setSelectedDrug(null);
    setSelectedUseGroup("all");
    setVisibleCount(14);
  };

  return (
    <main className="site-shell">
      <header className="masthead" id="top">
        <a className="wordmark" href="#top" aria-label="กลับหน้าแรก"><span className="wordmark-capsule"><i /><i /></span><span><b>BCH</b><small>FORMULARY · 2569</small></span></a>
        <nav aria-label="เมนูหลัก">{activeView === "formulary" ? <><a href="#directory">บัญชียา</a><a href="#collections">กลุ่มเอกสาร</a><a href="#insights">ภาพรวม</a></> : activeView === "groups" ? <><a href="#use-groups">เลือกกลุ่มยา</a><a href="#group-results">รายการยา</a></> : <><a href="#herbal-directory">รายการสมุนไพร</a><a href="#herbal-source">แหล่งข้อมูล</a></>}</nav>
        <div className="edition"><span />ข้อมูลจาก PDF {data?.meta.sourceCount ?? 12} ชุด</div>
      </header>

      <div className="view-tabs" role="tablist" aria-label="เลือกชุดข้อมูล">
        <button role="tab" aria-selected={activeView === "formulary"} className={activeView === "formulary" ? "active" : ""} onClick={() => changeView("formulary")}><span>01</span>บัญชียาโรงพยาบาล</button>
        <button role="tab" aria-selected={activeView === "groups"} className={activeView === "groups" ? "active groups-tab" : "groups-tab"} onClick={() => changeView("groups")}><span>02</span>กลุ่มยา</button>
        <button role="tab" aria-selected={activeView === "herbal"} className={activeView === "herbal" ? "active herbal-tab" : "herbal-tab"} onClick={() => changeView("herbal")}><span>03</span>บัญชียาหลักแห่งชาติด้านสมุนไพร</button>
      </div>

      <section className={`hero-section ${activeView === "herbal" ? "herbal-hero" : activeView === "groups" ? "groups-hero" : ""}`}>
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="kicker">{activeView === "formulary" ? "BANGCHAK HOSPITAL · DRUG DIRECTORY" : activeView === "groups" ? "THERAPEUTIC GROUPS · HOSPITAL FORMULARY" : "HERBAL ESSENTIAL MEDICINES · 2566"}</p>
          <h1>{activeView === "formulary" ? <>ค้นให้เจอ<br /><em>ก่อนเลือกใช้</em></> : activeView === "groups" ? <>เลือกยา<br /><em>ตามการใช้</em></> : <>สมุนไพร<br /><em>ที่เรามี</em></>}</h1>
          <p className="hero-lead">{activeView === "formulary" ? "ฐานข้อมูลกรอบบัญชียาที่อ่านง่าย ค้นเร็ว และย้อนกลับไปตรวจเอกสารต้นฉบับได้ทุกครั้ง" : activeView === "groups" ? "แยกรายการจากกรอบยาโรงพยาบาลเป็นกลุ่มการใช้ เช่น ยาคุมกำเนิด ยาเบาหวาน ยาปฏิชีวนะ ยาความดัน และกลุ่มสำคัญอื่น ๆ" : "จับคู่ยาสมุนไพรของโรงพยาบาลกับบัญชียาหลักแห่งชาติด้านสมุนไพร พ.ศ. 2566 พร้อมข้อบ่งใช้ ขนาดใช้ และข้อควรระวังจากเอกสารต้นฉบับ"}</p>
          <label className="hero-search" htmlFor="drug-search"><span className="search-glyph">⌕</span><input id="drug-search" value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} placeholder={activeView === "formulary" ? "พิมพ์ชื่อยา ความแรง หรือรูปแบบยา" : activeView === "groups" ? "ค้นหาชื่อยา ชื่อสามัญ หรือกลุ่มยา" : "ค้นหาชื่อสมุนไพร ข้อบ่งใช้ หรือรูปแบบยา"} autoComplete="off" />{query ? <button onClick={() => { setQuery(""); resetPage(); }} aria-label="ล้างคำค้น">×</button> : <kbd>⌘ K</kbd>}</label>
          <div className="quick-links">
            <span>{activeView === "groups" ? "กลุ่มยอดนิยม" : "ค้นหายอดนิยม"}</span>
            {activeView === "groups"
              ? [["ยาคุมกำเนิด", "contraceptives"], ["ยาเบาหวาน", "diabetes"], ["ยาแก้แพ้", "allergy"]].map(([label, id]) => <button key={id} onClick={() => { setSelectedUseGroup(id); setQuery(""); resetPage(); }}>{label}</button>)
              : (activeView === "formulary" ? ["Paracetamol", "Amoxicillin", "Metformin"] : ["ฟ้าทะลายโจร", "พญายอ", "ขมิ้นชัน"]).map((term) => <button key={term} onClick={() => { setQuery(term); resetPage(); }}>{term}</button>)}
          </div>
        </div>
        <aside className="hero-ledger" aria-label="สรุปข้อมูล">
          <p>{activeView === "formulary" ? "THE COLLECTION" : activeView === "groups" ? "THERAPEUTIC INDEX" : "HOSPITAL HERBAL SET"}</p>
          <strong>{activeView === "formulary" ? (data?.meta.recordCount ?? 708).toLocaleString("th-TH") : activeView === "groups" ? useGroupStats.length.toLocaleString("th-TH") : herbalProfiles.length.toLocaleString("th-TH")}</strong>
          <span>{activeView === "formulary" ? "รายการที่ค้นหาได้" : activeView === "groups" ? "กลุ่มการใช้ยาจากกรอบโรงพยาบาล" : "รายการสมุนไพรของโรงพยาบาล"}</span>
          <dl>{activeView === "formulary" ? <><div><dt>กลุ่มเอกสาร</dt><dd>{groups.length || 12}</dd></div><div><dt>รายการ NED</dt><dd>{nedCount || 33}</dd></div><div><dt>มีเกณฑ์ DUE</dt><dd>{dueCount || 25}</dd></div></> : activeView === "groups" ? <><div><dt>รายการที่จัดกลุ่มแล้ว</dt><dd>{(drugs.length - unclassifiedCount).toLocaleString("th-TH")}</dd></div><div><dt>ยาคุมกำเนิด</dt><dd>{contraceptiveCount}</dd></div><div><dt>รอจัดกลุ่ม</dt><dd>{unclassifiedCount}</dd></div></> : <><div><dt>จับคู่ตรง</dt><dd>{herbalProfiles.length - herbalReviewCount}</dd></div><div><dt>ต้องทบทวนตำรับ</dt><dd>{herbalReviewCount}</dd></div><div><dt>บัญชีรายการยาเฉพาะ</dt><dd>{herbalSpecificCount}</dd></div></>}</dl>
          <div className="ledger-mark"><span>{activeView === "formulary" ? "Rx" : activeView === "groups" ? "GRP" : "Herb"}</span><i /></div>
        </aside>
      </section>

      {loadError && <div className="error-note">ไม่สามารถเปิดชุดข้อมูลยาได้ กรุณาตรวจสอบไฟล์ข้อมูลใน Repository</div>}

      {activeView === "formulary" ? <>
      <section className="collection-section" id="collections">
        <div className="section-title"><div><span>01</span><p>COLLECTION INDEX</p></div><h2>เลือกจากกลุ่มยา</h2><button onClick={() => { setSelectedGroup("ทั้งหมด"); setSelectedFilter("ทั้งหมด"); resetPage(); }}>ล้างตัวกรอง ↻</button></div>
        <div className="collection-rail">
          <button className={`collection-card all-card ${selectedGroup === "ทั้งหมด" ? "active" : ""}`} onClick={() => chooseGroup("ทั้งหมด")}><span className="collection-mark">ALL</span><strong>ยาทุกกลุ่ม</strong><small>{drugs.length || 708} รายการ</small></button>
          {groups.map((group, index) => { const style = categoryStyle[group.name] ?? { mark: "Rx", color: "#1c6657" }; return <button key={group.name} className={`collection-card ${selectedGroup === group.name ? "active" : ""}`} onClick={() => chooseGroup(group.name)} style={{ "--accent": style.color } as React.CSSProperties}><span className="collection-number">{String(index + 1).padStart(2, "0")}</span><span className="collection-mark">{style.mark}</span><strong>{group.name}</strong><small>{group.count} รายการ</small></button>; })}
        </div>
      </section>

      <section className="directory-layout" id="directory">
        <div className="directory-main">
          <div className="directory-head"><div><span>02 / DIRECTORY</span><h2>{query ? `ผลการค้นหา “${query}”` : selectedGroup === "ทั้งหมด" ? "บัญชียาทั้งหมด" : selectedGroup}</h2></div><strong>{filteredDrugs.length.toLocaleString("th-TH")} <small>รายการ</small></strong></div>
          <div className="filter-tabs" role="group" aria-label="กรองสถานะยา">{filterOptions.map((filter) => <button key={filter} className={selectedFilter === filter ? "active" : ""} onClick={() => { setSelectedFilter(filter); resetPage(); }}>{filter}</button>)}</div>
          <div className="drug-table">
            <div className="drug-table-head"><span>ชื่อยา / รูปแบบ</span><span>กลุ่มข้อมูล</span><span>สถานะ</span><span /></div>
            {!data && !loadError && <div className="loading-lines"><i /><i /><i /><i /><i /></div>}
            {filteredDrugs.slice(0, visibleCount).map((drug) => { const style = categoryStyle[drug.groups[0]] ?? { mark: "Rx", color: "#1c6657" }; return <button className="drug-entry" key={drug.id} onClick={() => setSelectedDrug(drug)}><span className="entry-mark" style={{ color: style.color, borderColor: `${style.color}40` }}>{style.mark}</span><span className="entry-name"><strong>{drug.name}</strong><small>{[drug.dosageForm, drug.strength, drug.brand].filter(Boolean).join(" · ") || "ไม่ระบุรูปแบบและความแรง"}</small></span><span className="entry-group">{drug.groups[0]}{drug.groups.length > 1 && <i>+{drug.groups.length - 1}</i>}</span><span className={`status-chip ${drug.status === "พร้อมใช้" ? "ready" : drug.status === "มีเกณฑ์ DUE" ? "due" : drug.status === "จำกัดการใช้" ? "restricted" : "special"}`}><i />{drug.status}</span><span className="entry-arrow">↗</span></button>; })}
            {data && filteredDrugs.length === 0 && <div className="empty-result"><span>⌕</span><h3>ยังไม่พบรายการนี้</h3><p>ลองใช้ชื่อสามัญภาษาอังกฤษ หรือลดตัวกรองลง</p></div>}
          </div>
          {visibleCount < filteredDrugs.length && <button className="more-button" onClick={() => setVisibleCount((count) => count + 24)}>แสดงอีก {Math.min(24, filteredDrugs.length - visibleCount)} รายการ <span>↓</span></button>}
        </div>

        <aside className="insight-column" id="insights">
          <section className="insight-card overview-card"><p className="card-label">DATABASE SIGNAL</p><div className="ring-chart"><div><strong>{Math.round((essentialCount / Math.max(drugs.length, 1)) * 100) || 72}%</strong><span>บัญชียาหลัก</span></div></div><div className="signal-stats"><div><span>ในบัญชียาหลัก</span><strong>{essentialCount.toLocaleString("th-TH")}</strong></div><div><span>จำกัดการใช้</span><strong>{restrictedCount}</strong></div></div></section>
          <section className="insight-card group-chart"><div className="card-heading"><p className="card-label">SPECIAL COLLECTIONS</p><span>รายการ</span></div>{chartGroups.map((group) => <div className="mini-bar" key={group.name}><div><span>{group.name}</span><strong>{group.count}</strong></div><i><b style={{ width: `${Math.max(8, (group.count / chartMax) * 100)}%`, background: categoryStyle[group.name]?.color }} /></i></div>)}</section>
          <section className="insight-card source-card"><span>REF</span><div><p>หลักฐานประกอบรายรายการ</p><strong>{sourceBackedCount.toLocaleString("th-TH")} รายการมีแหล่งทางการ</strong><small>ฉลากทางการ {officialEvidenceCount} · อย.ไทย/สมุนไพร {thaiEvidenceCount}</small></div></section>
          <p className="clinical-note">ข้อมูลนี้ใช้เพื่อการสืบค้น โปรดตรวจสอบเอกสารต้นฉบับและดุลยพินิจของแพทย์หรือเภสัชกรก่อนใช้ยา</p>
        </aside>
      </section>

      </> : activeView === "groups" ? (
        <section className="use-group-directory" id="use-groups">
          <header className="use-group-head">
            <div>
              <span>02 / THERAPEUTIC GROUPS</span>
              <h2>กลุ่มการใช้ยา</h2>
              <p>จัดกลุ่มจากชื่อยาและหมวดทางเภสัชวิทยาที่มีอยู่ในรายการกรอบยาโรงพยาบาล โดยยาแต่ละรายการอยู่ในกลุ่มหลักเพียงหนึ่งกลุ่มเพื่อให้ค้นหาได้ชัดเจน</p>
            </div>
            <strong>{useGroupStats.length}<small> กลุ่ม</small></strong>
          </header>

          <div className="use-group-grid">
            <button className={`use-group-card all ${selectedUseGroup === "all" ? "active" : ""}`} onClick={() => { setSelectedUseGroup("all"); resetPage(); }}>
              <span className="use-group-mark">ALL</span>
              <strong>ยาทุกกลุ่ม</strong>
              <p>แสดงรายการทั้งหมดจากกรอบยาโรงพยาบาล</p>
              <small>{drugs.length.toLocaleString("th-TH")} รายการ</small>
            </button>
            {useGroupStats.map((group) => (
              <button
                className={`use-group-card ${selectedUseGroup === group.id ? "active" : ""}`}
                key={group.id}
                onClick={() => { setSelectedUseGroup(group.id); resetPage(); }}
                style={{ "--accent": group.color } as React.CSSProperties}
              >
                <span className="use-group-mark">{group.mark}</span>
                <strong>{group.name}</strong>
                <p>{group.description}</p>
                <small>{group.count.toLocaleString("th-TH")} รายการ</small>
                <i>{group.samples.slice(0, 2).join(" · ")}</i>
              </button>
            ))}
          </div>

          <section className="group-results" id="group-results">
            <div className="directory-head">
              <div><span>03 / GROUP RESULTS</span><h2>{query ? `ผลการค้นหา “${query}”` : selectedUseGroupMeta?.name ?? "ยาทุกกลุ่ม"}</h2></div>
              <strong>{useGroupDrugs.length.toLocaleString("th-TH")} <small>รายการ</small></strong>
            </div>
            {selectedUseGroupMeta && <div className="group-context"><span style={{ background: selectedUseGroupMeta.color }}>{selectedUseGroupMeta.mark}</span><p>{selectedUseGroupMeta.description}</p><button onClick={() => { setSelectedUseGroup("all"); resetPage(); }}>แสดงทุกกลุ่ม ↻</button></div>}
            <div className="drug-table group-drug-table">
              <div className="drug-table-head"><span>ชื่อยา / รูปแบบ</span><span>หมวดทางเภสัชวิทยา</span><span>สถานะ</span><span /></div>
              {!data && !loadError && <div className="loading-lines"><i /><i /><i /><i /><i /></div>}
              {useGroupDrugs.slice(0, visibleCount).map((drug) => {
                const group = getDrugUseGroup(drug);
                return <button className="drug-entry" key={drug.id} onClick={() => setSelectedDrug(drug)}><span className="entry-mark" style={{ color: group.color, borderColor: `${group.color}40` }}>{group.mark}</span><span className="entry-name"><strong>{drug.name}</strong><small>{[drug.dosageForm, drug.strength, drug.brand].filter(Boolean).join(" · ") || "ไม่ระบุรูปแบบและความแรง"}</small></span><span className="entry-group">{drug.thaiNdi?.drugClass || drug.drugClass || group.name}</span><span className={`status-chip ${drug.status === "พร้อมใช้" ? "ready" : drug.status === "มีเกณฑ์ DUE" ? "due" : drug.status === "จำกัดการใช้" ? "restricted" : "special"}`}><i />{drug.status}</span><span className="entry-arrow">↗</span></button>;
              })}
              {data && useGroupDrugs.length === 0 && <div className="empty-result"><span>⌕</span><h3>ยังไม่พบยาในกลุ่มนี้</h3><p>ลองล้างคำค้นหรือเลือกกลุ่มยาอื่น</p></div>}
            </div>
            {visibleCount < useGroupDrugs.length && <button className="more-button" onClick={() => setVisibleCount((count) => count + 24)}>แสดงอีก {Math.min(24, useGroupDrugs.length - visibleCount)} รายการ <span>↓</span></button>}
          </section>

          <p className="group-method-note"><strong>หมายเหตุการจัดกลุ่ม</strong> กลุ่มนี้จัดเพื่อช่วยค้นหา ไม่ใช้แทนการจำแนก ATC หรือบัญชียาหลักแห่งชาติ หากรายการใดยังไม่มีข้อมูลชัดเจนจะแสดงใน “อื่น ๆ / รอจัดกลุ่ม”</p>
        </section>
      ) : (
        <section className="herbal-directory" id="herbal-directory">
          <header className="herbal-directory-head">
            <div><span>02 / HERBAL DIRECTORY</span><h2>{query ? `ผลการค้นหา “${query}”` : "ยาสมุนไพรที่โรงพยาบาลมี"}</h2><p>เลือกแต่ละรายการเพื่อดูข้อบ่งใช้ ขนาดและวิธีใช้ ข้อควรระวัง และหน้าที่อ้างอิงในหนังสือ</p></div>
            <strong>{herbalItems.length.toLocaleString("th-TH")}<small> / {herbalProfiles.length} รายการ</small></strong>
          </header>

          <div className="herbal-source-note" id="herbal-source">
            <span>HERB<br />2566</span>
            <div><small>แหล่งข้อมูลหลัก</small><strong>{HERBAL_SOURCE.title}</strong><p>{HERBAL_SOURCE.note}</p><a href={HERBAL_SOURCE.sourceUrl} target="_blank" rel="noreferrer">เปิดหน้าบัญชีสมุนไพรของ อย. ↗</a></div>
            <div className="source-stats"><b>{herbalProfiles.length - herbalReviewCount}</b><small>จับคู่ตรง</small><b>{herbalReviewCount}</b><small>ต้องทบทวนตำรับ</small></div>
          </div>

          <div className="herbal-grid">
            {herbalItems.map(({ profile, drug }, index) => (
              <button className="herbal-card" key={profile.hospitalDrugId} onClick={() => setSelectedDrug(drug)}>
                <span className="herbal-card-number">{String(index + 1).padStart(2, "0")}</span>
                <span className={`herbal-match ${profile.matchStatus}`}>{profile.matchStatus === "matched" ? "จับคู่แล้ว" : "ทบทวนตำรับ"}</span>
                <h3>{drug.name}</h3>
                <p className="matched-title">ในบัญชี: {profile.matchedTitle}</p>
                <p className="herbal-indication">{profile.indication}</p>
                <div><span>{profile.officialForms}</span><strong>{profile.accountCategory.replace("บัญชีรายการยา", "บัญชี")}</strong></div>
                <small>PDF หน้า {profile.pdfPages.join(", ")} · เอกสารหน้า {profile.printedPages.join(", ")}</small>
                <i>ดูข้อมูล ↗</i>
              </button>
            ))}
          </div>
          {data && herbalItems.length === 0 && <div className="empty-result herbal-empty"><span>⌕</span><h3>ยังไม่พบสมุนไพรนี้</h3><p>ลองค้นด้วยชื่อยา ข้อบ่งใช้ หรือรูปแบบยา</p></div>}
        </section>
      )}

      <footer className="footer"><div><b>BCH</b><span>Bangchak Hospital Formulary</span></div><p>{activeView === "formulary" ? `ปีงบประมาณ 2569 · ข้อมูล ${data?.meta.recordCount ?? 708} รายการ` : activeView === "groups" ? `กลุ่มการใช้ยา ${useGroupStats.length} กลุ่ม · ข้อมูลจากกรอบยาโรงพยาบาล` : `${HERBAL_SOURCE.title} · ยาโรงพยาบาล ${herbalProfiles.length} รายการ`}</p><a href="#top">กลับด้านบน ↑</a></footer>

      {selectedDrug && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedDrug(null)}>
          <section className="drug-drawer" role="dialog" aria-modal="true" aria-labelledby="drug-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelectedDrug(null)} aria-label="ปิดรายละเอียด">×</button>
            <div className="drawer-index">
              <span>{selectedDrug.id}</span>
              <small className={selectedDrug.lastReviewed ? "reviewed" : selectedDrug.officialLabel || selectedDrug.thaiNdi ? "source-found" : "pending-review"}>
                {evidenceLabel(selectedDrug)}
              </small>
            </div>

            <div className="drawer-hero">
              <span>Rx</span>
              <div>
                <h2 id="drug-title">{selectedDrug.genericName || selectedDrug.name}</h2>
                <p>{selectedDrug.name}{selectedDrug.drugClass ? ` · ${selectedDrug.drugClass}` : ""}</p>
              </div>
            </div>

            <div className="drawer-tags">
              {selectedDrug.groups.map((group) => <span key={group}>{group}</span>)}
              {selectedDrug.hospitalStatus.essentialDrug && <span className="essential-tag">บัญชียาหลัก</span>}
              {selectedDrug.hospitalStatus.dueRequired && <span className="due-tag">ต้องทำ DUE</span>}
            </div>

            <div className="detail-grid">
              <div><small>รูปแบบยา</small><strong>{selectedDrug.dosageForm || "ไม่ระบุ"}</strong></div>
              <div><small>ความแรง</small><strong>{selectedDrug.strength || "ไม่ระบุ"}</strong></div>
              <div><small>กลุ่มยา</small><strong>{selectedDrug.drugClass || "รอทบทวน"}</strong></div>
              <div><small>สถานะโรงพยาบาล</small><strong>{selectedDrug.status}</strong></div>
            </div>

            <section className="clinical-section">
              <div className="clinical-heading">
                <div><small>CLINICAL PROFILE</small><h3>ข้อมูลการใช้ยา</h3></div>
                <span>{evidenceCode(selectedDrug)}</span>
              </div>

              {!selectedDrug.lastReviewed && !selectedDrug.officialLabel && !selectedDrug.thaiNdi && selectedDrug.evidenceStatus === "hospital-formulary-only" && (
                <div className="clinical-empty">
                  <strong>มีเฉพาะข้อมูลกรอบยาโรงพยาบาล</strong>
                  <p>ยังไม่พบฉลากทางการที่จับคู่ชื่อและรูปแบบยาได้อย่างมั่นใจ จึงไม่แสดงขนาดยาหรือคำแนะนำทางคลินิกจากการคาดเดา</p>
                </div>
              )}

              {selectedDrug.officialLabel && (
                <article className="official-evidence">
                  <header>
                    <div><small>OFFICIAL LABEL · PENDING PHARMACIST REVIEW</small><strong>{selectedDrug.officialLabel.provider}</strong></div>
                    <span>{selectedDrug.officialLabel.effectiveDate || "CURRENT"}</span>
                  </header>
                  <p className="evidence-meta">Matched: {selectedDrug.officialLabel.matchedGenericName} · Route: {selectedDrug.officialLabel.routes.join(", ") || "ไม่ระบุ"}</p>
                  {selectedDrug.officialLabel.indication && <details open><summary>ข้อบ่งใช้จากฉลากทางการ</summary><p lang="en">{selectedDrug.officialLabel.indication}</p></details>}
                  {selectedDrug.officialLabel.dosage && <details><summary>ขนาดและวิธีใช้จากฉลากทางการ</summary><p lang="en">{selectedDrug.officialLabel.dosage}</p></details>}
                  {selectedDrug.officialLabel.renal && <details><summary>ข้อมูลการใช้ในผู้ป่วยไต</summary><p lang="en">{selectedDrug.officialLabel.renal}</p></details>}
                  {selectedDrug.officialLabel.monitoring.length > 0 && <details><summary>ข้อความเกี่ยวกับการติดตาม</summary><ul lang="en">{selectedDrug.officialLabel.monitoring.map((item) => <li key={item}>{item}</li>)}</ul></details>}
                  <a href={selectedDrug.officialLabel.sourceUrl} target="_blank" rel="noreferrer">เปิดฉลากฉบับเต็ม ↗</a>
                </article>
              )}

              {selectedDrug.thaiNdi && (
                <article className="ndi-evidence">
                  <small>บัญชียาหลักแห่งชาติ · สำนักงานคณะกรรมการอาหารและยา</small>
                  <h4>{selectedDrug.thaiNdi.genericName}</h4>
                  <dl>
                    <div><dt>กลุ่มยา</dt><dd>{selectedDrug.thaiNdi.drugClass}</dd></div>
                    <div><dt>รูปแบบในบัญชี</dt><dd>{selectedDrug.thaiNdi.dosageForms}</dd></div>
                    <div><dt>บัญชี</dt><dd>{selectedDrug.thaiNdi.account}</dd></div>
                  </dl>
                  <a href={selectedDrug.thaiNdi.sourceUrl} target="_blank" rel="noreferrer">ตรวจสอบกับ อย.ไทย ↗</a>
                </article>
              )}

              {selectedHerbalProfile && (
                <article className={`herbal-profile ${selectedHerbalProfile.matchStatus}`}>
                  <header>
                    <div><small>HERB 2566 · {selectedHerbalProfile.accountCategory}</small><h4>{selectedHerbalProfile.matchedTitle}</h4></div>
                    <span>{selectedHerbalProfile.matchStatus === "matched" ? "MATCHED" : "REVIEW FORMULA"}</span>
                  </header>
                  <p className="herbal-match-note">{selectedHerbalProfile.matchNote}</p>
                  <dl>
                    <div><dt>รูปแบบในบัญชี</dt><dd>{selectedHerbalProfile.officialForms}</dd></div>
                    <div><dt>สรรพคุณ / ข้อบ่งใช้</dt><dd>{selectedHerbalProfile.indication}</dd></div>
                    <div><dt>ขนาดและวิธีใช้</dt><dd>{selectedHerbalProfile.dosage}</dd></div>
                  </dl>
                  <div className="herbal-safety"><small>ข้อห้าม / ข้อควรระวังสำคัญ</small><ul>{selectedHerbalProfile.safety.map((item) => <li key={item}>{item}</li>)}</ul></div>
                  <footer><strong>{HERBAL_SOURCE.fileName}</strong><span>PDF หน้า {selectedHerbalProfile.pdfPages.join(", ")} · เลขหน้าในเอกสาร {selectedHerbalProfile.printedPages.join(", ")}</span><a href={HERBAL_SOURCE.sourceUrl} target="_blank" rel="noreferrer">บัญชีทางการ ↗</a></footer>
                </article>
              )}

              {selectedDrug.evidenceStatus === "thai-herbal-source-pending-review" && !selectedHerbalProfile && (
                <div className="herbal-evidence">
                  <strong>แหล่งข้อมูลสมุนไพรทางการ</strong>
                  <p>รายการนี้เชื่อมกับบัญชียาหลักแห่งชาติด้านสมุนไพร แต่ยังต้องจับคู่ตำรับและทบทวนรายละเอียดรายตัวโดยเภสัชกร</p>
                  <a href="https://herbal.fda.moph.go.th/drug-list/category/ann-drug02" target="_blank" rel="noreferrer">เปิดบัญชียาสมุนไพร ↗</a>
                </div>
              )}

              {selectedDrug.indications.map((indication) => (
                <article className="indication-card" key={indication.name}>
                  <small>ข้อบ่งใช้</small>
                  <h4>{indication.name}</h4>
                  <dl>
                    <div><dt>ขนาดเริ่มต้น</dt><dd>{indication.adultDose.initial}</dd></div>
                    <div><dt>การปรับขนาด</dt><dd>{indication.adultDose.titration}</dd></div>
                    <div><dt>ขนาดสูงสุด</dt><dd>{indication.adultDose.maximum}</dd></div>
                  </dl>
                </article>
              ))}

              {Object.values(selectedDrug.renalAdjustment).some(Boolean) && (
                <div className="renal-card">
                  <small>การปรับยาตามการทำงานของไต</small>
                  <div><b>eGFR ≥ 45</b><p>{selectedDrug.renalAdjustment.eGFR_45_or_more}</p></div>
                  <div><b>eGFR 30–44</b><p>{selectedDrug.renalAdjustment.eGFR_30_to_44}</p></div>
                  <div className="renal-stop"><b>eGFR &lt; 30</b><p>{selectedDrug.renalAdjustment.eGFR_below_30}</p></div>
                </div>
              )}

              {selectedDrug.monitoring.length > 0 && (
                <div className="monitoring-card">
                  <small>การติดตาม</small>
                  <div>{selectedDrug.monitoring.map((item) => <span key={item}>{item}</span>)}</div>
                </div>
              )}
            </section>

            {selectedDrug.symptomGroup && <div className="info-block"><small>กลุ่มอาการ</small><p>{selectedDrug.symptomGroup}</p></div>}
            {selectedDrug.measure && <div className="info-block warning-block"><small>มาตรการที่กำหนด</small><p>{selectedDrug.measure}</p></div>}
            {selectedDrug.dueCriteria && <div className="info-block due-block"><small>เกณฑ์ DUE</small><p>{selectedDrug.dueCriteria}</p></div>}
            {selectedDrug.note && <div className="info-block"><small>หมายเหตุ</small><p>{selectedDrug.note}</p></div>}
            {selectedDrug.drugCode24 && <div className="code-row"><small>รหัสยา 24 หลัก</small><code>{selectedDrug.drugCode24}</code></div>}

            <div className="drawer-warning">
              <span>!</span>
              <p><strong>โปรดตรวจสอบก่อนใช้งาน</strong>ข้อมูลนี้เป็นข้อมูลสนับสนุนการทำงาน ไม่ใช้แทนคำสั่งแพทย์ แนวทางโรงพยาบาล หรือการทบทวนโดยเภสัชกร</p>
            </div>

            <footer>
              <strong>แหล่งอ้างอิงทางคลินิก</strong>
              {selectedDrug.references.length > 0
                ? selectedDrug.references.map((reference, index) => <p key={reference}><a href={reference} target="_blank" rel="noreferrer">เอกสารอ้างอิง {index + 1} ↗</a></p>)
                : <p>ยังไม่มีแหล่งอ้างอิงที่ผ่านการทบทวน</p>}
              <strong className="source-title">เอกสารกรอบบัญชียา</strong>
              {selectedDrug.sourceFiles.map((file, index) => <p key={file}>{file} · หน้า {selectedDrug.sourcePages[index] ?? "-"}</p>)}
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
