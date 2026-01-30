<!-- INFRASTRUCTURE_AUTOGEN_START -->
## Available Infrastructure

**이 프로젝트에서 사용 가능한 인프라입니다. 중복 구현을 피하세요.**

### 핵심 인프라
| 서비스 | URL | 용도 |
|--------|-----|------|
| Supabase | localhost:54322 | PostgreSQL + pgvector |
| Redis | localhost:6379 | 캐싱, 세션, 큐 |
| memU | http://localhost:8100 | AI 메모리, 중복 체크 |
| Coolify | http://localhost:8000 | 컨테이너 배포 |
| n8n | http://localhost:8081 | 워크플로우 자동화 |

### memU API 엔드포인트
- `POST /memorize` - 콘텐츠 저장
- `POST /retrieve` - 메모리 검색
- `POST /check-similar` - 중복 체크
- `GET/POST/PUT/DELETE /items` - CRUD

### 이 프로젝트 정보
- **슬러그**: dailywave
- **역할**: service
- **할당 포트**: 9008

### 환경변수 관리
**공통 API 키는 global.env에서 복사하세요:**
```bash
cat ~/.config/claude-projects/global.env
```

포함된 키: GEMINI_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY, SUPABASE_*, NAVER_*, SLACK_BOT_TOKEN

### ⚠️ 주의사항
- **PORT 하드코딩 금지** - `.env`의 PORT 사용
- **API 키 직접 입력 금지** - global.env에서 복사
- **새 DB 생성 금지** - Supabase 사용
- **중복 체크** - memU `/check-similar` 사용

### 참조 문서
- 프로젝트 목록: `/home/kkaemo/projects/PROJECTS_OVERVIEW.md`
- 포트 맵: `/home/kkaemo/projects/ROUTING.md`
<!-- INFRASTRUCTURE_AUTOGEN_END -->
