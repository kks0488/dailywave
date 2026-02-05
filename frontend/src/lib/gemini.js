import { logger } from './logger';
import { askAi, getAiStatus } from './aiClient';
import {
  buildAnalyzeRoutinePatternsPrompt,
  buildChaosDumpPrompt,
  buildDailySummaryPrompt,
  buildEnhanceWorkflowPrompt,
  buildEstimateTaskTimePrompt,
  buildParseCommandPrompt,
  buildQuickActionsPrompt,
  buildSuggestOptimalTimePrompt,
  buildSystemPrompt,
  buildWhatsNextPrompt,
  getCurrentLanguageCode,
  getFallbackTexts,
} from './aiPrompts';
import {
  parseFirstJsonObject,
  parseGreedyJsonObject,
  parseJsonArray,
  normalizeChaosParseResult,
} from './aiParsers';

let _cachedApiKey = null;

export const getApiKey = () => {
  if (_cachedApiKey !== null) return _cachedApiKey;
  _cachedApiKey = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  return _cachedApiKey;
};

export const setApiKey = (key) => {
  localStorage.setItem('gemini_api_key', key);
  _cachedApiKey = key;
};

export const hasApiKey = () => !!getApiKey();

export const getAiProxyStatus = async (options = {}) => getAiStatus(options);

export const askGemini = async (prompt, context = {}, userId = null) => {
  const systemPrompt = buildSystemPrompt();
  return askAi({
    prompt,
    context,
    userId,
    systemPrompt,
    getLocalApiKey: getApiKey,
  });
};

export const getWhatsNext = async (pipelines, routines, currentEnergy = 'medium', userId = null) => {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const activeTasks = [];
  pipelines.forEach((p) => {
    p.steps?.forEach((step, idx) => {
      if (step.status === 'active' || step.status === 'pending') {
        const stepTitle = step.title || step.name;
        if (!stepTitle) return;
        activeTasks.push({
          type: 'workflow',
          pipeline: p.title,
          task: stepTitle,
          status: step.status,
          position: idx + 1,
          memo: step.description || step.memo,
        });
      }
    });
  });

  const pendingRoutines = routines
    .filter((r) => !r.done)
    .map((r) => ({
      type: 'routine',
      task: r.title,
      time: r.time,
      period: r.type,
    }));

  const prompt = buildWhatsNextPrompt({
    activeTasks,
    pendingRoutines,
    timeOfDay,
    hour,
    currentEnergy,
  });

  let response = '';
  try {
    response = await askGemini(prompt, { timeOfDay, currentEnergy }, userId);
  } catch {
    logger.warn('AI request failed. Falling back to local recommendation.');
  }
  logger.log('Raw AI response:', response);

  try {
    const parsed = parseFirstJsonObject(response);
    if (parsed) {
      const fallbacks = getFallbackTexts().whatsNext;

      const task = typeof parsed?.task === 'string' ? parsed.task.trim() : '';
      if (!task) throw new Error('Invalid AI response: missing task');

      const reason =
        typeof parsed?.reason === 'string' && parsed.reason.trim()
          ? parsed.reason.trim()
          : fallbacks.reasonActiveTask;

      const estimatedRaw = Number(parsed?.estimatedMinutes);
      const estimatedMinutes = Number.isFinite(estimatedRaw)
        ? Math.min(60, Math.max(5, Math.round(estimatedRaw)))
        : 25;

      const encouragement =
        typeof parsed?.encouragement === 'string' && parsed.encouragement.trim()
          ? parsed.encouragement.trim()
          : fallbacks.encouragement;

      const normalized = { task, reason, estimatedMinutes, encouragement };
      logger.log('Parsed AI response:', normalized);
      return normalized;
    }
    logger.warn('No JSON found in response');
  } catch (e) {
    console.error('Failed to parse AI response:', e, response);
  }

  if (activeTasks.length > 0) {
    const fallbacks = getFallbackTexts().whatsNext;
    return {
      task: activeTasks[0].task,
      reason: fallbacks.reasonActiveTask,
      estimatedMinutes: 25,
      encouragement: fallbacks.encouragement,
    };
  }

  const fallbacks = getFallbackTexts().whatsNext;
  return {
    task: fallbacks.emptyTask,
    reason: fallbacks.reasonEmpty,
    estimatedMinutes: 5,
    encouragement: fallbacks.encouragement,
  };
};

export const parseAICommand = async (userInput, pipelines, routines, userId = null) => {
  const workflowNames = pipelines.map((p) => p.title).join(', ') || 'None';
  const prompt = buildParseCommandPrompt({ userInput, workflowNames });

  const response = await askGemini(prompt, {}, userId);
  logger.log('AI command raw response:', response);

  try {
    const parsed = parseGreedyJsonObject(response);
    if (parsed) {
      const confirmation =
        typeof parsed.confirmation === 'string' ? parsed.confirmation : getFallbackTexts().commandUnknown;
      const data = parsed && typeof parsed.data === 'object' ? parsed.data : {};

      const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
      const normalizeSteps = (value) => {
        const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
        return raw.map((step) => (typeof step === 'string' ? step.trim() : '')).filter(Boolean);
      };

      const buildWorkflowCreatedMessage = (workflowTitle, stepTitle) => {
        const isKorean = getCurrentLanguageCode() === 'ko';
        if (stepTitle) {
          return isKorean
            ? `"${workflowTitle}" 워크플로우를 만들고 "${stepTitle}" 스텝을 추가했어요.`
            : `Created "${workflowTitle}" and added "${stepTitle}".`;
        }
        return isKorean
          ? `"${workflowTitle}" 워크플로우를 만들었어요.`
          : `Created "${workflowTitle}" workflow.`;
      };

      const action = typeof parsed.action === 'string' ? parsed.action : 'unknown';

      if (action === 'add_routine') {
        const title = normalizeText(data.title);
        const time = normalizeText(data.time) || '09:00';
        if (!title) {
          return { action: 'unknown', data: {}, confirmation: getFallbackTexts().commandUnknown };
        }
        return { action: 'add_routine', data: { title, time }, confirmation };
      }

      if (action === 'add_workflow_step') {
        const title = normalizeText(data.title);
        const workflow = normalizeText(data.workflow);
        if (!title || !workflow) {
          return { action: 'unknown', data: {}, confirmation: getFallbackTexts().commandUnknown };
        }

        const match = pipelines.find((p) => p.title.toLowerCase().includes(workflow.toLowerCase()));
        if (!match) {
          return {
            action: 'add_workflow',
            data: { title: workflow, subtitle: '', steps: [title] },
            confirmation: buildWorkflowCreatedMessage(workflow, title),
          };
        }

        return { action: 'add_workflow_step', data: { title, workflow }, confirmation };
      }

      if (action === 'add_workflow') {
        const title = normalizeText(data.title);
        if (!title) {
          return { action: 'unknown', data: {}, confirmation: getFallbackTexts().commandUnknown };
        }

        const subtitle = normalizeText(data.subtitle);
        const steps = normalizeSteps(data.steps);
        return { action: 'add_workflow', data: { title, subtitle, steps }, confirmation };
      }

      return { action: 'unknown', data: {}, confirmation: getFallbackTexts().commandUnknown };
    }
  } catch (e) {
    console.error('Failed to parse command:', e, response);
  }

  return { action: 'unknown', data: {}, confirmation: getFallbackTexts().commandUnknown };
};

export const parseChaosDump = async (text, pipelines, routines, userId = null) => {
  const input = typeof text === 'string' ? text.trim() : '';
  if (!input) return { workflows: [], routines: [], notes: [] };

  const workflowTitles = (Array.isArray(pipelines) ? pipelines : [])
    .map((p) => (typeof p?.title === 'string' ? p.title : ''))
    .filter(Boolean);
  const routineTitles = (Array.isArray(routines) ? routines : [])
    .map((r) => ({
      title: typeof r?.title === 'string' ? r.title : '',
      time: typeof r?.time === 'string' ? r.time : '',
    }))
    .filter((r) => r.title);

  const prompt = buildChaosDumpPrompt({
    input,
    workflowTitles,
    routineTitles,
  });

  const response = await askGemini(prompt, {}, userId);
  logger.log('Chaos dump raw response:', response);

  try {
    const parsed = parseGreedyJsonObject(response);
    if (parsed) {
      return normalizeChaosParseResult(parsed, pipelines, routines);
    }
  } catch (e) {
    console.error('Failed to parse chaos dump:', e, response);
  }

  return { workflows: [], routines: [], notes: [] };
};

export const estimateTaskTime = async (taskName, taskMemo = '', userId = null) => {
  const prompt = buildEstimateTaskTimePrompt({ taskName, taskMemo });
  const response = await askGemini(prompt, {}, userId);

  try {
    const parsed = parseGreedyJsonObject(response);
    if (parsed) return parsed;
  } catch (e) {
    console.error('Failed to parse time estimate:', e);
  }

  return { minutes: 25, breakdown: null };
};

export const getDailySummary = async (pipelines, routines, userId = null) => {
  const completedRoutines = routines.filter((r) => r.done);
  const pendingRoutines = routines.filter((r) => !r.done);

  const completedTasks = [];
  const pendingTasks = [];

  pipelines.forEach((p) => {
    p.steps?.forEach((step) => {
      const stepTitle = step.title || step.name;
      if (!stepTitle) return;
      if (step.status === 'done') {
        completedTasks.push({ pipeline: p.title, task: stepTitle });
      } else if (step.status === 'active' || step.status === 'pending' || step.status === 'locked') {
        pendingTasks.push({ pipeline: p.title, task: stepTitle });
      }
    });
  });

  const prompt = buildDailySummaryPrompt({
    completedRoutines,
    completedTasks,
    pendingRoutines,
    pendingTasks,
  });

  const response = await askGemini(prompt, {}, userId);

  try {
    const parsed = parseGreedyJsonObject(response);
    if (parsed) return parsed;
  } catch (e) {
    console.error('Failed to parse daily summary:', e);
  }

  return getFallbackTexts().dailySummary;
};

export const suggestOptimalTime = async (taskTitle, userEnergy = 'medium', userId = null) => {
  const hour = new Date().getHours();

  const prompt = buildSuggestOptimalTimePrompt({
    taskTitle,
    hour,
    userEnergy,
  });

  const response = await askGemini(prompt, {}, userId);

  try {
    const parsed = parseGreedyJsonObject(response);
    if (parsed) return parsed;
  } catch (e) {
    console.error('Failed to parse time suggestion:', e);
  }

  return getFallbackTexts().suggestOptimalTime;
};

export const analyzeRoutinePatterns = async (routines, completionHistory = [], userId = null) => {
  const routineStats = routines.map((r) => ({
    title: r.title,
    time: r.time,
    type: r.type,
    done: r.done,
  }));

  const prompt = buildAnalyzeRoutinePatternsPrompt({ routineStats, completionHistory });
  const response = await askGemini(prompt, {}, userId);

  try {
    const parsed = parseGreedyJsonObject(response);
    if (parsed) return parsed;
  } catch (e) {
    console.error('Failed to parse pattern analysis:', e);
  }

  return getFallbackTexts().analyzeRoutinePatterns;
};

export const getQuickActions = async (pipelines, routines, currentEnergy = 'medium', userId = null) => {
  const hour = new Date().getHours();
  const pendingRoutines = routines.filter((r) => !r.done);
  const activeTasks = [];

  pipelines.forEach((p) => {
    p.steps?.forEach((step) => {
      if (step.status === 'active' || step.status === 'pending') {
        const stepTitle = step.title || step.name;
        if (!stepTitle) return;
        activeTasks.push({ pipeline: p.title, task: stepTitle, status: step.status });
      }
    });
  });

  const prompt = buildQuickActionsPrompt({
    hour,
    currentEnergy,
    pendingRoutines,
    activeTasks,
  });

  const response = await askGemini(prompt, {}, userId);

  try {
    const parsed = parseJsonArray(response);
    if (parsed) return parsed;
  } catch (e) {
    console.error('Failed to parse quick actions:', e);
  }

  return getFallbackTexts().quickActions;
};

export const enhanceWorkflow = async (workflowTitle, currentSteps, userId = null) => {
  const stepsText =
    currentSteps.length > 0
      ? currentSteps.map((s, i) => `${i + 1}. ${s.title || s.name || ''}`).join('\n')
      : 'No steps yet';

  const prompt = buildEnhanceWorkflowPrompt({ workflowTitle, stepsText });
  const response = await askGemini(prompt, {}, userId);

  try {
    const parsed = parseGreedyJsonObject(response);
    if (parsed) return parsed;
  } catch (e) {
    console.error('Failed to parse workflow enhancement:', e);
  }

  const fallback = getFallbackTexts().workflow;
  return {
    analysis: fallback.analysis,
    suggestions: [],
    optimizedFlow: currentSteps.map((s) => s.title || s.name).filter(Boolean),
  };
};
