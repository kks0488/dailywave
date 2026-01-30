# DailyWave Roadmap

현재 상태와 향후 개선 계획입니다.

## Current Status (v1.2.0)

| 영역 | 상태 | 비고 |
|------|------|------|
| Core App | ✅ Complete | 워크플로우, 루틴, 타이머, 드래그앤드롭 |
| AI (Gemini) | ✅ Complete | 서버 프록시, 클라이언트 폴백 |
| memU Integration | ✅ Complete | 선택적, graceful degradation |
| i18n | ✅ Complete | EN/KR/JA/ZH |
| Auth (Supabase) | ✅ Complete | Google, Apple, GitHub, Email |
| Cloud Sync | ✅ Complete | Supabase + JSON + localStorage 3-tier |
| Security | ✅ Complete | SSRF, API key auth, CORS, atomic writes |
| Documentation | ✅ Complete | README, API, Architecture, Deployment, Roadmap, Changelog |
| Docker | ✅ Complete | frontend + backend + memU |
| Backend Tests | ✅ Complete | pytest 38개 (77% coverage) |
| Frontend Tests | ✅ Complete | vitest 31개 (store + utils) |
| CI/CD | ✅ Complete | GitHub Actions (backend + frontend) |
| Logger | ✅ Complete | DEV 환경 전용 logger 유틸리티 |
| Error Boundary | ✅ Complete | ErrorBoundary.jsx (main.jsx에 적용) |
| Mobile | 🔄 Structure only | Flutter 프로젝트 구조만 생성됨 |

---

## Completed Improvements (v1.2.0)

### 1. Testing ✅
- **Backend**: pytest 38개 테스트 (executor, storage, auth, calendar_gen, API 통합)
- **Frontend**: vitest 31개 테스트 (useCommandStore 18개, gemini utils 13개)
- 실행: `cd backend && python -m pytest tests/ -v`
- 실행: `cd frontend && npx vitest run`

### 2. CI/CD ✅
- `.github/workflows/ci.yml` - push/PR 시 자동 테스트 + 빌드
- Backend: Python 3.11, pytest
- Frontend: Node 20, vitest + vite build

### 3. Port Configuration ✅
- Dev: 3005 (vite.config.js, 주석으로 명확화)
- Production: 3020 (docker-compose.yml)
- Service registry: 9008 (PROJECT_PORTS.md)

### 4. Logger Utility ✅
- `src/lib/logger.js` - DEV 환경에서만 log/warn 출력
- 3개 파일 적용 (WhatsNext, gemini.js, AppleCommandCenter)
- console.error는 프로덕션에서도 유지

---

## Mid-term Enhancements

### 5. Backend Executor Upgrade

`executor.py`에 TODO 남아있음:
> "Build a proper DAG executor using networkx"

현재 간단한 BFS 구현. 복잡한 워크플로우를 위해 DAG 실행기 개선 필요.

### 6. i18n Namespace Expansion

현재: 각 언어에 `common.json` 하나만 사용
계획: `dashboard.json`, `settings.json` 등 도메인별 분리로 관리성 향상

### 7. Additional Test Coverage

현재 핵심 로직만 테스트됨. 확장 가능:
- `ai_proxy.py` (Gemini mock 테스트)
- `memory_service.py` (memU mock 테스트)
- `supabaseSync.js` (Supabase mock 테스트)
- Component 렌더링 테스트

### 8. Mobile App Development

Flutter 프로젝트 구조만 존재. MASTER_PLAN Phase 8-9에 해당:
- Core screens 구현
- Supabase/memU 연동
- App Store/Play Store 릴리스

---

## Long-term Goals

- **Analytics**: PostHog/Sentry 통합 (MASTER_PLAN Phase 13)
- **Enterprise**: 팀 워크스페이스, RBAC (Phase 14)
- **Growth**: Product Hunt, 커뮤니티 빌딩 (Phase 15)
- **E2E Tests**: Playwright/Cypress
- **Performance Monitoring**: Web Vitals, Lighthouse CI

---

*Last Updated: 2026-01-29*
