"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function Home() {
  const [data, setData] = useState<DrugData | null>(null);
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ทั้งหมด");
  const [selectedFilter, setSelectedFilter] = useState("ทั้งหมด");
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [visibleCount, setVisibleCount] = useState(14);
  const [loadError, setLoadError] = useState(false);

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
      ].join(" ").toLocaleLowerCase("th");
      return groupMatch && filterMatch && (!keyword || searchable.includes(keyword));
    });
  }, [drugs, query, selectedGroup, selectedFilter]);

  const resetPage = () => setVisibleCount(14);
  const chooseGroup = (group: string) => { setSelectedGroup(group); resetPage(); };
  const nedCount = drugs.filter((drug) => drug.groups.includes("ยานอกบัญชียาหลัก (NED)")).length;
  const essentialCount = drugs.filter((drug) => drug.essential).length;
  const restrictedCount = drugs.filter((drug) => drug.status === "จำกัดการใช้").length;
  const dueCount = drugs.filter((drug) => drug.status === "มีเกณฑ์ DUE").length;
  const chartGroups = groups.filter((group) => group.name !== "กรอบยาโรงพยาบาล").slice(0, 6);
  const chartMax = Math.max(...chartGroups.map((group) => group.count), 1);

  return (
    <main className="site-shell">
      <header className="masthead" id="top">
        <a className="wordmark" href="#top" aria-label="กลับหน้าแรก"><span className="wordmark-capsule"><i /><i /></span><span><b>BCH</b><small>FORMULARY · 2569</small></span></a>
        <nav aria-label="เมนูหลัก"><a href="#directory">บัญชียา</a><a href="#collections">กลุ่มยา</a><a href="#insights">ภาพรวม</a></nav>
        <div className="edition"><span />ข้อมูลจาก PDF {data?.meta.sourceCount ?? 12} ชุด</div>
      </header>

      <section className="hero-section">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="kicker">BANGCHAK HOSPITAL · DRUG DIRECTORY</p>
          <h1>ค้นให้เจอ<br /><em>ก่อนเลือกใช้</em></h1>
          <p className="hero-lead">ฐานข้อมูลกรอบบัญชียาที่อ่านง่าย ค้นเร็ว และย้อนกลับไปตรวจเอกสารต้นฉบับได้ทุกครั้ง</p>
          <label className="hero-search" htmlFor="drug-search"><span className="search-glyph">⌕</span><input id="drug-search" value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} placeholder="พิมพ์ชื่อยา ความแรง หรือรูปแบบยา" autoComplete="off" />{query ? <button onClick={() => { setQuery(""); resetPage(); }} aria-label="ล้างคำค้น">×</button> : <kbd>⌘ K</kbd>}</label>
          <div className="quick-links"><span>ค้นหายอดนิยม</span>{["Paracetamol", "Amoxicillin", "Metformin"].map((term) => <button key={term} onClick={() => { setQuery(term); resetPage(); }}>{term}</button>)}</div>
        </div>
        <aside className="hero-ledger" aria-label="สรุปข้อมูล"><p>THE COLLECTION</p><strong>{(data?.meta.recordCount ?? 708).toLocaleString("th-TH")}</strong><span>รายการที่ค้นหาได้</span><dl><div><dt>กลุ่มยา</dt><dd>{groups.length || 12}</dd></div><div><dt>รายการ NED</dt><dd>{nedCount || 33}</dd></div><div><dt>มีเกณฑ์ DUE</dt><dd>{dueCount || 25}</dd></div></dl><div className="ledger-mark"><span>Rx</span><i /></div></aside>
      </section>

      {loadError && <div className="error-note">ไม่สามารถเปิดชุดข้อมูลยาได้ กรุณาตรวจสอบไฟล์ข้อมูลใน Repository</div>}

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
          <section className="insight-card source-card"><span>PDF</span><div><p>ชุดข้อมูลล่าสุด</p><strong>{data?.meta.generatedAt ?? "14 กรกฎาคม 2569"}</strong><small>อ้างอิงจากเอกสารต้นฉบับ {data?.meta.sourceCount ?? 12} ชุด</small></div></section>
          <p className="clinical-note">ข้อมูลนี้ใช้เพื่อการสืบค้น โปรดตรวจสอบเอกสารต้นฉบับและดุลยพินิจของแพทย์หรือเภสัชกรก่อนใช้ยา</p>
        </aside>
      </section>

      <footer className="footer"><div><b>BCH</b><span>Bangchak Hospital Formulary</span></div><p>ปีงบประมาณ 2569 · ข้อมูล {data?.meta.recordCount ?? 708} รายการ</p><a href="#top">กลับด้านบน ↑</a></footer>

      {selectedDrug && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedDrug(null)}>
          <section className="drug-drawer" role="dialog" aria-modal="true" aria-labelledby="drug-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelectedDrug(null)} aria-label="ปิดรายละเอียด">×</button>
            <div className="drawer-index">
              <span>{selectedDrug.id}</span>
              <small className={selectedDrug.lastReviewed ? "reviewed" : "pending-review"}>
                {selectedDrug.lastReviewed ? `ทบทวน ${formatReviewDate(selectedDrug.lastReviewed)}` : "รอทบทวนข้อมูลคลินิก"}
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
                <span>{selectedDrug.lastReviewed ? "VERIFIED" : "PENDING"}</span>
              </div>

              {!selectedDrug.lastReviewed && (
                <div className="clinical-empty">
                  <strong>ยังไม่มีข้อมูลที่ผ่านการทบทวน</strong>
                  <p>โครงสร้างข้อมูลพร้อมแล้ว กรุณาให้เภสัชกรเพิ่มข้อบ่งใช้ ขนาดยา การปรับยาในไต และแหล่งอ้างอิงก่อนนำไปใช้ทางคลินิก</p>
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
