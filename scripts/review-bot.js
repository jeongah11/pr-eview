// PReview 리뷰 시동 봇 (F-06)
// PR이 열리면 diff를 읽어 "집중해서 볼 포인트 + 리뷰 질문 + 이해 점검 퀴즈"를
// 시니어 개발자 페르소나로 댓글에 남깁니다. (요약은 하지 않습니다 — 그건 확장/CLAUDE.md 담당)
//
// 실행 환경: GitHub Actions (Node 20). 필요한 환경변수(워크플로에서 주입):
//   GITHUB_TOKEN       - 자동 제공 (댓글 작성용)
//   GITHUB_REPOSITORY  - "owner/repo" (자동)
//   GITHUB_EVENT_PATH  - 이벤트 payload 경로 (자동)
//   GEMINI_API_KEY     - 저장소 Secret 에 등록한 Gemini 키

const fs = require("fs");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPO = process.env.GITHUB_REPOSITORY;
const EVENT_PATH = process.env.GITHUB_EVENT_PATH;

const MODEL = "gemini-flash-lite-latest";
const MAX_DIFF_CHARS = 12000; // diff가 너무 길면 앞부분만 사용

function fail(msg) {
  console.error(`[review-bot] ${msg}`);
  process.exit(1);
}

async function main() {
  if (!GITHUB_TOKEN) fail("GITHUB_TOKEN 이 없습니다.");
  if (!GEMINI_API_KEY) fail("GEMINI_API_KEY 시크릿이 없습니다. 저장소 Settings > Secrets 에 등록하세요.");
  if (!REPO || !EVENT_PATH) fail("GitHub Actions 환경변수가 없습니다.");

  const [owner, repo] = REPO.split("/");
  const event = JSON.parse(fs.readFileSync(EVENT_PATH, "utf8"));
  const pr = event.pull_request;
  if (!pr) fail("이벤트에서 pull_request 를 찾지 못했습니다.");

  console.log(`[review-bot] PR #${pr.number} (${pr.title}) diff 수집 중...`);
  const diff = await getDiff(owner, repo, pr.number);
  const trimmed = diff.length > MAX_DIFF_CHARS ? diff.slice(0, MAX_DIFF_CHARS) + "\n...(생략)" : diff;

  console.log("[review-bot] Gemini 분석 중...");
  const review = await askGemini(pr.title, trimmed);

  console.log("[review-bot] 댓글 작성 중...");
  await postComment(owner, repo, pr.number, review);
  console.log("[review-bot] 완료.");
}

// PR의 통합 diff 텍스트
async function getDiff(owner, repo, num) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3.diff",
      "User-Agent": "preview-bot",
    },
  });
  if (!res.ok) fail(`diff 요청 실패: ${res.status} ${await res.text()}`);
  return await res.text();
}

// 시니어 개발자 페르소나로 리뷰 시동 댓글 본문 생성
async function askGemini(title, diff) {
  const system =
    "당신은 후배 개발자들의 코드 리뷰를 돕는 따뜻하고 노련한 시니어 개발자입니다. " +
    "코드를 요약하지 말고, 리뷰어들이 '무엇을 어떻게 봐야 할지' 짚어 주세요. " +
    "다음 한국어 마크다운 형식으로만 답하세요:\n\n" +
    "### 🔍 집중해서 볼 포인트\n- (특히 확인할 변경점 2~4개, 각 한 줄, 왜 중요한지 포함)\n\n" +
    "### 💬 이런 걸 물어보면 좋아요\n- (작성자에게 던질 리뷰 질문 2~3개)\n\n" +
    "### 🧠 이해 점검 (권장, 답은 선택)\n- (이 변경을 이해했는지 확인하는 질문 3개)";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: `PR 제목: ${title}\n\ndiff:\n${diff}` }] }],
      }),
    }
  );
  if (!res.ok) fail(`Gemini 요청 실패: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) fail("Gemini 응답이 비어 있습니다.");

  return [
    "🤖 **PReview 리뷰 봇**이에요. 리뷰 시작에 참고하세요!",
    "",
    text,
    "",
    "---",
    "> 이 댓글 스레드에 대댓글로 리뷰를 진행하면 그대로 리뷰 기록이 됩니다.",
  ].join("\n");
}

// PR(=이슈)에 댓글 작성
async function postComment(owner, repo, num, body) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${num}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "preview-bot",
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) fail(`댓글 작성 실패: ${res.status} ${await res.text()}`);
}

main().catch((e) => fail(e.stack || String(e)));
