const LS_SUB = "animal_match_submissions";
const LS_MATCH = "animal_match_matches";

const adminStatus = document.getElementById("adminStatus");
const submissionsBody = document.getElementById("submissionsTable").querySelector("tbody");
const matchesBody = document.getElementById("matchesTable").querySelector("tbody");
const matchInfo = document.getElementById("matchInfo");

function setAdminStatus(t){ adminStatus.textContent = t; }
function readSubmissions(){ return JSON.parse(localStorage.getItem(LS_SUB) || "[]"); }
function readMatches(){ return JSON.parse(localStorage.getItem(LS_MATCH) || "[]"); }
function writeMatches(matchRecord){ localStorage.setItem(LS_MATCH, JSON.stringify(matchRecord)); }

function renderTable(rows){
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

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

/**
 * 같은 동물상(face) + 성별 다른(남/여) 사람끼리 랜덤 매칭
 * - 동의(consent) == '예' 인 사람만 대상
 * - 각 얼굴형 그룹별로 남/여 분리 후 셔플 → 순서대로 페어링
 */
function createRandomMatches(rows){
  const pool = rows.filter(r => r.consent === "예" && r.face && r.gender);
  const faces = ["고양이상","강아지상","하마상","여우상"];
  const pairs = [];

  faces.forEach(face => {
    const males = shuffle(pool.filter(r => r.face===face && r.gender==="남"));
    const females = shuffle(pool.filter(r => r.face===face && r.gender==="여"));
    const n = Math.min(males.length, females.length);
    for (let i=0;i<n;i++){
      pairs.push({ a:males[i], b:females[i], rule:`${face} + 성별 다름` });
    }
  });

  return pairs;
}

function renderMatches(pairs){
  matchesBody.innerHTML = "";
  pairs.forEach((p,idx)=>{
    const fmt = x => `${x.name||"-"}/${x.gender||"-"}/${x.grade||"-"}/${x.face||"-"}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx+1}</td><td>${fmt(p.a)}</td><td>${fmt(p.b)}</td><td>${p.rule}</td>`;
    matchesBody.appendChild(tr);
  });
}

function refresh(){
  setAdminStatus("불러오는 중…");
  renderTable(readSubmissions());
  const saved = readMatches();
  if (saved && saved.pairs){
    renderMatches(saved.pairs);
    matchInfo.textContent = saved.timestamp ? `최근 매칭: ${new Date(saved.timestamp).toLocaleString()}` : "";
  } else {
    matchesBody.innerHTML = "";
    matchInfo.textContent = "";
  }
  setAdminStatus("대기 중");
}

document.getElementById("refreshBtn").addEventListener("click", refresh);

document.getElementById("matchBtn").addEventListener("click", ()=>{
  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.remove("hidden");
  setAdminStatus("매칭 중…");

  setTimeout(()=>{
    const pairs = createRandomMatches(readSubmissions());
    renderMatches(pairs);
    // 매칭 결과 저장 (관리자 페이지에서 항상 볼 수 있게)
    writeMatches({ timestamp: new Date().toISOString(), pairs });
    matchInfo.textContent = `최근 매칭: ${new Date().toLocaleString()}`;

    overlay.classList.add("hidden");
    setAdminStatus("대기 중");
  }, 4000);
});

document.getElementById("clearBtn").addEventListener("click", ()=>{
  if (confirm("정말 제출 데이터를 모두 삭제할까요? (이 브라우저)")) {
    localStorage.removeItem(LS_SUB);
    submissionsBody.innerHTML = "";
    alert("제출 데이터를 삭제했습니다.");
  }
});

document.getElementById("clearMatchBtn").addEventListener("click", ()=>{
  if (confirm("매칭 기록(최근 1회)을 삭제할까요? (이 브라우저)")) {
    localStorage.removeItem(LS_MATCH);
    matchesBody.innerHTML = "";
    matchInfo.textContent = "";
    alert("매칭 기록을 삭제했습니다.");
  }
});

document.getElementById("exportCsvBtn").addEventListener("click", ()=>{
  const rows = readSubmissions();
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
