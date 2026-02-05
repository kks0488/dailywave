# DailyWave API Reference

Base URL: `http://localhost:8020`

## Authentication

API 키 인증이 설정된 경우 (`API_SECRET_KEY` 환경변수), 모든 요청에 헤더를 포함해야 합니다:

```
X-API-Key: your-secret-key
```

Public 엔드포인트 (`/`, `/health`, `/docs`)는 인증이 필요 없습니다.

---

## Core Endpoints

### GET /
Health check 및 버전 정보.

**Response**
```json
{
  "status": "ok",
  "message": "DailyWave API is Running",
  "version": "1.0.0"
}
```

### GET /health
서비스 상태 확인.

**Response**
```json
{ "status": "healthy" }
```

---

## Persistence

### GET /api/persistence/load
저장된 앱 상태를 로드합니다.

**Response**
```json
{
  "status": "loaded",
  "data": {
    "pipelines": [...],
    "routines": [...]
  }
}
```

### POST /api/persistence/save
앱 상태를 저장합니다.

**Request Body**: 저장할 전체 앱 상태 (JSON object)

**Response**
```json
{ "status": "saved" }
```

---

## Calendar

### GET /api/calendar/feed
iCalendar (`.ics`) 형식의 캘린더 피드를 반환합니다.

**Response**: `text/calendar` MIME type의 `.ics` 콘텐츠

**사용**: Google Calendar, Apple Calendar 등에서 URL 구독으로 연동

---

## Workflow

### POST /execute
워크플로우 파이프라인을 실행합니다.

**Request Body**: `Workflow` 스키마
```json
{
  "nodes": [...],
  "edges": [...]
}
```

**Response**
```json
{
  "status": "completed",
  "results": [...]
}
```

**Security**: SSRF 보호가 적용되어 있습니다. 내부 네트워크, localhost, 메타데이터 엔드포인트로의 요청이 차단됩니다.

---

## AI (Gemini Proxy)

### GET /api/ai/status
프론트에서 AI 사용 가능 여부를 판단하기 위한 상태 엔드포인트입니다.

**Response**
```json
{
  "ai_proxy_reachable": true,
  "gemini_configured": true,
  "memu_reachable": false,
  "require_supabase_auth_for_ai": true,
  "rate_limits": { "per_minute": 30, "per_hour": 300 }
}
```

### POST /api/ai/ask
서버 사이드 Gemini AI 프록시. memU 컨텍스트가 자동 주입됩니다.

> 비용/악용 방지를 위해 서버 환경변수 `REQUIRE_SUPABASE_AUTH_FOR_AI=1` 인 경우,
> 이 엔드포인트는 **Supabase 로그인 토큰**이 필요합니다.

**Headers (optional / recommended)**
```
Authorization: Bearer <supabase access token>
```

**Request Body**
```json
{
  "prompt": "What should I focus on next?",
  "context": { "energy": "medium", "pipelines": [...] },
  "system_prompt": "You are a productivity coach...",
  "user_id": "user-uuid",
  "temperature": 0.7,
  "max_tokens": 2048
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | 사용자 질문 |
| `context` | object | No | 추가 컨텍스트 (에너지, 파이프라인 등) |
| `system_prompt` | string | No | 시스템 프롬프트 |
| `user_id` | string | No | memU 개인화에 사용 |
| `temperature` | float | No | 생성 온도 (기본 0.7) |
| `max_tokens` | int | No | 최대 토큰 수 (기본 2048) |

**Response**
```json
{ "text": "Based on your energy level..." }
```

**Rate limit**
- 요청이 많으면 `429` 를 반환합니다.
- `Retry-After` 헤더(초)가 포함됩니다.

**동작 흐름**:
1. `user_id` 제공 시 memU에서 사용자 과거 패턴 조회
2. 컨텍스트를 Gemini 프롬프트에 주입
3. Gemini API 호출
4. 응답 후 memU에 상호작용 기록 (비동기)

---

## Memory Tracking

### POST /api/memory/track
사용자 행동을 memU에 기록합니다 (비차단).

**Request Body**
```json
{
  "user_id": "user-uuid",
  "action_type": "routine_completed",
  "data": {
    "routine_id": "...",
    "routine_title": "Morning Workout"
  }
}
```

| Action Type | Description |
|-------------|-------------|
| `routine_completed` | 루틴 완료 |
| `routine_skipped` | 루틴 건너뛰기 |
| `step_completed` | 파이프라인 스텝 완료 |
| `pipeline_created` | 새 파이프라인 생성 |
| `ai_recommendation_used` | AI 추천 사용 |
| `session_start` | 세션 시작 |

**Response**
```json
{ "status": "tracked" }
```

---

## Account

### DELETE /api/auth/account
AI 기능을 위해 생성된 **Supabase 계정**을 삭제합니다 (App Store 정책 대응).

**Headers**
```
Authorization: Bearer <supabase access token>
```

**Response**
- `204 No Content` (성공)

**Server requirements**
- `SUPABASE_PROJECT_URL` (또는 `SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 절대 클라이언트에 노출 금지)

---

## Error Responses

모든 에러는 다음 형식을 따릅니다:

```json
{
  "detail": "Error description"
}
```

| Status Code | Description |
|-------------|-------------|
| 401 | API 키 인증 실패 |
| 500 | 서버 내부 오류 |
| 504 | Gemini API 타임아웃 |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | AI 사용 시 | Google Gemini API 키 |
| `API_SECRET_KEY` | No | API 인증 키 (미설정 시 인증 비활성화) |
| `MEMU_URL` | No | memU 서버 URL (기본: `http://localhost:8100`) |
| `REQUIRE_SUPABASE_AUTH_FOR_AI` | No | `1`이면 `/api/ai/ask`에 Supabase 토큰 필요 |
| `SUPABASE_PROJECT_URL` | No | Supabase 프로젝트 URL (JWKS/user endpoint 검증에 사용) |
| `SUPABASE_ANON_KEY` | No | Supabase anon key (server-side token verification fallback) |
| `SUPABASE_JWT_SECRET` | No | HS256 JWT 검증용 secret |
| `SUPABASE_SERVICE_ROLE_KEY` | 계정 삭제 시 | Supabase Admin API용 service role key |
