const apiKeyInput = document.getElementById("apiKey");
const statusEl = document.getElementById("status");

// 저장돼 있던 키를 불러와 입력창에 채웁니다.
chrome.storage.local.get(["apiKey"]).then(({ apiKey }) => {
  if (apiKey) apiKeyInput.value = apiKey;
});

// 저장 버튼: 입력값을 브라우저 저장소에 넣습니다.
document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.local.set({ apiKey: apiKeyInput.value.trim() });
  statusEl.textContent = "저장됐습니다.";
  setTimeout(() => (statusEl.textContent = ""), 2000);
});

// 연결 테스트: background에 샘플 코드를 보내 Gemini 응답을 받아 화면에 표시
const testResult = document.getElementById("testResult");
document.getElementById("test").addEventListener("click", async () => {
  // 1) 키가 저장돼 있는지부터 확인
  const { apiKey } = await chrome.storage.local.get(["apiKey"]);
  if (!apiKey) {
    testResult.textContent = "저장된 키가 없습니다. 위에 키를 넣고 [저장]을 먼저 누르세요.";
    return;
  }

  testResult.textContent = "요청 중... (최대 30초 대기)";
  const started = Date.now();
  try {
    // 2) background가 끝내 응답 안 하면 35초 후 강제로 실패 처리 → 무한 대기 방지
    const res = await Promise.race([
      chrome.runtime.sendMessage({
        action: "ai",
        type: "explain",
        text: "const sum = (a, b) => a + b;",
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("background 무응답 (35초)")), 35000)
      ),
    ]);
    const sec = ((Date.now() - started) / 1000).toFixed(1);
    console.log("[PReview options] 응답:", res);

    if (res === undefined) {
      testResult.textContent =
        "응답이 undefined 입니다. background 리스너가 없다는 뜻 → 확장 새로고침 필요.";
      return;
    }
    testResult.textContent =
      (res.error ? "오류: " + res.error : res.text) + `\n\n(응답 ${sec}초)`;
  } catch (e) {
    testResult.textContent =
      "통신 실패: " + e.message +
      "\n(chrome://extensions 에서 PReview 새로고침 → 옵션 탭 닫았다 새로 열기)";
  }
});

// 사용 가능 모델 목록 보기
document.getElementById("listModels").addEventListener("click", async () => {
  testResult.textContent = "모델 목록 가져오는 중...";
  try {
    const res = await chrome.runtime.sendMessage({ action: "listModels" });
    if (!res) return (testResult.textContent = "응답 없음 → 확장 새로고침 필요");
    if (res.error) return (testResult.textContent = "오류: " + res.error);
    testResult.textContent =
      "generateContent 지원 모델:\n- " + res.models.join("\n- ");
  } catch (e) {
    testResult.textContent = "통신 실패: " + e.message;
  }
});
