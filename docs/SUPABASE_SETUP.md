# Supabase Setup Guide

This guide walks you through setting up Supabase for DailyWave.

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
   - **Site URL**: `https://your-domain.vercel.app`
   - **Redirect URLs**: Add:
     - `https://your-domain.vercel.app/auth/callback`
     - `http://localhost:3020/auth/callback` (for development)

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

## Next Steps

After setup:
1. Update frontend to use Supabase client
2. Implement authentication UI
3. Migrate from local JSON storage to Supabase
