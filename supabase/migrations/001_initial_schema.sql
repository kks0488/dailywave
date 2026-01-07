-- DailyWave Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workspaces table (one per user for now, can be extended for teams)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL DEFAULT 'My Workspace',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipelines (workflows)
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    color TEXT DEFAULT 'blue',
    icon_type TEXT DEFAULT 'briefcase',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Steps within pipelines
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('done', 'active', 'pending', 'locked')),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily routines
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    time TIME NOT NULL,
    type TEXT DEFAULT 'morning' CHECK (type IN ('morning', 'afternoon')),
    is_done BOOLEAN DEFAULT FALSE,
    done_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_pipelines_workspace_id ON pipelines(workspace_id);
CREATE INDEX idx_steps_pipeline_id ON steps(pipeline_id);
CREATE INDEX idx_routines_workspace_id ON routines(workspace_id);

-- Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own workspaces" ON workspaces
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workspaces" ON workspaces
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workspaces" ON workspaces
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workspaces" ON workspaces
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own pipelines" ON pipelines
    FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own pipelines" ON pipelines
    FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own pipelines" ON pipelines
    FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own pipelines" ON pipelines
    FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own steps" ON steps
    FOR SELECT USING (pipeline_id IN (
        SELECT p.id FROM pipelines p 
        JOIN workspaces w ON p.workspace_id = w.id 
        WHERE w.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own steps" ON steps
    FOR INSERT WITH CHECK (pipeline_id IN (
        SELECT p.id FROM pipelines p 
        JOIN workspaces w ON p.workspace_id = w.id 
        WHERE w.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own steps" ON steps
    FOR UPDATE USING (pipeline_id IN (
        SELECT p.id FROM pipelines p 
        JOIN workspaces w ON p.workspace_id = w.id 
        WHERE w.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own steps" ON steps
    FOR DELETE USING (pipeline_id IN (
        SELECT p.id FROM pipelines p 
        JOIN workspaces w ON p.workspace_id = w.id 
        WHERE w.user_id = auth.uid()
    ));

CREATE POLICY "Users can view own routines" ON routines
    FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own routines" ON routines
    FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own routines" ON routines
    FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own routines" ON routines
    FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- Function to auto-create workspace for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspaces (user_id, name)
    VALUES (NEW.id, 'My Workspace');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create workspace
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_steps_updated_at BEFORE UPDATE ON steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON routines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
