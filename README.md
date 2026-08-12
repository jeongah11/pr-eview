# PReview

GitHub Pull Request 화면에서 **코드 이해를 돕는** 리뷰 보조 도구입니다.
크롬 확장과 자동 봇이 함께 작동합니다.

## 구성
- **크롬 확장** — PR 화면 위에서 드래그 해설·파일 요약·질문 도우미·PR 본문 초안을 제공
- **리뷰 봇** — PR이 열리면 시니어 개발자 페르소나로 리뷰 포인트·질문을 자동 댓글

## 크롬 확장 설치
1. `chrome://extensions` → **개발자 모드** 켜기
2. **압축해제된 확장 프로그램을 로드** → `extension/` 폴더 선택
3. 확장 **옵션**에서 Gemini API 키 입력 (Google AI Studio에서 무료 발급)

## 리뷰 봇 설정
1. 저장소 **Settings > Secrets and variables > Actions** 에 `GEMINI_API_KEY` 등록
2. 이후 PR이 열리면 `.github/workflows/review-bot.yml` 이 자동 실행

## AI
- Google Gemini (`gemini-flash-lite-latest`)
- 확장은 각자 브라우저에 키 저장, 봇은 저장소 Secret 사용
