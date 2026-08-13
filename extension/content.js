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

// ── F-02 파일별 요약 ─────────────────────────────────────────
// 변경된 각 파일 헤더에 [🔍 요약] 버튼을 붙이고, 누르면 그 파일 diff를 요약합니다.
// GitHub는 CSS-module로 클래스 이름이 해시(예: Diff-module__diff__rx9XH)라,
// [class*="..."] 부분 일치로 잡습니다. 구버전(.file) view도 fallback으로 지원.

function findFileBlocks() {
  const nb = document.querySelectorAll('[class*="Diff-module__diffTargetable"]');
  if (nb.length) return { blocks: nb, mode: "new" };
  return { blocks: document.querySelectorAll(".file"), mode: "classic" };
}
function getFileHeader(block, mode) {
  return mode === "new"
    ? block.querySelector('[class*="DiffFileHeader-module__diff-file-header"]')
    : block.querySelector(".file-header");
}
function getFileDiffText(block, mode) {
  const el =
    mode === "new"
      ? block.querySelector('[class*="DiffLines-module__"]')
      : block.querySelector(".diff-table, .js-file-content");
  return (el ? el.innerText : block.innerText).slice(0, 4000);
}

let lastFileCount = -1;
function enhanceFiles() {
  const { blocks, mode } = findFileBlocks();
  if (blocks.length !== lastFileCount) {
    console.log("[PReview] 파일 감지:", blocks.length, "(" + mode + ")");
    lastFileCount = blocks.length;
  }
  blocks.forEach((block) => {
    if (block.dataset.previewDone) return; // 이미 처리한 파일은 건너뜀
    const header = getFileHeader(block, mode);
    if (!header) return;
    block.dataset.previewDone = "1";

    const wrap = document.createElement("span");
    wrap.className = "preview-file-badge preview-ui";

    const btn2 = document.createElement("button");
    btn2.className = "preview-file-btn";
    btn2.textContent = "🔍 요약";

    const out = document.createElement("span");
    out.className = "preview-file-summary";

    btn2.addEventListener("click", async () => {
      out.textContent = " 요약 중...";
      const diffText = getFileDiffText(block, mode);
      const res = await chrome.runtime.sendMessage({
        action: "ai",
        type: "fileSummary",
        text: diffText,
      });
      if (!res) return (out.textContent = " (확장 새로고침 필요)");
      if (res.error === "NO_KEY") return (out.textContent = " (API 키 설정 필요)");
      out.textContent = res.error ? " 오류: " + res.error : " " + res.text;
    });

    wrap.appendChild(btn2);
    wrap.appendChild(out);
    header.appendChild(wrap);
  });
}

// ── F-03 질문 도우미 ─────────────────────────────────────────
// 리뷰 코멘트 입력창(textarea) 옆에 [✨ 질문] 버튼을 붙이고,
// 누르면 코드 맥락으로 질문 초안을 만들어 입력창에 넣습니다.

function isCommentTextarea(t) {
  const hay = (
    (t.placeholder || "") + " " + (t.getAttribute("aria-label") || "") + " " +
    (t.name || "") + " " + (t.className || "")
  ).toLowerCase();
  return /comment|코멘트|leave a comment|reply|review|답글/.test(hay);
}

// React가 관리하는 textarea도 값이 반영되도록 네이티브 setter + input 이벤트를 씁니다.
// 기존 내용을 지우고 새 질문으로 교체합니다(여러 번 눌러도 쌓이지 않음).
function insertIntoTextarea(t, text) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  setter.call(t, text);
  t.dispatchEvent(new Event("input", { bubbles: true }));
  t.focus();
}

function flash(btn, msg, original) {
  btn.textContent = msg;
  setTimeout(() => (btn.textContent = original), 2000);
}

async function onQuestion(textarea, btn) {
  const original = "✨ 질문";
  btn.textContent = "✨ 생성 중...";
  btn.disabled = true;

  // 맥락: 드래그한 선택 우선, 없으면 이 코멘트가 속한 파일 diff
  let ctx = window.getSelection().toString().trim();
  if (!ctx) {
    const block = textarea.closest('[class*="Diff-module__diffTargetable"], .file');
    ctx = block ? getFileDiffText(block, block.matches(".file") ? "classic" : "new") : document.title;
  }

  const res = await chrome.runtime.sendMessage({
    action: "ai",
    type: "question",
    text: ctx.slice(0, 4000),
  });

  btn.disabled = false;
  if (!res) return flash(btn, "⚠️ 새로고침", original);
  if (res.error === "NO_KEY") return flash(btn, "⚠️ 키 설정", original);
  if (res.error) return flash(btn, "⚠️ 오류", original);
  insertIntoTextarea(textarea, res.text);
  btn.textContent = original;
}

function enhanceTextareas() {
  document.querySelectorAll("textarea").forEach((t) => {
    if (t.dataset.previewQ || !isCommentTextarea(t)) return;
    t.dataset.previewQ = "1";
    const qbtn = document.createElement("button");
    qbtn.type = "button";
    qbtn.className = "preview-q-btn preview-ui";
    qbtn.textContent = "✨ 질문";
    qbtn.addEventListener("click", () => onQuestion(t, qbtn));
    t.insertAdjacentElement("beforebegin", qbtn);
  });
}

// ── F-04 PR 본문 초안 ─────────────────────────────────────────
// PR 생성(compare) 화면의 본문 입력창 위에 [✨ 본문 초안] 버튼을 붙이고,
// 누르면 변경 diff를 읽어 목적/변경점/코드설명/용어설명/리뷰포인트 초안을 넣습니다.

function enhancePRBody() {
  if (!location.pathname.includes("/compare/")) return;
  const body = document.querySelector(
    '#pull_request_body, textarea[name="pull_request[body]"], textarea[aria-label*="escription"], textarea[placeholder*="escription"]'
  );
  if (!body || body.dataset.previewBody) return;
  body.dataset.previewBody = "1";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "preview-q-btn preview-ui";
  btn.textContent = "✨ 본문 초안";
  btn.addEventListener("click", () => onPRBody(body, btn));
  body.insertAdjacentElement("beforebegin", btn);
}

async function onPRBody(body, btn) {
  const original = "✨ 본문 초안";
  btn.textContent = "✨ 생성 중..."; btn.disabled = true;

  // compare 화면 아래 표시된 변경 diff를 맥락으로 모읍니다.
  const { blocks, mode } = findFileBlocks();
  let ctx = "";
  blocks.forEach((b) => { ctx += getFileDiffText(b, mode) + "\n\n"; });
  ctx = (ctx.trim() || document.title).slice(0, 8000);

  const res = await chrome.runtime.sendMessage({ action: "ai", type: "prBody", text: ctx });
  btn.disabled = false;
  if (!res) return flash(btn, "⚠️ 새로고침", original);
  if (res.error === "NO_KEY") return flash(btn, "⚠️ 키 설정", original);
  if (res.error) return flash(btn, "⚠️ 오류", original);
  insertIntoTextarea(body, res.text);
  btn.textContent = original;
}

// ── F-05 용어 hover 툴팁 ─────────────────────────────────────
// 코멘트/PR 본문(.markdown-body)에 등장하는 리뷰 용어에 밑줄을 긋고,
// 마우스를 올리면 뜻·예시를 말풍선으로 보여줍니다. 용어 데이터는 F-08 glossary.json.
// diff 코드 트리는 GitHub가 자주 다시 그려(React) 우리가 넣은 요소와 충돌할 수 있어 건드리지 않습니다.

let GLOSSARY = null; // {key: {term, aka, def, example, ...}}
let TERM_RE = null; // 용어를 한 번에 찾는 정규식
let TERM_MAP = null; // 소문자 매치 문자열 → 용어 key
let tip = null; // 공용 툴팁 요소

// background에게 용어사전을 한 번 요청 → 받으면 매처를 만들고 즉시 한 번 훑습니다.
function loadGlossary() {
  chrome.runtime.sendMessage({ action: "glossary" }, (res) => {
    if (!res || res.error || !res.glossary) {
      console.log("[PReview] 용어사전 로드 실패:", res && res.error);
      return;
    }
    GLOSSARY = res.glossary;
    buildMatcher();
    console.log("[PReview] 용어사전 로드:", Object.keys(GLOSSARY).length, "개");
    scan();
  });
}

// 별칭(aka)+대표어로 매칭 후보를 모아 하나의 정규식을 만듭니다.
function buildMatcher() {
  TERM_MAP = {};
  const forms = [];
  for (const key of Object.keys(GLOSSARY)) {
    const e = GLOSSARY[key];
    const primary = e.term.split(" (")[0].trim(); // "회귀 (Regression)" → "회귀"
    for (const cand of [primary, ...(e.aka || [])]) {
      const s = (cand || "").trim();
      if (!s) continue;
      // 한글 2글자 이하 일반 단어(승인·충돌·회귀 등)는 오탐이 많아 제외 (영어 별칭으로 잡힘)
      if (/[가-힣]/.test(s) && s.replace(/\s/g, "").length <= 2) continue;
      const low = s.toLowerCase();
      if (!(low in TERM_MAP)) {
        TERM_MAP[low] = key;
        forms.push(s);
      }
    }
  }
  forms.sort((a, b) => b.length - a.length); // 긴 표현을 먼저 매칭
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = forms.map((f) =>
    // 영문은 앞뒤 글자 경계로 부분 매칭 방지, 한글은 그대로
    /^[A-Za-z]/.test(f) ? `(?<![A-Za-z])${esc(f)}(?![A-Za-z])` : esc(f)
  );
  TERM_RE = new RegExp(parts.join("|"), "gi");
}

function enhanceGlossary() {
  if (!TERM_RE) return;
  document.querySelectorAll(".markdown-body").forEach((c) => {
    if (c.dataset.previewGloss) return;
    c.dataset.previewGloss = "1";
    try {
      decorateTerms(c);
    } catch (e) {
      /* React가 관리하는 DOM과 충돌하면 조용히 넘어갑니다 */
    }
  });
}

// 컨테이너의 텍스트 노드를 훑어 용어가 든 노드만 골라 감쌉니다.
function decorateTerms(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = node.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      const tag = p.nodeName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "A") return NodeFilter.FILTER_REJECT;
      if (p.closest(".preview-term, textarea, input")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const targets = [];
  let n;
  while ((n = walker.nextNode())) {
    TERM_RE.lastIndex = 0;
    if (TERM_RE.test(n.nodeValue)) targets.push(n);
  }
  targets.forEach(wrapMatches);
}

// 텍스트 노드 하나를 [텍스트…][용어 span][텍스트…] 조각들로 교체합니다.
function wrapMatches(node) {
  const text = node.nodeValue;
  const frag = document.createDocumentFragment();
  TERM_RE.lastIndex = 0;
  let m, last = 0;
  while ((m = TERM_RE.exec(text))) {
    const key = TERM_MAP[m[0].toLowerCase()];
    if (!key) continue;
    if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    const span = document.createElement("span");
    span.className = "preview-term";
    span.textContent = m[0];
    span.dataset.termKey = key;
    frag.appendChild(span);
    last = m.index + m[0].length;
  }
  if (last === 0) return; // 실제 매치 없음
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  node.parentNode.replaceChild(frag, node);
}

// 용어에 마우스를 올리면 공용 툴팁을 띄웁니다 (이벤트 위임 — 한 번만 등록).
function ensureTip() {
  if (tip) return;
  tip = document.createElement("div");
  tip.id = "preview-tooltip";
  tip.className = "preview-ui";
  tip.style.display = "none";
  document.body.appendChild(tip);
}
document.addEventListener("mouseover", (e) => {
  const t = e.target.closest && e.target.closest(".preview-term");
  if (!t || !GLOSSARY) return;
  const entry = GLOSSARY[t.dataset.termKey];
  if (!entry) return;
  ensureTip();
  tip.innerHTML = "";
  const term = document.createElement("div");
  term.className = "preview-tip-term";
  term.textContent = entry.term;
  const def = document.createElement("div");
  def.className = "preview-tip-def";
  def.textContent = entry.def;
  const ex = document.createElement("div");
  ex.className = "preview-tip-ex";
  ex.textContent = entry.example;
  tip.append(term, def, ex);
  const r = t.getBoundingClientRect();
  tip.style.top = window.scrollY + r.bottom + 6 + "px";
  tip.style.left = window.scrollX + r.left + "px";
  tip.style.display = "block";
});
document.addEventListener("mouseout", (e) => {
  if (e.target.closest && e.target.closest(".preview-term") && tip) tip.style.display = "none";
});

// ── 스캐너: 파일 요약 + 질문 + PR 본문 + 용어 하이라이트를 함께 처리 (300ms 디바운스) ──
function scan() {
  enhanceFiles();
  enhanceTextareas();
  enhancePRBody();
  enhanceGlossary();
}
scan();
loadGlossary(); // 용어사전을 받아오면 콜백에서 다시 scan() 합니다.
let scanTimer = null;
new MutationObserver(() => {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scan, 300);
}).observe(document.body, { childList: true, subtree: true });
