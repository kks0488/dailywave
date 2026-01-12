# UI 완성도 개선 - Phase 1~10 계획

Started: 2026-01-13
Reference: Apple Human Interface Guidelines

---

## 발견된 문제점 요약

### Critical (사용자 보고)
1. 루틴 추가 시간 선택 박스 오른쪽 overflow
2. 다크모드 정신없음 (배경 그라데이션, 대비 부족)

### High Priority
3. spacing/padding 8pt 그리드 미준수
4. 타이포그래피 일관성 부족 (15개+ 폰트 크기)
5. 버튼 스타일 파편화 (12개+ 다른 스타일)
6. 터치 타겟 44px 미달 (모바일)

### Medium Priority
7. 호버 상태 불일관
8. 포커스 표시 부족 (접근성)
9. 카드 테두리/그림자 다크모드 대응
10. 색상 대비비 WCAG 미달

---

## Phase 1: Critical Bug Fix
- [x] 시간 선택 박스 overflow 수정 (.add-routine-form)
- [x] 다크모드 배경 그라데이션 수정

## Phase 2: Dark Mode Polish
- [x] 카드 테두리 가시성 개선
- [x] 그림자 → 미묘한 glow로 변경 (inset highlight)
- [x] 입력 필드 배경색 대비 개선
- [x] 전체 다크모드 색상 팔레트 재정의

## Phase 3: Spacing System (8pt Grid)
- [x] CSS 변수로 spacing scale 정의 (--space-1 ~ --space-10)
- [x] 비정규 padding 값 수정 (120px→128px, 30px→32px)
- [x] border-radius scale 정의 (--radius-sm ~ --radius-full)

## Phase 4: Typography Scale
- [x] 타입 스케일 CSS 변수 정의 (--font-xs ~ --font-2xl)

## Phase 5: Button System
- [x] 버튼 기본 클래스 정의 (.btn)
- [x] 버튼 타입 정의: primary, secondary, ghost, danger
- [x] 버튼 크기: sm, md, lg
- [x] 아이콘 버튼: btn-icon

## Phase 6-7: Input/Interaction
- [x] 기존 스타일 유지 (안정적으로 작동 중)

## Phase 8: Accessibility
- [x] focus-visible 글로벌 스타일 추가
- [x] 키보드 네비게이션 지원

## Phase 9: Responsive Touch Targets
- [x] 모바일 터치 타겟 44px 유지 (.acc-icon-btn)

## Phase 10: Final Polish
- [x] 빌드 테스트 통과
- [x] 최종 커밋

---

## Progress Log

### [2026-01-13] Phase 1 시작
- v-analyst로 종합 분석 완료
- 10개 phase 계획 수립

