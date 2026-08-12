// 백그라운드 서비스 워커
// content script는 CORS 때문에 외부 API를 직접 못 부릅니다.
// 그래서 AI 호출은 전부 여기(background)에서 대신 합니다.
// content ↔ background 는 chrome.runtime.sendMessage 로 주고받습니다.

// 사용할 Gemini 모델. "사용 가능 모델 보기"로 확인한 이름으로 맞추세요.
const MODEL = "gemini-flash-lite-latest";
const ENDPOINT = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

// 이 키로 generateContent를 지원하는 모델 목록을 가져옵니다.
async function listModels() {
  const { apiKey } = await chrome.storage.local.get(["apiKey"]);
  if (!apiKey) return { error: "NO_KEY" };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!res.ok) return { error: `모델 목록 오류 ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const data = await res.json();
    const names = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));
    return { models: names };
  } catch (e) {
    return { error: `네트워크 오류: ${e.message}` };
  }
}

// 기능별 지시문(시스템 프롬프트). content.js 가 type 으로 골라 보냅니다.
const PROMPTS = {
  // 드래그 해설: 선택한 코드 조각 풀이
  explain:
    "당신은 프론트엔드 초보를 돕는 조수입니다. 사용자가 GitHub PR에서 드래그한 코드 조각을 " +
    "한국어로 쉽게 풀어 설명하세요. 무엇을 하는 코드인지 2~4문장으로 말하고, " +
    "초보가 모를 만한 API·문법·패턴이 있으면 짧게 덧붙이세요.",
  // 파일 요약: 파일 하나의 변경을 한 줄로
  fileSummary:
    "당신은 코드 리뷰 조수입니다. 아래 한 파일의 변경(diff)을 한국어 한 줄로 요약하세요. " +
    "'이 파일 = ...' 형식으로 20자 내외, 군더더기 없이.",
  // 질문 도우미: 리뷰 질문 초안
  question:
    "당신은 코드 리뷰 조수입니다. 아래 코드 변경을 보고, 리뷰어가 작성자에게 물어볼 만한 " +
    "정중한 한국어 질문 1개를 초안으로 쓰세요. 질문만 출력하세요.",
  // PR 본문 초안: 작성자용
  prBody:
    "당신은 코드 리뷰 조수입니다. 아래 커밋/변경 내용을 보고 GitHub PR 본문 초안을 " +
    "한국어 마크다운으로 쓰세요. 형식: '## 목적', '## 주요 변경점', " +
    "'## 코드 설명 (어떻게 동작하나)', '## 리뷰 포인트 / 고민한 점'.",
};

// 실제 Gemini 호출
async function callAI(type, userText) {
  const { apiKey } = await chrome.storage.local.get(["apiKey"]);

  // 키가 없으면: 옵션 페이지를 자동으로 열어 입력을 유도
  if (!apiKey) {
    chrome.runtime.openOptionsPage();
    return { error: "NO_KEY" };
  }

  const system = PROMPTS[type];
  if (!system) return { error: "알 수 없는 요청 종류입니다: " + type };

  console.log("[PReview] AI 요청 시작:", type);

  // 30초 넘으면 무한 대기 대신 에러로 끝냅니다.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(ENDPOINT(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: userText }] }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log("[PReview] AI 오류:", res.status, detail);
      return { error: `AI 오류 ${res.status}: ${detail.slice(0, 200)}` };
    }

    const data = await res.json();
    // Gemini 응답에서 텍스트 꺼내기
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    console.log("[PReview] AI 응답 완료");
    return { text: text || "(빈 응답)" };
  } catch (e) {
    const msg = e.name === "AbortError" ? "시간 초과(30초)" : e.message;
    console.log("[PReview] 호출 실패:", msg);
    return { error: `네트워크 오류: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

// content.js / options.js 에서 온 메시지 처리
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.action === "ai") {
    callAI(msg.type, msg.text).then(sendResponse);
    return true; // 비동기 응답을 쓰겠다는 신호
  }
  if (msg && msg.action === "listModels") {
    listModels().then(sendResponse);
    return true;
  }
});
