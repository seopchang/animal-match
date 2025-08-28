const LS_SUB = "animal_match_submissions";
const LS_MATCH_LOG = "animal_match_matchlog";

const adminStatus = document.getElementById("adminStatus");
const submissionsBody = document.getElementById("submissionsTable").querySelector("tbody");
const matchesBody = document.getElementById("matchesTable").querySelector("tbody");

function setAdminStatus(t){ adminStatus.textContent = t; }
function readSubs(){ return JSON.parse(localStorage.getItem(LS_SUB) || "[]"); }
function readMatchLog(){ return JSON.parse(localStorage.getItem(LS_MATCH_LOG) || "[]"); }

function renderSubs(rows){
  submissionsBody.innerHTML = "";
  rows.forEach((r,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${r.timestamp ? new Date(r.timestamp).toLocaleString() : "-"}</td>
      <td>${r.name||"-"}</td>
      <td>${r.gender||"-"}</td>
      <td>${r.grade||"-"}</td>
      <td>${r.face||"-"}</td>
      <td>${r.consent||"-"}</td>
      <td>${(r.intro||"").replaceAll("<","&lt;")}</td>
    `;
    submissionsBody.appendChild(tr);
  });
}

function fmtRow(x){ return `${x?.name||"-"}/${x?.gender||"-"}/${x?.grade||"-"}/${x?.face||"-"}`; }

function renderMatchLog(log){
  matchesBody.innerHTML = "";
  log.forEach((m,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${m.timestamp ? new Date(m.timestamp).toLocaleString() : "-"}</td>
      <td>${fmtRow(m.a)}</td>
      <td>${m.b ? fmtRow(m.b) : "(상대 없음)"}</td>
      <td>${m.rule||"-"}</td>
    `;
    matchesBody.appendChild(tr);
  });
}

function refresh(){
  setAdminStatus("불러오는 중…");
  renderSubs(readSubs());
  renderMatchLog(readMatchLog());
  setAdminStatus("대기 중");
}

document.getElementById("refreshBtn").addEventListener("click", refresh);
document.getElementById("clearBtn").addEventListener("click", ()=>{
  if (confirm("제출 데이터를 모두 삭제할까요? (이 브라우저)")){
    localStorage.removeItem(LS_SUB);
    refresh();
    alert("제출 데이터를 삭제했습니다.");
  }
});
document.getElementById("clearMatchBtn").addEventListener("click", ()=>{
  if (confirm("매칭 기록(누적)을 삭제할까요? (이 브라우저)")){
    localStorage.removeItem(LS_MATCH_LOG);
    refresh();
    alert("매칭 기록을 삭제했습니다.");
  }
});
document.getElementById("exportCsvBtn").addEventListener("click", ()=>{
  const rows = readSubs();
  const header = ["timestamp","name","gender","grade","face","intro","consent"];
  const lines = [header.join(",")].concat(
    rows.map(r => header.map(h => `"${(r[h]||"").toString().replaceAll('"','""')}"`).join(","))
  );
  const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "submissions.csv"; a.click();
  URL.revokeObjectURL(url);
});

// 초기 로드
refresh();
