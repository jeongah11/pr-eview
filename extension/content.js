// content script — GitHub PR / compare 페이지에 주입
// F-01 드래그 해설: 코드를 드래그하면 [AI 해설] 버튼이 뜨고, 누르면 말풍선으로 설명을 보여줍니다.

console.log("[PReview] content script 주입됨:", location.pathname);

let selectedText = ""; // 드래그한 텍스트를 버튼 클릭 시점까지 보관
let btn = null; // 떠다니는 [AI 해설] 버튼
let popup = null; // 결과 말풍선

// 버튼/말풍선 요소를 (없으면) 만들어 둡니다.
function ensureEls() {
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "preview-explain-btn";
    btn.className = "preview-ui";
    btn.textContent = "🔍 AI 해설";
    btn.addEventListener("click", onExplainClick);
    document.body.appendChild(btn);
  }
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "preview-popup";
    popup.className = "preview-ui";
    popup.style.display = "none";
    document.body.appendChild(popup);
  }
}

// 페이지 좌표(스크롤 포함)로 위치를 잡습니다. getBoundingClientRect는 화면 기준이라 스크롤을 더해줍니다.
function showBtnAt(rect) {
  ensureEls();
  btn.style.top = window.scrollY + rect.bottom + 6 + "px";
  btn.style.left = window.scrollX + rect.left + "px";
  btn.style.display = "block";
}

function hideBtn() {
  if (btn) btn.style.display = "none";
}

function hidePopup() {
  if (popup) popup.style.display = "none";
}

// 드래그가 끝나면(mouseup) 선택 텍스트를 확인해 버튼을 띄웁니다.
document.addEventListener("mouseup", (e) => {
  // 우리 UI(버튼·말풍선) 안에서의 클릭은 무시
  if (e.target.closest && e.target.closest(".preview-ui")) return;

  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : "";
  if (!text) {
    hideBtn();
    return;
  }
  selectedText = text;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  showBtnAt(rect);
});

// 빈 곳을 누르면 말풍선을 닫습니다.
document.addEventListener("mousedown", (e) => {
  if (e.target.closest && e.target.closest(".preview-ui")) return;
  hidePopup();
});

// [AI 해설] 클릭 → background에 해설 요청 → 말풍선 표시
async function onExplainClick() {
  hideBtn();
  showPopup("🔍 해설 생성 중...");
  try {
    const res = await chrome.runtime.sendMessage({
      action: "ai",
      type: "explain",
      text: selectedText,
    });
    if (!res) return showPopup("확장을 새로고침해 주세요.");
    if (res.error === "NO_KEY") return showPopup("API 키가 없어 설정 화면을 열었어요. 키를 저장한 뒤 다시 시도하세요.");
    if (res.error) return showPopup("오류: " + res.error);
    showPopup(res.text);
  } catch (e) {
    showPopup("통신 실패: " + e.message);
  }
}

// 말풍선을 버튼이 있던 자리 근처에 띄웁니다.
function showPopup(content) {
  ensureEls();
  popup.innerHTML = "";

  const close = document.createElement("span");
  close.className = "preview-popup-close";
  close.textContent = "✕";
  close.addEventListener("click", hidePopup);

  const body = document.createElement("div");
  body.className = "preview-popup-body";
  body.textContent = content;

  popup.appendChild(close);
  popup.appendChild(body);

  // 버튼 위치(있었다면)를 기준으로 배치
  popup.style.top = btn.style.top || window.scrollY + 100 + "px";
  popup.style.left = btn.style.left || window.scrollX + 100 + "px";
  popup.style.display = "block";
}

// Esc 로 말풍선 닫기
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hidePopup();
});
