# DailyWave Architecture

## System Overview

```
┌─────────────────────────────────────────────────┐
│                   Client                        │
│  React 18 + Vite + Zustand + i18next            │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Commands  │ │ Routines │ │  WhatsNext AI  │  │
│  └────┬─────┘ └────┬─────┘ └───────┬────────┘  │
│       │             │               │            │
│  ┌────┴─────────────┴───────────────┴────────┐  │
│  │           Zustand Store                   │  │
│  │    (useCommandStore, useAuthStore)        │  │
│  └────┬─────────────┬───────────────┬────────┘  │
│       │             │               │            │
│  localStorage  Supabase Sync   Backend API      │
└───────┼─────────────┼───────────────┼────────────┘
        │             │               │
        │    ┌────────┴────────┐      │
        │    │   Supabase      │      │
        │    │  (Auth + DB)    │      │
        │    └─────────────────┘      │
        │                             │
┌───────┴─────────────────────────────┴────────────┐
│                Backend (FastAPI)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Storage  │ │ Calendar │ │   AI Proxy       │ │
│  │ (JSON)   │ │ (.ics)   │ │ (Gemini + memU)  │ │
│  └──────────┘ └──────────┘ └────────┬─────────┘ │
│                                     │            │
│  ┌──────────┐ ┌─────────────────────┴──────────┐ │
│  │  Auth    │ │     Memory Service             │ │
│  │Middleware│ │  (memorize / retrieve / check)  │ │
│  └──────────┘ └─────────────────────┬──────────┘ │
└─────────────────────────────────────┼────────────┘
                                      │
                              ┌───────┴───────┐
                              │     memU      │
                              │  (optional)   │
                              │ AI Memory API │
                              └───────────────┘
```

## Frontend Architecture

### State Management
- **Zustand** 단일 스토어 (`useCommandStore`) - pipelines, routines, UI 상태
- **useAuthStore** - Supabase 인증 상태
- Selector 패턴으로 불필요한 리렌더링 방지

### Data Persistence (3-tier fallback)
1. **Supabase** - 로그인 사용자의 클라우드 데이터 (우선)
2. **Backend JSON** - 서버 파일 기반 저장
3. **localStorage** - 오프라인/게스트 모드 폴백

### Key Components
| Component | Role |
|-----------|------|
| `AppleCommandCenter` | 메인 대시보드 (pipelines + routines) |
| `WhatsNext` | AI 추천 (lazy loaded) |
| `TimeBuddy` | 시각적 타이머 |
| `RoutineChecklist` | 일일 루틴 관리 |

### Performance
- `WhatsNext` lazy loading (`React.lazy` + `Suspense`)
- `lucide-react` manual chunks (Vite)
- Zustand individual selectors (granular subscriptions)
- Hoisted RegExp constants (no recreation per render)

## Backend Architecture

### Middleware Stack
1. **APIKeyAuthMiddleware** - `X-API-Key` 헤더 검증 (설정 시)
2. **CORSMiddleware** - 허용된 origin만 접근

### Core Modules
| Module | File | Role |
|--------|------|------|
| Storage | `storage.py` | Thread-safe JSON 읽기/쓰기 (atomic writes) |
| Executor | `executor.py` | 워크플로우 실행, SSRF 보호 |
| Calendar | `calendar_gen.py` | iCalendar `.ics` 피드 생성 |
| AI Proxy | `ai_proxy.py` | Gemini API 프록시 + memU 컨텍스트 주입 |
| Memory | `memory_service.py` | memU 통신 (비차단, 실패 허용) |
| Auth | `auth.py` | API 키 인증 미들웨어 |

### Security
- **SSRF Protection**: `executor.py`에서 blocked hosts/schemes/private IP 필터링
- **API Key Auth**: 서버 사이드 Gemini 키, 클라이언트 노출 방지
- **Atomic Writes**: `.tmp` 파일 작성 후 `os.replace()` (데이터 무결성)
- **CORS**: 명시적 origin whitelist

## memU Integration

memU는 **선택적** 서비스입니다. Graceful degradation 패턴을 따릅니다.

### 동작 방식
1. **시작 시**: 백엔드가 memU `/health` 체크, 상태 로깅
2. **AI 요청 시**: memU에서 사용자 과거 패턴 조회 → Gemini 프롬프트에 주입
3. **사용자 행동 시**: 루틴 완료, 파이프라인 생성 등을 memU에 비동기 기록
4. **실패 시**: 경고 로그만 남기고 정상 동작 계속

### API 흐름
```
User Action → Frontend memoryTracker → POST /api/memory/track → memory_service → memU /memorize
AI Request  → POST /api/ai/ask → memory_service.retrieve → memU /retrieve → Gemini API
```

## Docker Services

```yaml
services:
  frontend:  # React (port 3020)
  backend:   # FastAPI (port 8020), depends_on: memu
  memu:      # memU AI Memory (port 8100)
```
