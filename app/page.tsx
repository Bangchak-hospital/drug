"use client";

import { useEffect, useMemo, useState } from "react";

type Drug = {
  id: string;
  name: string;
  dosageForm: string;
  strength: string;
  account: string;
  status: string;
  groups: string[];
  brand: string;
  company: string;
  note: string;
  measure: string;
  symptomGroup: string;
  drugCode24: string;
  purchase: string;
  dueCriteria: string;
  sourceFiles: string[];
  sourcePages: number[];
  essential: boolean;
};

type DrugData = {
  meta: {
    title: string;
    generatedAt: string;
    sourceCount: number;
    rawRowCount: number;
    recordCount: number;
    groups: { name: string; count: number }[];
  };
  drugs: Drug[];
};

const categoryStyle: Record<string, { icon: string; color: string }> = {
  "กรอบยาโรงพยาบาล": { icon: "✚", color: "#126b5c" },
  "กรอบยา รพ.สต.": { icon: "⌂", color: "#4c72b8" },
  "ยาจิตเวชผู้ใหญ่": { icon: "◉", color: "#8062a8" },
  "ยาที่จำกัดการสั่งใช้": { icon: "!", color: "#c76645" },
  "ยาสมุนไพร": { icon: "⌁", color: "#4e8a59" },
  "ยานอกบัญชียาหลัก (NED)": { icon: "N", color: "#b46a32" },
  "ยาคลินิกตา": { icon: "◌", color: "#3c8496" },
  "ยาต้านไวรัส (ARV)": { icon: "A", color: "#a34d6b" },
  "ยาเสพติดและวัตถุออกฤทธิ์": { icon: "◆", color: "#7a5e54" },
  "ยาที่มีเกณฑ์ DUE": { icon: "D", color: "#a17a22" },
  "ยาวัณโรค (TB)": { icon: "T", color: "#547281" },
  "ยาแก้พิษ (Antidote)": { icon: "+", color: "#bd4b4b" },
};

const filterOptions = ["ทั้งหมด", "บัญชียาหลัก", "จำกัดการใช้", "มีเกณฑ์ DUE"];

export default function Home() {
  const [data, setData] = useState<DrugData | null>(null);
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ทั้งหมด");
  const [selectedFilter, setSelectedFilter] = useState("ทั้งหมด");
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("./data/drugs.json")
      .then((response) => {
        if (!response.ok) throw new Error("ไม่พบข้อมูล");
        return response.json();
      })
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
      const text = [drug.name, drug.brand, drug.strength, drug.dosageForm, drug.account, drug.groups.join(" "), drug.measure, drug.symptomGroup].join(" ").toLocaleLowerCase("th");
      return groupMatch && filterMatch && (!keyword || text.includes(keyword));
    });
  }, [drugs, query, selectedGroup, selectedFilter]);

  const nedCount = drugs.filter((drug) => drug.groups.includes("ยานอกบัญชียาหลัก (NED)")).length;
  const restrictedCount = drugs.filter((drug) => drug.status === "จำกัดการใช้").length;
  const essentialCount = drugs.filter((drug) => drug.essential).length;
  const chartGroups = groups.filter((group) => group.name !== "กรอบยาโรงพยาบาล").slice(0, 6);
  const chartMax = Math.max(...chartGroups.map((group) => group.count), 1);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="เมนูหลัก">
        <a className="brand" href="#top" aria-label="คลังยา หน้าหลัก">
          <span className="brand-mark"><i /><i /></span><span>คลังยา</span>
        </a>
        <nav>
          <a className="active" href="#top"><span>⌂</span><b>ภาพรวม</b></a>
          <a href="#search"><span>⌕</span><b>ค้นหายา</b></a>
          <a href="#groups"><span>▦</span><b>กลุ่มยา</b></a>
          <a href="#overview"><span>↗</span><b>สรุปข้อมูล</b></a>
        </nav>
        <div className="source-note"><span>i</span><p>ข้อมูลจากเอกสารกรอบบัญชียา โรงพยาบาลบางจาก ปี 2569</p></div>
      </aside>

      <section className="main-content" id="top">
        <header className="topbar">
          <a className="mobile-logo" href="#top"><span className="brand-mark"><i /><i /></span>คลังยา</a>
          <div className="top-actions">
            <span className="sync-state"><i />ข้อมูลจาก PDF {data?.meta.sourceCount ?? 12} ชุด</span>
            <div className="profile"><span>ภส</span><div><strong>โรงพยาบาลบางจาก</strong><small>ฐานข้อมูลยา ปี 2569</small></div></div>
          </div>
        </header>

        <div className="page-wrap">
          <section className="hero" id="search">
            <div className="hero-copy">
              <p className="eyebrow">BANGCHAK HOSPITAL DRUG DIRECTORY</p>
              <h1>ค้นหาข้อมูลยา<br /><em>เร็ว ชัด และครบถ้วน</em></h1>
              <p className="lead">ค้นหาจากชื่อยา ความแรง รูปแบบยา หรือเลือกจากกลุ่มเอกสาร</p>
              <label className="search-box" htmlFor="drug-search">
                <span>⌕</span>
                <input id="drug-search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(12); }} placeholder="เช่น Amoxicillin, Paracetamol, ยาสมุนไพร..." autoComplete="off" />
                {query && <button type="button" onClick={() => { setQuery(""); setVisibleCount(12); }} aria-label="ล้างคำค้น">×</button>}
                <kbd>⌘ K</kbd>
              </label>
            </div>
            <div className="hero-art" aria-hidden="true"><i className="ring ring-one" /><i className="ring ring-two" /><span className="pill pill-one"><i /><i /></span><span className="pill pill-two"><i /><i /></span><span className="tablet">＋</span></div>
          </section>

          {loadError && <div className="error-banner">ไม่สามารถเปิดไฟล์ข้อมูลได้ โปรดตรวจสอบว่าไฟล์ <code>public/data/drugs.json</code> อยู่ในโปรเจกต์</div>}

          <section className="stats-grid" aria-label="สรุปฐานข้อมูล">
            <article><span className="stat-icon green">Rx</span><div><small>รายการยาทั้งหมด</small><strong>{(data?.meta.recordCount ?? 0).toLocaleString("th-TH")}</strong><p>รวมจาก {data?.meta.rawRowCount.toLocaleString("th-TH") ?? 0} แถวข้อมูล</p></div></article>
            <article><span className="stat-icon blue">▦</span><div><small>กลุ่มเอกสาร</small><strong>{groups.length}</strong><p>จาก PDF {data?.meta.sourceCount ?? 0} ไฟล์</p></div></article>
            <article><span className="stat-icon amber">N</span><div><small>รายการ NED</small><strong>{nedCount.toLocaleString("th-TH")}</strong><p>ยานอกบัญชียาหลัก</p></div></article>
            <article><span className="stat-icon red">!</span><div><small>จำกัดการใช้</small><strong>{restrictedCount.toLocaleString("th-TH")}</strong><p>มีมาตรการกำกับ</p></div></article>
          </section>

          <section className="panel category-panel" id="groups">
            <div className="section-head"><div><p className="eyebrow">BROWSE BY SOURCE GROUP</p><h2>ค้นหาตามกลุ่มยา</h2></div><button className="text-action" onClick={() => { setSelectedGroup("ทั้งหมด"); setSelectedFilter("ทั้งหมด"); setVisibleCount(12); }}>ล้างตัวกรอง <span>↻</span></button></div>
            <div className="category-grid">
              <button className={selectedGroup === "ทั้งหมด" ? "selected" : ""} onClick={() => { setSelectedGroup("ทั้งหมด"); setVisibleCount(12); }}><span style={{ color: "#126b5c", background: "#e3f3ee" }}>✣</span><strong>ทุกกลุ่มยา</strong><small>{drugs.length.toLocaleString("th-TH")} รายการ</small></button>
              {groups.map((group) => {
                const style = categoryStyle[group.name] ?? { icon: "Rx", color: "#61746f" };
                return <button key={group.name} className={selectedGroup === group.name ? "selected" : ""} onClick={() => { setSelectedGroup(group.name); setVisibleCount(12); }}><span style={{ color: style.color, background: `${style.color}18` }}>{style.icon}</span><strong title={group.name}>{group.name}</strong><small>{group.count.toLocaleString("th-TH")} รายการ</small></button>;
              })}
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="panel drug-panel">
              <div className="section-head list-head">
                <div><p className="eyebrow">DRUG LIST</p><h2>{query ? `ผลการค้นหา “${query}”` : selectedGroup === "ทั้งหมด" ? "รายการยาทั้งหมด" : selectedGroup}</h2></div>
                <span className="result-count">พบ {filteredDrugs.length.toLocaleString("th-TH")} รายการ</span>
              </div>
              <div className="filter-row" role="group" aria-label="กรองสถานะยา">
                {filterOptions.map((filter) => <button key={filter} className={selectedFilter === filter ? "active" : ""} onClick={() => { setSelectedFilter(filter); setVisibleCount(12); }}>{filter}</button>)}
              </div>
              <div className="table-head" aria-hidden="true"><span>รายการยา</span><span>กลุ่ม</span><span>สถานะ</span><span /></div>
              <div className="drug-list">
                {filteredDrugs.slice(0, visibleCount).map((drug) => {
                  const style = categoryStyle[drug.groups[0]] ?? { color: "#126b5c", icon: "Rx" };
                  return <button className="drug-row" key={drug.id} onClick={() => setSelectedDrug(drug)}>
                    <span className="drug-icon" style={{ color: style.color, background: `${style.color}17` }}>Rx</span>
                    <span className="drug-name"><strong>{drug.name}</strong><small>{[drug.dosageForm, drug.strength, drug.brand].filter(Boolean).join(" · ") || "ไม่ระบุรูปแบบและความแรง"}</small></span>
                    <span className="drug-groups">{drug.groups[0]}{drug.groups.length > 1 && <i>+{drug.groups.length - 1}</i>}</span>
                    <span className={`status ${drug.status === "พร้อมใช้" ? "ready" : drug.status === "มีเกณฑ์ DUE" ? "due" : drug.status === "จำกัดการใช้" ? "restricted" : "special"}`}><i />{drug.status}</span>
                    <span className="row-arrow">›</span>
                  </button>;
                })}
                {!loadError && !data && <div className="loading-state"><span /><span /><span /><span /></div>}
                {data && filteredDrugs.length === 0 && <div className="empty-state"><span>⌕</span><h3>ไม่พบรายการยา</h3><p>ลองตรวจคำสะกด หรือเลือกกลุ่มอื่น</p></div>}
              </div>
              {visibleCount < filteredDrugs.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 20)}>แสดงอีก {Math.min(20, filteredDrugs.length - visibleCount)} รายการ <span>↓</span></button>}
            </div>

            <aside className="panel overview-panel" id="overview">
              <div className="section-head"><div><p className="eyebrow">DATABASE OVERVIEW</p><h2>สัดส่วนกลุ่มเฉพาะ</h2></div></div>
              <div className="bar-chart">
                {chartGroups.map((group) => {
                  const color = categoryStyle[group.name]?.color ?? "#126b5c";
                  return <div className="bar-item" key={group.name}><div><span>{group.name}</span><strong>{group.count}</strong></div><div className="bar-track"><i style={{ width: `${Math.max(9, (group.count / chartMax) * 100)}%`, background: color }} /></div></div>;
                })}
              </div>
              <div className="summary-card"><span>✓</span><div><strong>{essentialCount.toLocaleString("th-TH")} รายการในบัญชียาหลัก</strong><p>{Math.round((essentialCount / Math.max(drugs.length, 1)) * 100)}% ของรายการทั้งหมด</p></div></div>
              <div className="update-card"><span>↻</span><div><strong>ชุดข้อมูลล่าสุด</strong><p>{data?.meta.generatedAt ?? "กำลังโหลด..."}</p></div><i>PDF</i></div>
            </aside>
          </section>

          <footer className="site-footer"><p>ข้อมูลนี้จัดทำเพื่อการสืบค้นภายใน โปรดตรวจสอบเอกสารต้นฉบับและดุลยพินิจของแพทย์หรือเภสัชกรก่อนใช้ยา</p><span>กรอบบัญชียา โรงพยาบาลบางจาก ปี 2569</span></footer>
        </div>
      </section>

      {selectedDrug && <div className="modal-backdrop" onMouseDown={() => setSelectedDrug(null)}>
        <section className="drug-drawer" role="dialog" aria-modal="true" aria-labelledby="drug-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="drawer-close" onClick={() => setSelectedDrug(null)} aria-label="ปิดรายละเอียด">×</button>
          <div className="drawer-head"><span>Rx</span><div><p>{selectedDrug.id}</p><h2 id="drug-title">{selectedDrug.name}</h2><small>{[selectedDrug.brand, selectedDrug.company].filter(Boolean).join(" · ") || "รายการในกรอบบัญชียา"}</small></div></div>
          <div className="tag-list">{selectedDrug.groups.map((group) => <span key={group}>{group}</span>)}</div>
          <div className="detail-grid">
            <div><small>รูปแบบยา</small><strong>{selectedDrug.dosageForm || "ไม่ระบุ"}</strong></div>
            <div><small>ความแรง</small><strong>{selectedDrug.strength || "ไม่ระบุ"}</strong></div>
            <div><small>บัญชียา</small><strong>{selectedDrug.account || "ไม่ระบุ"}</strong></div>
            <div><small>สถานะ</small><strong className="green-text">{selectedDrug.status}</strong></div>
          </div>
          {selectedDrug.symptomGroup && <div className="info-block"><small>กลุ่มอาการ</small><p>{selectedDrug.symptomGroup}</p></div>}
          {selectedDrug.measure && <div className="info-block warning-block"><small>มาตรการที่กำหนด</small><p>{selectedDrug.measure}</p></div>}
          {selectedDrug.dueCriteria && <div className="info-block due-block"><small>เกณฑ์ DUE</small><p>{selectedDrug.dueCriteria}</p></div>}
          {selectedDrug.note && <div className="info-block"><small>หมายเหตุ</small><p>{selectedDrug.note}</p></div>}
          {selectedDrug.drugCode24 && <div className="code-row"><small>รหัสยา 24 หลัก</small><code>{selectedDrug.drugCode24}</code></div>}
          <div className="disclaimer"><span>!</span><p><strong>โปรดตรวจสอบก่อนใช้งาน</strong>รายละเอียดนี้ดึงจากเอกสารต้นฉบับอัตโนมัติ ควรตรวจสอบกับเอกสาร PDF และเภสัชกร</p></div>
          <footer><strong>เอกสารอ้างอิง</strong>{selectedDrug.sourceFiles.map((file, index) => <p key={file}>{file} · หน้า {selectedDrug.sourcePages[index] ?? "-"}</p>)}</footer>
        </section>
      </div>}
    </main>
  );
}
