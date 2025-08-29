const form = document.getElementById("joinForm");
const state = document.getElementById("state");
const result = document.getElementById("result");
const meName = document.getElementById("meName");
const partnerName = document.getElementById("partnerName");
const animalType = document.getElementById("animalType");
const matchId = document.getElementById("matchId");
const btnReset = document.getElementById("btnReset");

let polling = null;
let participantId = null;

function setState(text) {
  state.textContent = text;
  state.classList.remove("hidden");
}

function showResult(payload) {
  meName.textContent = payload.me.name;
  partnerName.textContent = payload.partner.name;
  animalType.textContent = payload.animal;
  matchId.textContent = payload.match_id;
  result.classList.remove("hidden");
  state.classList.add("hidden");
}

async function pollAwait() {
  if (!participantId) return;
  try {
    const res = await fetch(`/await?pid=${participantId}`);
    const data = await res.json();
    if (data.ok && data.status === "matched") {
      clearInterval(polling);
      polling = null;
      showResult(data.data);
    } else {
      setState("매칭중... (상대 대기)");
    }
  } catch (e) {
    // 네트워크 에러 시 자동 재시도
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  result.classList.add("hidden");
  const name = document.getElementById("name").value.trim();
  const animal = document.getElementById("animal").value.trim();
  if (!name || !animal) return;

  setState("참가 등록 중...");
  try {
    const res = await fetch("/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, animal }),
    });
    const data = await res.json();
    if (!data.ok) {
      setState("오류: " + (data.error || "UNKNOWN"));
      return;
    }
    if (data.status === "matched") {
      showResult(data.data);
    } else {
      participantId = data.participant_id;
      setState("매칭중... (상대 대기)");
      if (polling) clearInterval(polling);
      polling = setInterval(pollAwait, 1000);
    }
  } catch (e) {
    setState("네트워크 오류");
  }
});

btnReset.addEventListener("click", async () => {
  await fetch("/reset", { method: "POST" });
  participantId = null;
  result.classList.add("hidden");
  setState("초기화 완료. 새로 매칭해 보세요!");
});
