const LS_KEY = "animal_match_submissions";
const adminStatus = document.getElementById("adminStatus");
const submissionsTable = document.getElementById("submissionsTable").querySelector("tbody");
const matchesTable = document.getElementById("matchesTable").querySelector("tbody");

function setAdminStatus(t){ adminStatus.textContent = t; }
function readLocal(){ return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }

function renderTable(rows){
  submissionsTable.innerHTML = "";
  rows.forEach((r, i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${r.timestamp ? new Date(r.timestamp).toLocaleString() : "-"}</td>
      <td>${r.gender||"-"}</td>
      <td>${r.grade||"-"}</td>
      <td>${r.face||"-"}</td>
      <td>${r.consent||"-"}</td>
      <td>${(r.intro||"").replaceAll("<","&lt;")}</td>
    `;
    submissionsTable.appendChild(tr);
  });
}

function simpleMatch(rows){
  const pool = rows.filter(r => r.consent === "예"); // 동의자만
  const used = new Set();
  const pairs = [];

  // 1) 얼굴형 동일 + 성별 다름
  for (let i=0;i<pool.length;i++){
    if (used.has(i)) continue;
    for (let j=i+1;j<pool.length;j++){
      if (used.has(j)) continue;
      const a = pool[i], b = pool[j];
      if (a.face === b.face && a.gender && b.gender && a.gender !== b.gender){
        used.add(i); used.add(j);
        pairs.push({ a, b, rule:"얼굴형 동일 + 성별 다름" });
        break;
      }
    }
  }

  // 2) 남은 사람들: 얼굴형만 동일
  const remain = pool.map((r,k)=>({r,k})).filter(x => !used.has(x.k));
  for (let i=0;i<remain.length;i++){
    if (used.has(remain[i].k)) continue;
    for (let j=i+1;j<remain.length;j++){
      if (used.has(remain[j].k)) continue;
      if (remain[i].r.face === remain[j].r.face){
        used.add(remain[i].k); used.add(remain[j].k);
        pairs.push({ a:remain[i].r, b:remain[j].r, rule:"얼굴형 동일" });
        break;
      }
    }
  }
  return pairs;
}

function renderMatches(pairs){
  matchesTable.innerHTML = "";
  pairs.forEach((p, idx)=>{
    const fmt = (x)=> `${x.gender||"-"}/${x.grade||"-"}/${x.face||"-"}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${fmt(p.a)}</td>
      <td>${fmt(p.b)}</td>
      <td>${p.rule}</td>
    `;
    matchesTable.appendChild(tr);
  });
}

document.getElementById("refreshBtn").addEventListener("click", ()=>{
  setAdminStatus("불러오는 중…");
  const rows = readLocal();
  renderTable(rows);
  setAdminStatus("대기 중");
});

// ✅ 4초 로딩 오버레이 + 매칭
document.getElementById("matchBtn").addEventListener("click", ()=>{
  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.remove("hidden");
  setAdminStatus("매칭 중…");

  setTimeout(()=>{
    const rows = readLocal();
    const pairs = simpleMatch(rows);
    renderMatches(pairs);

    overlay.classList.add("hidden");
    setAdminStatus("대기 중");
  }, 4000); // 4초
});

document.getElementById("exportCsvBtn").addEventListener("click", ()=>{
  const rows = readLocal();
  const header = ["timestamp","gender","grade","face","intro","consent"];
  const lines = [header.join(",")].concat(
    rows.map(r => header.map(h => `"${(r[h]||"").toString().replaceAll('"','""')}"`).join(","))
  );
  const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "submissions.csv"; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("clearBtn").addEventListener("click", ()=>{
  if (confirm("정말 이 브라우저의 모든 제출 데이터를 삭제할까요?")) {
    localStorage.removeItem(LS_KEY);
    submissionsTable.innerHTML = "";
    matchesTable.innerHTML = "";
    alert("삭제했습니다.");
  }
});

// 초기 로드
(function init(){
  const rows = readLocal();
  renderTable(rows);
})();
