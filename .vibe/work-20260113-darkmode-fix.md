# Vibe Work Document

## Task: 다크모드에서 모달 및 UI 요소 텍스트 안보임 수정
Started: 2026-01-13

---

## Requirements
- [x] 다크모드에서 모든 모달의 텍스트가 보이도록 수정
- [x] 라이트모드는 영향 없이 유지

---

## Phase 3: Execution - 완료

### 1. AppleCommandCenter.css
| 줄 | 변경 전 | 변경 후 |
|----|---------|---------|
| 760 | `background: white` | `background: var(--glass-modal-bg)` |
| 974 | `background: white` | `background: var(--glass-modal-bg)` |
| 978 | `border: 1px solid rgba(0,0,0,0.05)` | `border: 1px solid var(--border-light)` |

### 2. AuthModal.jsx
| 요소 | 변경 전 | 변경 후 |
|------|---------|---------|
| Google 버튼 | `background: 'white'` | `background: 'var(--bg-card)'` |
| Google 버튼 | - | `color: 'var(--text-primary)'` 추가 |
| Google 버튼 border | `#e5e5ea` | `var(--border-light)` |
| GitHub 버튼 | `background: 'white'` | `background: 'var(--bg-card)'` |
| GitHub 버튼 | - | `color: 'var(--text-primary)'` 추가 |
| GitHub 버튼 border | `#e5e5ea` | `var(--border-light)` |
| GitHub 아이콘 | `fill="#1d1d1f"` | `fill="currentColor"` |
| 서브타이틀 | `color: '#86868b'` | `color: 'var(--text-secondary)'` |
| 설정안됨 박스 | `background: '#f5f5f7'` | `background: 'var(--hover-bg)'` |
| 설정안됨 텍스트 | `color: '#86868b'` | `color: 'var(--text-secondary)'` |

---

## Phase 4: Verification
- [x] 모든 .glass-modal 사용처 확인 (8개 모달 모두 동일 클래스 사용)
- [x] context-menu 다크모드 지원 추가
- [x] AuthModal 다크모드 지원 추가
- [x] 불필요한 white-dot 제외 (의도적 디자인)

---

## 수정된 모달 목록
1. ✅ Settings 모달
2. ✅ Edit Step 모달
3. ✅ Add Step 모달
4. ✅ New Pipeline 모달
5. ✅ Rename Pipeline 모달
6. ✅ Delete Confirm 모달
7. ✅ AI Enhance 모달
8. ✅ Auth 모달
9. ✅ Context Menu

---

## Progress Log

### [2026-01-13 03:41] Started
다크모드 모달 텍스트 visibility 이슈 수정 시작

### [2026-01-13 03:43] glass-modal 수정
AppleCommandCenter.css:760 - background: white → var(--glass-modal-bg)

### [2026-01-13 03:45] AuthModal 다크모드 지원 추가
- Google/GitHub 버튼 배경 및 테두리 CSS 변수화
- GitHub 아이콘 currentColor 적용
- 텍스트 색상 CSS 변수화

### [2026-01-13 03:46] Context Menu 수정
AppleCommandCenter.css:974 - background: white → var(--glass-modal-bg)

✅ 완료
