# Supabase Setup Guide

This guide walks you through setting up Supabase for DailyWave.

## Why Supabase Cloud?

If you want **the same data on iPad / iPhone / web**, you should use **Supabase Cloud** (hosted). Each device signs in with the same account and DailyWave syncs your pipelines/routines to Postgres with RLS enabled.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Sign in
3. Click "New Project"
4. Choose organization and enter:
   - **Name**: dailywave
   - **Database Password**: (save this securely!)
   - **Region**: Choose nearest to your users
5. Click "Create new project"

## 2. Run Database Migration

1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and click "Run"

## 3. Configure Authentication

### Enable Providers

1. Go to **Authentication** → **Providers**
2. Enable desired providers:
   - **Email**: Enable (for email/password login)
   - **Google**: Add Client ID and Secret from Google Cloud Console
   - **Apple**: Add Service ID and other credentials from Apple Developer
   - **GitHub**: Add Client ID and Secret from GitHub OAuth Apps

### Configure URLs

1. Go to **Authentication** → **URL Configuration**
2. Set:
   - **Site URL**: `https://dailywave.vercel.app` (or your custom domain)
   - **Redirect URLs**: Add:
     - `https://dailywave.vercel.app/auth/callback` (or your custom domain)
     - `http://localhost:3005/auth/callback` (for development)

## 4. Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (safe to expose in client)

## 5. Update Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Vercel Environment Variables
Add the same variables in Vercel project settings.

> Tip: After changing Vercel env vars, trigger a redeploy so the client bundle picks up the new values.

## 6. Install Supabase Client

```bash
cd frontend
npm install @supabase/supabase-js
```

## 7. Initialize Client

Create `frontend/src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## Database Schema Overview

```
workspaces
  ├── id (UUID, PK)
  ├── user_id (UUID, FK → auth.users)
  ├── name
  ├── settings (JSONB)
  └── timestamps

pipelines
  ├── id (UUID, PK)
  ├── workspace_id (UUID, FK)
  ├── title, subtitle, color, icon_type
  ├── position
  └── timestamps

steps
  ├── id (UUID, PK)
  ├── pipeline_id (UUID, FK)
  ├── title, description, status
  ├── position
  └── timestamps

routines
  ├── id (UUID, PK)
  ├── workspace_id (UUID, FK)
  ├── title, time, type, is_done
  └── timestamps
```

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- API keys are safe to use in client (RLS protects data)

## Sync Layer

DailyWave는 3-tier 데이터 persistence를 사용합니다:

1. **Supabase** (로그인 사용자) - `frontend/src/lib/supabaseSync.js`
2. **Backend JSON** - `/api/persistence/save` & `/api/persistence/load`
3. **localStorage** - 오프라인/게스트 폴백

로그인한 사용자는 자동으로 Supabase에서 데이터를 로드/저장합니다.
로그아웃 상태에서는 Backend JSON → localStorage 순서로 폴백합니다.

### 관련 파일
- `frontend/src/lib/supabase.js` - Supabase 클라이언트 초기화
- `frontend/src/lib/supabaseSync.js` - `loadFromSupabase()`, `saveToSupabase()`
- `frontend/src/store/useAuthStore.js` - 인증 상태 관리
- `frontend/src/components/AuthCallback.jsx` - OAuth callback 처리 (`/auth/callback`)
