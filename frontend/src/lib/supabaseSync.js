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
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) return null;
  return Array.isArray(data) && data.length > 0 ? data[0]?.id || null : null;
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

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

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

    const pipelineList = Array.isArray(pipelines) ? pipelines : [];
    const routineList = Array.isArray(routines) ? routines : [];

    const pipelineRows = pipelineList.map((p, i) => ({
      id: p.id,
      workspace_id: workspaceId,
      title: p.title,
      subtitle: p.subtitle || '',
      color: p.color || 'blue',
      icon_type: p.iconType || 'briefcase',
      position: i,
    }));

    const stepRows = [];
    for (const p of pipelineList) {
      const steps = Array.isArray(p.steps) ? p.steps : [];
      for (let j = 0; j < steps.length; j++) {
        const s = steps[j];
        stepRows.push({
          id: s.id,
          pipeline_id: p.id,
          title: s.title,
          description: s.description || '',
          status: s.status || 'pending',
          position: j,
        });
      }
    }

    const todayKey = getLocalDateKey();
    const routineRows = routineList.map((r) => {
      const doneDate = r.doneDate || (r.done ? todayKey : null);
      return {
        id: r.id,
        workspace_id: workspaceId,
        title: r.title,
        time: r.time || '09:00',
        type: r.type || 'morning',
        is_done: r.done || false,
        done_date: doneDate,
      };
    });

    // Upsert in bulk (reduces requests + avoids partial writes)
    if (pipelineRows.length > 0) {
      const { error } = await supabase
        .from('pipelines')
        .upsert(pipelineRows, { onConflict: 'id' });
      if (error) throw error;
    }

    if (stepRows.length > 0) {
      const { error } = await supabase
        .from('steps')
        .upsert(stepRows, { onConflict: 'id' });
      if (error) throw error;
    }

    if (routineRows.length > 0) {
      const { error } = await supabase
        .from('routines')
        .upsert(routineRows, { onConflict: 'id' });
      if (error) throw error;
    }

    // Reconcile deletions: cloud should not resurrect deleted local items.
    const localPipelineIds = pipelineList.map(p => p.id).filter(Boolean);
    const localPipelineIdSet = new Set(localPipelineIds);
    const localRoutineIds = routineList.map(r => r.id).filter(Boolean);
    const localRoutineIdSet = new Set(localRoutineIds);
    const localStepIdSet = new Set(stepRows.map(s => s.id).filter(Boolean));

    const remotePipelinesRes = await supabase
      .from('pipelines')
      .select('id')
      .eq('workspace_id', workspaceId);
    if (remotePipelinesRes.error) throw remotePipelinesRes.error;

    const stalePipelineIds = (remotePipelinesRes.data || [])
      .map(p => p.id)
      .filter(id => id && !localPipelineIdSet.has(id));

    for (const batch of chunk(stalePipelineIds, 100)) {
      const { error } = await supabase.from('pipelines').delete().in('id', batch);
      if (error) throw error;
    }

    const remoteRoutinesRes = await supabase
      .from('routines')
      .select('id')
      .eq('workspace_id', workspaceId);
    if (remoteRoutinesRes.error) throw remoteRoutinesRes.error;

    const staleRoutineIds = (remoteRoutinesRes.data || [])
      .map(r => r.id)
      .filter(id => id && !localRoutineIdSet.has(id));

    for (const batch of chunk(staleRoutineIds, 100)) {
      const { error } = await supabase.from('routines').delete().in('id', batch);
      if (error) throw error;
    }

    if (localPipelineIds.length > 0) {
      const remoteStepsRes = await supabase
        .from('steps')
        .select('id,pipeline_id')
        .in('pipeline_id', localPipelineIds);
      if (remoteStepsRes.error) throw remoteStepsRes.error;

      const staleStepIds = (remoteStepsRes.data || [])
        .map(s => s.id)
        .filter(id => id && !localStepIdSet.has(id));

      for (const batch of chunk(staleStepIds, 100)) {
        const { error } = await supabase.from('steps').delete().in('id', batch);
        if (error) throw error;
      }
    }

    return true;
  } catch (err) {
    console.error('Supabase save error:', err);
    return false;
  }
}
