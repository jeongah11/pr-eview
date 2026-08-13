# PReview

GitHub Pull Request 화면에서 코드 리뷰를 도와주는 도구입니다.
**크롬 확장**과 **자동 리뷰 봇**, 두 가지로 구성됩니다.

리뷰 경험이 적은 팀원도 "어디를 봐야 하는지", "어떤 질문을 해야 하는지" 파악할 수 있도록 Gemini AI가 맥락을 짚어줍니다.

---

## 기능 목록

| 기능 | 설명 |
|------|------|
| **코드 해설** | PR 화면에서 코드를 드래그하면 초보자용 해설 팝업 |
| **파일 요약** | 변경된 각 파일 옆에 한 줄 요약 배지 표시 |
| **질문 도우미** | 리뷰 코멘트 입력창에 ✨ 질문 버튼 — 작성자에게 던질 질문 초안 생성 |
| **PR 본문 초안** | PR 작성 화면에서 ✨ 본문 초안 버튼 — 커밋 내용 기반으로 PR 본문 자동 작성 |
| **용어 툴팁** | PR 본문·댓글에서 리뷰 전문 용어(LGTM, nit, WIP 등)에 마우스를 올리면 설명 팝업 |
| **리뷰 봇** | PR이 열리면 GitHub Actions가 자동으로 "집중해서 볼 포인트 + 리뷰 질문 + 이해 점검" 댓글 작성 |

---

## 사전 준비 — Gemini API 키 발급

확장과 봇 모두 Google Gemini API를 사용합니다. 무료로 발급할 수 있습니다.

1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. **Get API key → Create API key** 클릭
3. 생성된 키를 복사해 두기

---

## 1. 크롬 확장 설치

### 설치
1. 이 저장소를 로컬에 클론합니다.
   ```
   git clone https://github.com/jeongah11/pr-eview.git
   ```
2. Chrome 주소창에 `chrome://extensions` 입력
3. 오른쪽 위 **개발자 모드** 토글 켜기
4. **압축해제된 확장 프로그램을 로드** 클릭 → 클론한 폴더 안의 `extension/` 폴더 선택
5. PReview 확장이 목록에 나타나면 설치 완료

### API 키 등록
1. Chrome 툴바의 PReview 아이콘 우클릭 → **옵션** (또는 확장 관리 페이지에서 **세부정보 → 확장 프로그램 옵션**)
2. Gemini API 키 입력 후 저장

### 사용법
GitHub의 PR 페이지(`/pull/숫자`)나 compare 페이지(`/compare/...`)로 이동하면 자동으로 활성화됩니다.

| 기능 | 사용 방법 |
|------|-----------|
| **코드 해설** | diff 영역의 코드를 마우스로 드래그 → **[AI 해설]** 버튼 클릭 |
| **파일 요약** | 파일 헤더 옆 **✨ 요약** 버튼 클릭 |
| **질문 도우미** | 리뷰 코멘트 입력창 오른쪽 위 **✨ 질문** 버튼 클릭 |
| **PR 본문 초안** | PR 작성 화면의 본문 입력창 오른쪽 위 **✨ 본문 초안** 버튼 클릭 |
| **용어 툴팁** | PR 본문이나 댓글에서 파란 점선 밑줄 용어에 마우스 올리기 |

> 확장을 업데이트할 경우 `chrome://extensions`에서 PReview 카드의 새로고침(↻) 버튼을 누른 뒤 PR 페이지를 F5로 새로고침하세요.

---

## 2. 리뷰 봇 설정 (GitHub Actions)

PR이 열릴 때 자동으로 리뷰 시동 댓글을 달아주는 봇입니다. **이 저장소를 fork하거나 직접 사용하는 경우** 아래 한 번만 설정하면 됩니다.

### Secret 등록
1. [GitHub 저장소 Settings → Secrets](https://github.com/jeongah11/pr-eview/settings/secrets/actions) 페이지 접속
2. **New repository secret** 클릭
3. Name: `GEMINI_API_KEY` / Value: 앞서 발급한 Gemini API 키 입력 후 저장

### 동작 확인
설정 후 PR을 새로 열면 10~20초 내에 봇이 아래 형식으로 댓글을 답니다.

```
🤖 PReview 리뷰 봇이에요. 리뷰 시작에 참고하세요!

### 🔍 집중해서 볼 포인트
- ...

### 💬 이런 걸 물어보면 좋아요
- ...

### 🧠 이해 점검 (권장, 답은 선택)
- ...
```

PR 본문이나 댓글에 리뷰 용어(LGTM, nit 등)가 포함되어 있으면 하단에 **📖 용어 노트**가 자동으로 붙습니다.

---

## 3. CLAUDE.md — PR 본문 작성 규칙

저장소 루트의 `CLAUDE.md`는 Claude Code가 이 저장소에서 PR을 만들 때 따르는 서식과 원칙을 정의합니다.

- PR 본문 서식(목적 / 주요 변경점 / 코드 설명 / 용어 설명 / 리뷰 포인트)
- PR 생성 전 초안 확인 절차 (초안 → 사용자 확인 → 생성)

새 프로젝트에도 같은 규칙을 적용하고 싶다면 `CLAUDE.md`를 해당 저장소 루트에 복사하세요.

---

## 구성 파일

```
pr-eview/
├── extension/          # 크롬 확장
│   ├── manifest.json
│   ├── content.js      # PR 페이지 DOM 조작 (해설·요약·질문·본문초안·툴팁)
│   ├── content.css
│   ├── background.js   # Gemini API 호출 (CORS 우회)
│   ├── options.html/js # API 키 설정 화면
│   └── glossary.json   # 리뷰 용어사전 (확장·봇 공용)
├── scripts/
│   └── review-bot.js   # GitHub Actions 봇
├── .github/workflows/
│   └── review-bot.yml  # PR opened 트리거
└── CLAUDE.md           # PR 작성 규칙 (Claude Code용)
```
