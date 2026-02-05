/**
 * memU Memory Tracker
 * 사용자 행동을 백엔드를 통해 memU에 기록합니다.
 * 모든 호출은 fire-and-forget (실패해도 앱에 영향 없음)
 */

import { useAuthStore } from '../store/useAuthStore';

const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';
const API_KEY = import.meta.env.VITE_API_SECRET_KEY || '';

const getSupabaseAccessToken = () => {
  try {
    const session = useAuthStore?.getState?.()?.session;
    const token = session?.access_token;
    return typeof token === 'string' ? token : '';
  } catch {
    return '';
  }
};

function track(userId, actionType, data) {
  if (!BACKEND_URL || !userId) return;

  const accessToken = getSupabaseAccessToken();
  fetch(`${BACKEND_URL}/api/memory/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY && { 'X-API-Key': API_KEY }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: JSON.stringify({ user_id: userId, action_type: actionType, data }),
  }).catch(() => {}); // fire-and-forget
}

export const memoryTracker = {
  routineCompleted: (userId, routine) =>
    track(userId, 'routine_completed', {
      title: routine.title,
      time: routine.time,
      completedAt: new Date().toISOString(),
    }),

  routineSkipped: (userId, routine) =>
    track(userId, 'routine_skipped', {
      title: routine.title,
      time: routine.time,
      skippedAt: new Date().toISOString(),
    }),

  stepCompleted: (userId, pipelineTitle, stepTitle) =>
    track(userId, 'step_completed', {
      pipeline: pipelineTitle,
      step: stepTitle,
      completedAt: new Date().toISOString(),
    }),

  pipelineCreated: (userId, title) =>
    track(userId, 'pipeline_created', {
      title,
      createdAt: new Date().toISOString(),
    }),

  aiRecommendationUsed: (userId, recommendation) =>
    track(userId, 'ai_recommendation_used', {
      task: recommendation.task,
      reason: recommendation.reason,
      usedAt: new Date().toISOString(),
    }),

  sessionStart: (userId) =>
    track(userId, 'session_start', {
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      startedAt: new Date().toISOString(),
    }),

  chaosDumpSaved: (userId, { snippet = '', length = 0, hasParsed = false, status = 'inbox' } = {}) =>
    track(userId, 'chaos_dump_saved', {
      snippet,
      length,
      hasParsed,
      status,
      savedAt: new Date().toISOString(),
    }),

  chaosDumpApplied: (userId, { workflowsApplied = 0, routinesApplied = 0, notesCount = 0 } = {}) =>
    track(userId, 'chaos_dump_applied', {
      workflowsApplied,
      routinesApplied,
      notesCount,
      appliedAt: new Date().toISOString(),
    }),

  routinePatternCoachUsed: (userId, { routinesCount = 0, historyCount = 0, usedAt = '' } = {}) =>
    track(userId, 'routine_pattern_coach_used', {
      routinesCount,
      historyCount,
      usedAt: usedAt || new Date().toISOString(),
    }),

  energySet: (userId, { level = 'medium', source = 'ui' } = {}) =>
    track(userId, 'energy_set', {
      level,
      source,
      at: new Date().toISOString(),
    }),

  timerStarted: (userId, { task = '', estimatedMinutes = 0, source = 'whats_next' } = {}) =>
    track(userId, 'timer_started', {
      task,
      estimatedMinutes,
      source,
      startedAt: new Date().toISOString(),
    }),

  timerCompleted: (userId, { task = '', totalSeconds = 0, source = 'whats_next' } = {}) =>
    track(userId, 'timer_completed', {
      task,
      totalSeconds,
      source,
      completedAt: new Date().toISOString(),
    }),

  chaosDumpOrganized: (userId, { length = 0, workflows = 0, routines = 0, notes = 0 } = {}) =>
    track(userId, 'chaos_dump_organized', {
      length,
      workflows,
      routines,
      notes,
      organizedAt: new Date().toISOString(),
    }),

  chaosInboxOpened: (userId, { source = 'header' } = {}) =>
    track(userId, 'chaos_inbox_opened', {
      source,
      openedAt: new Date().toISOString(),
    }),

  chaosDumpOpened: (userId, { dumpId = '', status = 'inbox', source = 'inbox' } = {}) =>
    track(userId, 'chaos_dump_opened', {
      dumpId,
      status,
      source,
      openedAt: new Date().toISOString(),
    }),

  chaosApplyPartial: (userId, { dumpId = '', selectedWorkflows = 0, selectedRoutines = 0 } = {}) =>
    track(userId, 'chaos_apply_partial', {
      dumpId,
      selectedWorkflows,
      selectedRoutines,
      at: new Date().toISOString(),
    }),
};
