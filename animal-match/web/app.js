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

function setStatus(t){ if(statusEl) statusEl.textContent = t; }
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
    consent: consentInput ? consentInput.value : "" // 매칭 조건에는 사용 안 함
  };
}

function saveSubmission(row){
  const arr = readSubs();
  arr.push(row);
  writeSubs(arr);
}

/**
 * 항상 파트너를 고르는 함수 (본인 제외).
 * 버킷 우선순위:
 * 1) 같은 얼굴형 + 성별 다름
 * 2) 같은 얼굴형 (성별 무관)
 * 3) 얼굴형 다름 + 성별 다름
 * 4) 그 외 아무나
 * 아무 버킷도 없으면 null (즉, 본인만 있는 경우)
 */
function pickPartnerAlways(me, all){
  const candidates = all.filter(p => p !== me); // 본인 제외
  if (candidates.length === 0) return { partner: null, rule: "상대 없음" };

  const sameFace = c => c.face === me.face;
  const diffFace = c => c.face && me.face && c.face !== me.face;
  const diffGender = c => c.gender && me.gender && c.gender !== me.gender;

  const buckets = [
    { rule: "같은 얼굴형 + 성별 다름", list: [] },
    { rule: "같은 얼굴형",             list: [] },
    { rule: "얼굴형 다름 + 성별 다름", list: [] },
    { rule: "아무나",                   list: [] },
  ];

  for (const c of candidates){
    if (sameFace(c) && diffGender(c)) { buckets[0].list.push(c); continue; }
    if (sameFace(c))                  { buckets[1].list.push(c); continue; }
    if (diffFace(c) && diffGender(c)) { buckets[2].list.push(c); continue; }
    buckets[3].list.push(c);
  }

  for (const b of buckets){
    if (b.list.length > 0){
      shuffle(b.list);
      return { partner: b.list[0], rule: b.rule };
    }
  }
  return { partner: null, rule: "상대 없음" };
}

function showOverlay(){ overlay.classList.remove("hidden"); }
function hideOverlay(){ overlay.classList.add("hidden"); }

function showResult(me, partner, rule){
  meNameEl.textContent = me.name || "나";
  if (partner){
    partnerNameEl.textContent = partner.name || "상대";
    partnerDetailEl.innerHTML = `
      <div><b>매칭 기준</b>: ${rule}</div>
      <div style="margin-top:8px"><b>상대 정보</b></div>
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

  // 저장 (동의 '아니요'도 저장)
  saveSubmission(me);
  setStatus("저장 완료! 매칭을 시작합니다…");

  // 로딩 4초 후 항상 매칭 시도
  showOverlay();
  setTimeout(()=>{
    const all = readSubs();
    const { partner, rule } = pickPartnerAlways(me, all);

    // 매칭 기록(누적) 저장 (관리자 페이지에서 항상 볼 수 있음)
    const log = readMatchLog();
    log.push({ timestamp:new Date().toISOString(), a:me, b:partner, rule: partner ? rule : "상대 없음" });
    writeMatchLog(log);

    hideOverlay();
    showResult(me, partner, rule);
  }, 4000);
});
