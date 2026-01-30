# DailyWave 강화 전략 (P0 구현 반영) — 2026-01-29

> 이 문서는 `docs/CREATIVE_FEATURES.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`를 바탕으로,
> “강화(P0→P1)” 우선순위를 정리하고 **P0를 실제 코드에 연결한 상태**를 반영합니다.

## 목표

- 개인화/리텐션의 “설계만 있고 신호가 없는 상태”를 끝내고, 앱이 **사용자 행동을 기억/학습**할 수 있게 만든다.
- “One clear next step / No‑shame / Graceful degradation” 원칙을 유지한다.

## P0 (1~2주) — 기반 강화 (이번 구현 범위)

### 1) memoryTracker 실제 연결 (export 8 / import 0 해결)
- 세션 시작, 워크플로우 생성, 루틴 완료, 스텝 완료, AI 추천 사용을 실제 이벤트에 연결

### 2) completionHistory 도입
- Victory Wall / 루틴 패턴 분석을 위한 최소 이벤트 로그 저장
- 기본 보관: 최근 60일(프론트에서 pruning)

### 3) 루틴 “일일 리셋” 구현
- 루틴에 `doneDate(YYYY-MM-DD)`를 도입해 날짜 기반으로 완료 상태를 계산/유지
- Supabase `routines.done_date`도 함께 사용(있는 경우)

### 4) SOP Library 최소 기능(Flow Recipes seed)
- 워크플로우 우클릭 → “레시피로 저장”
- Settings → 레시피 목록에서 “사용/삭제”

### 5) 문서/환경변수 정합성
- 프론트 백엔드 URL env를 `VITE_API_URL`로 명확화하고 문서/예제를 정리
- Supabase redirect dev 포트를 3005로 수정

## P1 (차별화) — 최소 UI부터 (진행)

- ✅ Micro Victory Wall (최소 UI): 헤더의 🏆 버튼 → “Victory Wall” 모달에서 오늘 타임라인 제공
- ✅ No‑Shame Evening (최소 UI): Victory Wall 내 “후회 없는 저녁/오늘 요약” 카드 + 내일 한 가지 팁(로컬 추정)
- ✅ Chaos Dump: 비구조 입력을 “Chaos Inbox”에 저장 → (선택) AI 정리 → 워크플로우/루틴 원클릭 적용 + Settings에서 관리
