# Task: Apple HIG 기반 UI 완성도 개선

Started: 2026-01-13

---

## Requirements
- [ ] 모달에 뒤로가기/닫기 버튼 일관성 확보 (모바일 UX 개선)
- [ ] Corner radius 값 일관성 (Apple HIG: 12pt, 16pt 권장)
- [ ] 터치 타겟 최소 크기 44pt 확보
- [ ] 아이콘/버튼 크기 일관성

---

## Phase 1: Recon
- [x] 현재 CSS 분석
- [ ] 모든 모달 구조 분석
- [ ] corner-radius 값 수집
- [ ] 터치 타겟 크기 확인

## 발견된 문제점
1. **Settings 모달**: 뒤로가기 버튼 없음, X 버튼만 있음
2. **Corner radius 불일관**:
   - glass-modal: 24px
   - status-option: 16px
   - glass-input: 12px
   - close-btn: 50% (원형)
   - context-menu: 12px
3. **터치 타겟 크기**:
   - close-btn: 32px (44px 미달)
   - icon-action-btn: 32px (44px 미달)

---

## Phase 2: Planning
Apple HIG 권장값:
- Corner radius: 12pt (small), 16pt (medium), 20pt (large)
- 터치 타겟: 최소 44pt x 44pt
- 모달: 상단에 명확한 닫기/뒤로가기 버튼

개선 계획:
1. 모달 헤더에 뒤로가기 버튼 추가 (모바일용)
2. close-btn 크기 44px로 증가
3. corner-radius 통일: 12px(small), 16px(medium), 22px(large)
4. 터치 타겟 최소 44px 보장

---

## Phase 3: Execution
- [ ] 모달 헤더 구조 개선 (뒤로가기 버튼 추가)
- [ ] close-btn 크기 44px로 수정
- [ ] corner-radius 값 일관성 적용
- [ ] 터치 타겟 크기 개선

---

## Phase 4: Verification
- [ ] 빌드 성공
- [ ] 모바일에서 터치 테스트
- [ ] 다크모드/라이트모드 확인

---

## Progress Log

### [2026-01-13] 분석 시작
- CSS 분석 완료
- 불일관 요소 발견
