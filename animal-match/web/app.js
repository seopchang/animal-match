const LS_SUB = "animal_match_submissions";
const LS_MATCH_LOG = "animal_match_matchlog"; // 관리자용 매칭 기록(누적)

const form = document.getElementById("entryForm");
const statusEl = document.getElementById("status");
const formPanel = document.getElementById("formPanel");
const resultCard = document.getElementById("resultCard");
const meNameEl = document.getElementById("meName");
const partnerNameEl = document.getElementById("partnerName");
const partnerDetailEl = document.getElementById("partnerDetail");
const overlay = document.getElementById("loadingOverlay");
const retryBtn = document.getElementById("retryBtn");

function setStatus(t){ statusEl.textContent = t; }
function readSubs(){ return JSON.parse(localStorage.getItem(LS_SUB) || "[]"); }
function writeSubs(arr){ localStorage.setItem(LS_SUB, JSON.stringify(arr)); }
function readMatchLog(){ return JSON.parse(localStorage.getItem(LS_MATCH_LOG) || "[]"); }
function writeMatchLog(log){ localStorage.setItem(LS_MATCH_LOG, JSON.stringify(log)); }

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function getFormData(){
  const consentInput = form.querySelector('input[name="consent"]:checked');
  return {
    timestamp: new Date().toISOString(),
    name:  form.name.value.trim(),
    gender:form.gender.value.trim(),
    grade: form.grade.value.trim(),
    face:  form.face.value.trim(),
    intro: form.intro.value.trim(),
    consent: consentInput ? consentInput.value : ""
  };
}

function saveSubmission(row){
  const arr = readSubs();
  arr.push(row);
  writeSubs(arr);
}

function findPartnerFor(me, all){
  // 같은 얼굴형 + 성별 다른 + 동의 '예' + (본인 제외)
  const pool = all.filter(p =>
    p !== me &&
    p.consent === "예" &&
    p.face === me.face &&
    p.gender && me.gender && p.gender !== me.gender
  );
  if (pool.length === 0) return null;
  shuffle(pool);
  return pool[0]; // 랜덤 1명
}

function showOverlay(){ overlay.classList.remove("hidden"); }
function hideOverlay(){ overlay.classList.add("hidden"); }

function showResult(me, partner){
  meNameEl.textContent = me.name || "나";
  if (partner){
    partnerNameEl.textContent = partner.name || "상대";
    partnerDetailEl.innerHTML = `
      <div><b>상대 정보</b></div>
      <div>이름: ${partner.name||"-"}</div>
      <div>성별: ${partner.gender||"-"}</div>
      <div>학년: ${partner.grade||"-"}</div>
      <div>얼굴형: ${partner.face||"-"}</div>
      <div>자기소개: ${(partner.intro||"").replaceAll("<","&lt;")}</div>
    `;
  }else{
    partnerNameEl.textContent = "상대 없음";
    partnerDetailEl.innerHTML = `
      <div>아직 매칭 가능한 상대가 없습니다.</div>
      <div>조금 후에 다시 시도해 주세요.</div>
    `;
  }

  formPanel.style.display = "none";
  resultCard.style.display = "grid";
}

retryBtn.addEventListener("click", ()=>{
  // 다시하기 → 처음 화면 초기화
  form.reset();
  setStatus("대기 중");
  resultCard.style.display = "none";
  formPanel.style.display = "";
});

form.addEventListener("submit", (e)=>{
  e.preventDefault();
  const me = getFormData();

  if (!me.name || !me.gender || !me.grade || !me.face || !me.intro || !me.consent){
    alert("모든 항목을 입력/선택해 주세요.");
    return;
  }

  // 저장(동의 '아니요'도 저장)
  saveSubmission(me);
  setStatus("제출됨. 매칭 준비…");

  if (me.consent !== "예"){
    alert("촬영/활용 동의자만 매칭이 가능합니다. (데이터는 저장되었습니다)");
    // 결과 카드(상대 없음)로 안내
    showResult(me, null);
    return;
  }

  // 동의자 → 로딩오버레이(4초) → 매칭 시도
  showOverlay();
  setTimeout(()=>{
    const all = readSubs();
    const partner = findPartnerFor(me, all);

    // 매칭 기록(관리자용) 누적 저장
    const log = readMatchLog();
    log.push({ timestamp:new Date().toISOString(), a:me, b:partner, rule:"같은 동물상 + 성별 다름" });
    writeMatchLog(log);

    hideOverlay();
    showResult(me, partner);
  }, 4000);
});
