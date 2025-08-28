const LS_SUB = "animal_match_submissions";
const statusEl = document.getElementById("status");
const form = document.getElementById("entryForm");

function setStatus(t){ statusEl.textContent = t; }

function getFormData(){
  return {
    timestamp: new Date().toISOString(),
    name:  form.name.value.trim(),
    gender:form.gender.value.trim(),
    grade: form.grade.value.trim(),
    face:  form.face.value.trim(),
    intro: form.intro.value.trim(),
    consent: (form.querySelector('input[name="consent"]:checked')||{}).value || ""
  };
}

function saveLocal(row){
  const arr = JSON.parse(localStorage.getItem(LS_SUB) || "[]");
  arr.push(row);
  localStorage.setItem(LS_SUB, JSON.stringify(arr));
}

form.addEventListener("submit", (e)=>{
  e.preventDefault();
  const data = getFormData();

  if (!data.name || !data.gender || !data.grade || !data.face || !data.intro || !data.consent){
    alert("모든 항목을 입력/선택해 주세요.");
    return;
  }

  // 동의가 '아니요'여도 저장은 함 (매칭에서는 자동 제외됨)
  saveLocal(data);
  setStatus("제출 완료! (이 브라우저에 저장됨)");
  alert("제출되었습니다! 감사합니다.");
  form.reset();
});
