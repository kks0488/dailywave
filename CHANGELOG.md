# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.3.1] - 2026-01-31

### Changed
- Supabase autosave now syncs **pipelines/routines only** (other data stays local-first)
- Supabase writes are throttled (min 5s interval) to reduce request volume

### Fixed
- Cloud sync now reconciles deletions (prevents removed pipelines/steps/routines from reappearing)
- Workspace lookup is resilient even if multiple workspaces exist (picks earliest)

## [1.3.2] - 2026-01-31

### Fixed
- Prevent “cloud load → immediate save” echo to Supabase (reduces noisy writes)

### Added
- Frontend unit test for Supabase sync deletion reconciliation (`supabaseSync.test.js`)

## [1.2.0] - 2026-01-29

### Added
- **Backend Tests**: pytest 38개 테스트 (executor, storage, auth, calendar_gen, API 통합)
- **Frontend Tests**: vitest 31개 테스트 (useCommandStore, gemini utils)
- **CI/CD**: GitHub Actions 워크플로우 (`.github/workflows/ci.yml`)
- **Logger Utility**: `src/lib/logger.js` - DEV 환경 전용 로깅
- **CHANGELOG.md**: 버전 변경 이력 추적
- **docs/ROADMAP.md**: 프로젝트 현재 상태 및 향후 계획

### Changed
- `console.log/warn` → `logger.log/warn` (WhatsNext, gemini.js, AppleCommandCenter)
- `vite.config.js` 포트 주석 추가 (dev:3005 vs prod:3020 명확화)

## [1.3.0] - 2026-01-30

### Added
- **Supabase Cloud Login (Frontend)**: OAuth callback route `/auth/callback`
- **Account section in Settings**: Sign in/out + manual **Sync now**
- **Workspace auto-create fallback** on save (reduces first-login failures)
- **German locale (de)**: UI translations + language selector option
- **Simple Mode (default)**: Chaos Dump-first UI with a “More/Less” toggle
- **Home Next Step card**: shows a single recommended next action (local heuristic, optional AI)

### Changed
- “Chaos Dump” becomes the default, low-friction entry point (fewer visible actions by default)

### Fixed
- Auth callback robustness: handles missing OAuth code/state more gracefully
- Dark mode readability for Chaos Dump “AI hint”
- Routine add inline form now closes on outside click / `Esc`
- Main panel scrollbar hidden (scroll still works)

## [1.1.0] - 2026-01-29

### Added
- **memU Integration**: AI personalization via memU memory service (optional)
- **AI Proxy**: Server-side Gemini proxy (`/api/ai/ask`) - API key no longer exposed to client
- **API Key Auth**: Optional `X-API-Key` middleware for backend protection
- **Supabase Sync**: Cloud data sync for logged-in users (`supabaseSync.js`)
- **Memory Tracker**: User behavior tracking for memU (`memoryTracker.js`)
- **memU Docker service** in `docker-compose.yml`
- **Documentation**: `docs/ARCHITECTURE.md`, `docs/API.md`

### Changed
- Backend startup uses `lifespan` context manager (replaces deprecated `on_event`)
- Zustand selectors separated for granular re-renders
- `WhatsNext` component lazy-loaded with `React.lazy`
- `lucide-react` bundled as separate chunk (Vite manual chunks)
- RegExp constants hoisted out of render loops
- `crypto.randomUUID()` replaces `Date.now().toString()` for IDs
- Storage writes use atomic pattern (`.tmp` + `os.replace()`)
- Calendar URL uses dynamic `backendUrl` instead of hardcoded port

### Fixed
- SSRF vulnerability in `executor.py` (blocked internal hosts/schemes)
- Memory leak in `useAuthStore` (unsubscribe on cleanup)
- Duplicate `<ToastContainer />` in `AppleCommandCenter`
- Thread safety in `StorageManager` (added lock)

### Removed
- `networkx` dependency (unused)
- Direct client-side Gemini API key exposure

### Security
- SSRF protection with blocked hosts, schemes, and private IP ranges
- CORS restricted to explicit origin whitelist
- Gemini API key moved to server-side only

## [1.0.0] - 2026-01-08

### Added
- Initial release
- Flow-based workflow management
- Daily routine checklists
- "What's Next?" AI recommendations (Gemini)
- Time Buddy visual timer
- Drag-and-drop workflows
- Calendar sync (`.ics` feeds)
- Multi-language support (EN/KR/JA/ZH)
- Dark mode
- Supabase authentication (Google, Apple, GitHub, Email)
- Docker and PM2 deployment support
