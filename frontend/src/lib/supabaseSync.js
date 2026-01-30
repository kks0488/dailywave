import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Supabase 데이터 동기화 레이어
 * 로그인 사용자: Supabase에 읽기/쓰기
 * 게스트 사용자: 기존 로컬 동작 유지 (이 모듈은 호출되지 않음)
 */

const getLocalDateKey = (date = new Date()) => {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

async function getWorkspaceId(userId) {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id || null;
}

async function ensureWorkspaceId(userId) {
  if (!isSupabaseConfigured() || !supabase || !userId) return null;

  const existingId = await getWorkspaceId(userId);
  if (existingId) return existingId;

  try {
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ user_id: userId, name: 'My Workspace' })
      .select('id')
      .single();
    if (error) throw error;
    return data?.id || null;
  } catch {
    // Race/trigger may have created it; try again.
    return await getWorkspaceId(userId);
  }
}

export async function loadFromSupabase(userId) {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const workspaceId = await getWorkspaceId(userId);
    if (!workspaceId) return null;

    const [pipelinesRes, routinesRes] = await Promise.all([
      supabase
        .from('pipelines')
        .select('*, steps(*)')
        .eq('workspace_id', workspaceId)
        .order('position'),
      supabase
        .from('routines')
        .select('*')
        .eq('workspace_id', workspaceId),
    ]);

    const pipelines = (pipelinesRes.data || []).map(p => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle || '',
      color: p.color || 'blue',
      iconType: p.icon_type || 'briefcase',
      steps: (p.steps || [])
        .sort((a, b) => a.position - b.position)
        .map(s => ({
          id: s.id,
          title: s.title,
          description: s.description || '',
          status: s.status || 'pending',
        })),
    }));

    const todayKey = getLocalDateKey();
    const routines = (routinesRes.data || []).map(r => ({
      id: r.id,
      title: r.title,
      time: r.time?.substring(0, 5) || '09:00',
      type: r.type || 'morning',
      doneDate: r.done_date ? String(r.done_date).slice(0, 10) : null,
      done: r.done_date ? String(r.done_date).slice(0, 10) === todayKey : (r.is_done || false),
    }));

    return { pipelines, routines };
  } catch (err) {
    console.error('Supabase load error:', err);
    return null;
  }
}

export async function saveToSupabase(userId, { pipelines, routines }) {
  if (!isSupabaseConfigured() || !userId) return false;

  try {
    const workspaceId = await ensureWorkspaceId(userId);
    if (!workspaceId) return false;

    // Upsert pipelines
    for (let i = 0; i < pipelines.length; i++) {
      const p = pipelines[i];
      const { data: pipeline } = await supabase
        .from('pipelines')
        .upsert({
          id: p.id,
          workspace_id: workspaceId,
          title: p.title,
          subtitle: p.subtitle || '',
          color: p.color || 'blue',
          icon_type: p.iconType || 'briefcase',
          position: i,
        }, { onConflict: 'id' })
        .select('id')
        .single();

      if (pipeline && p.steps) {
        for (let j = 0; j < p.steps.length; j++) {
          const s = p.steps[j];
          await supabase.from('steps').upsert({
            id: s.id,
            pipeline_id: pipeline.id,
            title: s.title,
            description: s.description || '',
            status: s.status || 'pending',
            position: j,
          }, { onConflict: 'id' });
        }
      }
    }

    // Upsert routines
    const todayKey = getLocalDateKey();
    for (const r of routines) {
      const doneDate = r.doneDate || (r.done ? todayKey : null);
      await supabase.from('routines').upsert({
        id: r.id,
        workspace_id: workspaceId,
        title: r.title,
        time: r.time || '09:00',
        type: r.type || 'morning',
        is_done: r.done || false,
        done_date: doneDate,
      }, { onConflict: 'id' });
    }

    return true;
  } catch (err) {
    console.error('Supabase save error:', err);
    return false;
  }
}
