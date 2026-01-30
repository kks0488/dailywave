import { logger } from './logger';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const BACKEND_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
const BACKEND_AI_URL = BACKEND_BASE_URL
  ? `${BACKEND_BASE_URL}/api/ai/ask`
  : null;

// Hoisted RegExp (avoid re-creation per call)
const JSON_OBJECT_RE = /\{[\s\S]*?\}/;
const JSON_OBJECT_GREEDY_RE = /\{[\s\S]*\}/;
const JSON_ARRAY_RE = /\[[\s\S]*\]/;

// Cached localStorage reads
let _cachedApiKey = null;
let _cachedLang = null;

export const getApiKey = () => {
  if (_cachedApiKey !== null) return _cachedApiKey;
  _cachedApiKey = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  return _cachedApiKey;
};

const getCurrentLanguageCode = () => {
  if (_cachedLang !== null) return _cachedLang;
  const lang = localStorage.getItem('i18nextLng') || navigator.language || 'en';
  _cachedLang = lang.startsWith('ko') ? 'ko' : 'en';
  return _cachedLang;
};

const getLanguageLabel = () => (getCurrentLanguageCode() === 'ko' ? 'Korean' : 'English');

const getLanguageInstruction = () => {
  const lang = getLanguageLabel();
  return `IMPORTANT: Respond in ${lang}. All text fields must be in ${lang}.`;
};

const getFallbackTexts = () => {
  const isKorean = getCurrentLanguageCode() === 'ko';
  return {
    whatsNext: isKorean
      ? {
          reasonActiveTask: "첫 번째 진행 중인 작업부터 시작해요",
          reasonEmpty: "할 일이 아직 없어요",
          encouragement: "지금 시작하면 돼요!",
          emptyTask: "5분 휴식하기",
          task: "휴식"
        }
      : {
          reasonActiveTask: "Start with your first active task",
          reasonEmpty: "No pending tasks found",
          encouragement: "You got this! Just start.",
          emptyTask: "Take a 5-minute break",
          task: "Break"
        },
    commandUnknown: isKorean
      ? "명령을 이해하지 못했습니다. 다시 시도해주세요."
      : "I did not understand that. Please try again.",
    dailySummary: isKorean
      ? {
          celebration: "오늘도 수고했어요!",
          tomorrowTip: "가장 중요한 일부터 시작해요.",
          mood: "good"
        }
      : {
          celebration: "Great effort today!",
          tomorrowTip: "Start with your most important task first.",
          mood: "good"
        },
    quickActions: isKorean
      ? [
          { action: "2분 스트레칭", type: "break", duration: 2, emoji: "🧘" },
          { action: "다음 작업 확인", type: "quick_win", duration: 5, emoji: "📋" },
          { action: "물 한 잔 마시기", type: "break", duration: 1, emoji: "💧" }
        ]
      : [
          { action: "Take a 2-minute stretch break", type: "break", duration: 2, emoji: "🧘" },
          { action: "Review your next task", type: "quick_win", duration: 5, emoji: "📋" },
          { action: "Drink some water", type: "break", duration: 1, emoji: "💧" }
        ],
    suggestOptimalTime: isKorean
      ? {
          suggestedTime: "09:00",
          reason: "오전이 집중하기 좋아요",
          alternativeTime: "14:00",
          energyRequired: "medium"
        }
      : {
          suggestedTime: "09:00",
          reason: "Morning is best for important tasks",
          alternativeTime: "14:00",
          energyRequired: "medium"
        },
    analyzeRoutinePatterns: isKorean
      ? {
          insights: [{ type: "positive", message: "좋은 흐름이에요!", affectedRoutine: null }],
          overallScore: 70,
          topSuggestion: "아침 루틴부터 처리해요."
        }
      : {
          insights: [{ type: "positive", message: "Keep up the good work!", affectedRoutine: null }],
          overallScore: 70,
          topSuggestion: "Try to complete morning routines first."
        },
    workflow: isKorean
      ? {
          analysis: "워크플로우를 분석하지 못했어요. 다시 시도해주세요.",
          suggestions: [],
          optimizedFlow: []
        }
      : {
          analysis: "Could not analyze workflow. Try again.",
          suggestions: [],
          optimizedFlow: []
        }
  };
};

export const setApiKey = (key) => {
  localStorage.setItem('gemini_api_key', key);
  _cachedApiKey = key; // invalidate cache
};

export const hasApiKey = () => {
  return !!getApiKey();
};

export const askGemini = async (prompt, context = {}, userId = null) => {
  const systemPrompt = `You are DailyWave AI, an ADHD-friendly productivity assistant.
Your role is to help users with time blindness and decision paralysis.
Be concise, encouraging, and never judgmental.
Current time: ${new Date().toLocaleTimeString()}
Current date: ${new Date().toLocaleDateString()}
${getLanguageInstruction()}`;

  // Prefer backend proxy (API key stays server-side)
  if (BACKEND_AI_URL) {
    const apiSecretKey = import.meta.env.VITE_API_SECRET_KEY || '';
    const response = await fetch(BACKEND_AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiSecretKey && { 'X-API-Key': apiSecretKey }),
      },
      body: JSON.stringify({
        prompt,
        context,
        system_prompt: systemPrompt,
        ...(userId && { user_id: userId }),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Backend AI error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  }

  // Fallback: direct Gemini call (for local dev without backend)
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please set your Gemini API key in Settings.');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nContext: ${JSON.stringify(context)}\n\nUser request: ${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    })
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error?.message || error.message || JSON.stringify(error);
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

export const getWhatsNext = async (pipelines, routines, currentEnergy = 'medium', userId = null) => {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  
  const activeTasks = [];
  
  pipelines.forEach(p => {
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
          memo: step.description || step.memo
        });
      }
    });
  });

  const pendingRoutines = routines
    .filter(r => !r.done)
    .map(r => ({
      type: 'routine',
      task: r.title,
      time: r.time,
      period: r.type
    }));

  const prompt = `Based on the user's current tasks, recommend ONE specific task to focus on RIGHT NOW.

Active workflow tasks: ${JSON.stringify(activeTasks)}
Pending routines: ${JSON.stringify(pendingRoutines)}
Time of day: ${timeOfDay} (${hour}:00)
Energy level: ${currentEnergy}

${getLanguageInstruction()}

Respond in this exact JSON format only, no other text:
{
  "task": "The specific task name",
  "reason": "One short sentence why this task now (max 15 words)",
  "estimatedMinutes": number between 5-60,
  "encouragement": "A short ADHD-friendly encouragement (max 10 words)"
}`;

  const response = await askGemini(prompt, { timeOfDay, currentEnergy }, userId);
  logger.log('Raw AI response:', response);

  try {
    const jsonMatch = response.match(JSON_OBJECT_RE);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      logger.log('Parsed AI response:', parsed);
      return parsed;
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
      encouragement: fallbacks.encouragement
    };
  }
  
  const fallbacks = getFallbackTexts().whatsNext;
  return {
    task: fallbacks.emptyTask,
    reason: fallbacks.reasonEmpty,
    estimatedMinutes: 5,
    encouragement: fallbacks.encouragement
  };
};

export const parseAICommand = async (userInput, pipelines, routines, userId = null) => {
  const workflowNames = pipelines.map(p => p.title).join(', ') || 'None';
  const langLabel = getLanguageLabel();
  
  const prompt = `You are a JSON-only parser. Parse this command and return ONLY valid JSON.

INPUT: "${userInput}"
WORKFLOWS: ${workflowNames}

RULES:
- Output ONLY JSON, no explanation, no markdown
- Extract the task/action from the input
- Match workflow names if mentioned (fuzzy match OK)
- If the user asks to create a new workflow/pipeline, use "add_workflow"
- If the user wants to add a step but no matching workflow exists, use "add_workflow" and include the step in "steps"
- Time format: HH:MM (24h)
- ${getLanguageInstruction()}

OUTPUT FORMAT (strict JSON):
{"action":"add_routine","data":{"title":"task","time":"09:00"},"confirmation":"confirmation message in ${langLabel}"}
{"action":"add_workflow_step","data":{"title":"step","workflow":"workflow name"},"confirmation":"confirmation message in ${langLabel}"}
{"action":"add_workflow","data":{"title":"workflow name","subtitle":"optional","steps":["Step 1","Step 2"]},"confirmation":"confirmation message in ${langLabel}"}
{"action":"unknown","data":{},"confirmation":"error message in ${langLabel}"}

NOW PARSE AND OUTPUT JSON ONLY:`;

  const response = await askGemini(prompt, {}, userId);
  logger.log('AI command raw response:', response);
  
  try {
    const jsonMatch = response.match(JSON_OBJECT_GREEDY_RE);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const confirmation = typeof parsed.confirmation === 'string' ? parsed.confirmation : getFallbackTexts().commandUnknown;
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
            confirmation: buildWorkflowCreatedMessage(workflow, title)
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

const normalizeTimeHHMM = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  const [hh, mm] = text.split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const normalizeChaosParseResult = (raw, pipelines, routines) => {
  const base = typeof raw === 'object' && raw !== null ? raw : {};

  const existingWorkflows = new Set(
    (Array.isArray(pipelines) ? pipelines : [])
      .map((p) => (typeof p?.title === 'string' ? p.title.trim().toLowerCase() : ''))
      .filter(Boolean)
  );

  const existingRoutines = new Set(
    (Array.isArray(routines) ? routines : [])
      .map((r) => {
        const title = typeof r?.title === 'string' ? r.title.trim().toLowerCase() : '';
        const time = normalizeTimeHHMM(r?.time) || '';
        return title ? `${title}|${time}` : '';
      })
      .filter(Boolean)
  );

  const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
  const normalizeList = (value) => {
    const rawList = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    return rawList.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  };

  const workflowsRaw = Array.isArray(base.workflows) ? base.workflows : [];
  const workflows = workflowsRaw
    .map((workflow) => {
      const wf = typeof workflow === 'object' && workflow !== null ? workflow : {};
      const title = normalizeText(wf.title);
      if (!title) return null;
      if (existingWorkflows.has(title.toLowerCase())) return null;

      const steps = normalizeList(wf.steps).slice(0, 12);
      if (steps.length === 0) return null;

      return {
        title,
        subtitle: normalizeText(wf.subtitle),
        steps,
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  const routinesRaw = Array.isArray(base.routines) ? base.routines : [];
  const routinesNormalized = routinesRaw
    .map((routine) => {
      const r = typeof routine === 'object' && routine !== null ? routine : {};
      const title = normalizeText(r.title);
      if (!title) return null;

      const time = normalizeTimeHHMM(r.time) || '09:00';
      const hour = Number.parseInt(time.split(':')[0], 10);
      const type = hour >= 12 ? 'afternoon' : 'morning';

      if (existingRoutines.has(`${title.toLowerCase()}|${time}`)) return null;

      return { title, time, type };
    })
    .filter(Boolean)
    .slice(0, 8);

  const notes = normalizeList(base.notes).slice(0, 12);

  return {
    workflows,
    routines: routinesNormalized,
    notes,
  };
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

  const prompt = `You are a JSON-only organizer. Turn the user's unstructured brain dump into actionable items.

USER INPUT:
${input}

EXISTING WORKFLOWS (avoid duplicates):
${JSON.stringify(workflowTitles)}

EXISTING ROUTINES (avoid duplicates):
${JSON.stringify(routineTitles)}

RULES:
- Output ONLY valid JSON (no markdown, no commentary)
- Prefer small, concrete steps (ADHD-friendly)
- If something is unclear, put it into "notes" instead of guessing
- For routines, use time format HH:MM (24h)
- Keep it compact (max 5 workflows, max 8 routines, max 12 notes)
- ${getLanguageInstruction()}

OUTPUT SCHEMA (strict):
{
  "workflows": [{"title":"...","subtitle":"optional","steps":["Step 1","Step 2"]}],
  "routines": [{"title":"...","time":"09:00"}],
  "notes": ["..."]
}`;

  const response = await askGemini(prompt, {}, userId);
  logger.log('Chaos dump raw response:', response);

  try {
    const jsonMatch = response.match(JSON_OBJECT_GREEDY_RE);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return normalizeChaosParseResult(parsed, pipelines, routines);
    }
  } catch (e) {
    console.error('Failed to parse chaos dump:', e, response);
  }

  return { workflows: [], routines: [], notes: [] };
};

export const estimateTaskTime = async (taskName, taskMemo = '', userId = null) => {
  const prompt = `Estimate how long this task will take for someone with ADHD (include buffer time for context switching).

Task: ${taskName}
${taskMemo ? `Details: ${taskMemo}` : ''}

${getLanguageInstruction()}

Respond with ONLY a JSON object, no other text:
{
  "minutes": number between 5-120,
  "breakdown": "Brief breakdown if task > 15 min"
}`;

  const response = await askGemini(prompt, {}, userId);
  
  try {
    const jsonMatch = response.match(JSON_OBJECT_GREEDY_RE);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse time estimate:', e);
  }
  
  return { minutes: 25, breakdown: null };
};

export const getDailySummary = async (pipelines, routines, userId = null) => {
  const completedRoutines = routines.filter(r => r.done);
  const pendingRoutines = routines.filter(r => !r.done);
  
  const completedTasks = [];
  const pendingTasks = [];
  
  pipelines.forEach(p => {
    p.steps?.forEach(step => {
      const stepTitle = step.title || step.name;
      if (!stepTitle) return;
      if (step.status === 'done') {
        completedTasks.push({ pipeline: p.title, task: stepTitle });
      } else if (step.status === 'active' || step.status === 'pending' || step.status === 'locked') {
        pendingTasks.push({ pipeline: p.title, task: stepTitle });
      }
    });
  });

  const prompt = `You are DailyWave AI. Generate a daily summary for an ADHD user.

COMPLETED TODAY:
- Routines: ${completedRoutines.map(r => r.title).join(', ') || 'None'}
- Workflow tasks: ${completedTasks.map(t => t.task).join(', ') || 'None'}

STILL PENDING:
- Routines: ${pendingRoutines.map(r => r.title).join(', ') || 'None'}
- Workflow tasks: ${pendingTasks.map(t => t.task).join(', ') || 'None'}

Current time: ${new Date().toLocaleTimeString()}

${getLanguageInstruction()}

Respond with ONLY this JSON format:
{
  "celebration": "Short celebration message for what they accomplished (max 15 words)",
  "completedCount": ${completedRoutines.length + completedTasks.length},
  "pendingCount": ${pendingRoutines.length + pendingTasks.length},
  "tomorrowTip": "One specific tip for tomorrow based on pending items (max 20 words)",
  "mood": "great" | "good" | "okay" | "needs_improvement"
}`;

  const response = await askGemini(prompt, {}, userId);
  
  try {
    const jsonMatch = response.match(JSON_OBJECT_GREEDY_RE);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse daily summary:', e);
  }
  
  return getFallbackTexts().dailySummary;
};

export const suggestOptimalTime = async (taskTitle, userEnergy = 'medium', userId = null) => {
  const hour = new Date().getHours();
  
  const prompt = `You are DailyWave AI. Suggest the best time to do this task for someone with ADHD.

Task: ${taskTitle}
Current hour: ${hour}:00
User's current energy: ${userEnergy}

Consider:
- Morning (6-11): Best for focused work, important decisions
- Midday (11-14): Good for meetings, collaborative work
- Afternoon (14-17): Good for routine tasks, emails
- Evening (17-21): Creative work, planning
- Night (21+): Wind-down tasks only

${getLanguageInstruction()}

Respond with ONLY this JSON:
{
  "suggestedTime": "HH:MM",
  "reason": "Why this time is optimal (max 15 words)",
  "alternativeTime": "HH:MM",
  "energyRequired": "low" | "medium" | "high"
}`;

  const response = await askGemini(prompt, {}, userId);
  
  try {
    const jsonMatch = response.match(JSON_OBJECT_GREEDY_RE);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse time suggestion:', e);
  }
  
  return getFallbackTexts().suggestOptimalTime;
};

export const analyzeRoutinePatterns = async (routines, completionHistory = [], userId = null) => {
  const routineStats = routines.map(r => ({
    title: r.title,
    time: r.time,
    type: r.type,
    done: r.done
  }));

  const prompt = `You are DailyWave AI. Analyze routine patterns for an ADHD user.

Current routines: ${JSON.stringify(routineStats)}
Recent completion history: ${JSON.stringify(completionHistory.slice(-14))}

Identify patterns and suggest improvements.

Respond with ONLY this JSON:
{
  "insights": [
    {
      "type": "positive" | "warning" | "suggestion",
      "message": "Short insight (max 20 words)",
      "affectedRoutine": "routine title or null"
    }
  ],
  "overallScore": number 1-100,
  "topSuggestion": "Most important suggestion (max 25 words)"
}`;

  const response = await askGemini(prompt, {}, userId);
  
  try {
    const jsonMatch = response.match(JSON_OBJECT_GREEDY_RE);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse pattern analysis:', e);
  }
  
  return getFallbackTexts().analyzeRoutinePatterns;
};

export const getQuickActions = async (pipelines, routines, currentEnergy = 'medium', userId = null) => {
  const hour = new Date().getHours();
  const pendingRoutines = routines.filter(r => !r.done);
  const activeTasks = [];
  
  pipelines.forEach(p => {
    p.steps?.forEach(step => {
      if (step.status === 'active' || step.status === 'pending') {
        const stepTitle = step.title || step.name;
        if (!stepTitle) return;
        activeTasks.push({ pipeline: p.title, task: stepTitle, status: step.status });
      }
    });
  });

  const prompt = `You are DailyWave AI. Suggest 3 quick actions for RIGHT NOW.

Current time: ${hour}:00
Energy level: ${currentEnergy}
Pending routines: ${pendingRoutines.map(r => `${r.title} (${r.time})`).join(', ') || 'None'}
Active tasks: ${activeTasks.map(t => t.task).join(', ') || 'None'}

Rules:
- Each action should take 5-15 minutes max
- Match suggestions to energy level
- Prioritize time-sensitive items
- ${getLanguageInstruction()}

Respond with ONLY this JSON array:
[
  {
    "action": "Specific action to take",
    "type": "routine" | "task" | "break" | "quick_win",
    "duration": number (minutes),
    "emoji": "relevant emoji"
  }
]`;

  const response = await askGemini(prompt, {}, userId);
  
  try {
    const jsonMatch = response.match(JSON_ARRAY_RE);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse quick actions:', e);
  }
  
  return getFallbackTexts().quickActions;
};

export const enhanceWorkflow = async (workflowTitle, currentSteps, userId = null) => {
  const stepsText = currentSteps.length > 0 
    ? currentSteps.map((s, i) => `${i + 1}. ${s.title || s.name || ''}`).join('\n')
    : 'No steps yet';

  const prompt = `You are DailyWave AI, a workflow optimization expert.

WORKFLOW: "${workflowTitle}"
CURRENT STEPS:
${stepsText}

Analyze this workflow and suggest improvements. Think about:
- What steps might be missing between existing steps?
- What preparation steps should come first?
- What follow-up/completion steps might be needed at the end?
- Are any steps too vague and need to be broken down?

Respond with ONLY this JSON:
{
  "analysis": "Brief analysis of the workflow (max 30 words)",
  "suggestions": [
    {
      "type": "insert_before",
      "afterIndex": 0,
      "step": "Step name",
      "reason": "Why this step (max 15 words)"
    },
    {
      "type": "insert_after", 
      "afterIndex": 1,
      "step": "Step name",
      "reason": "Why this step (max 15 words)"
    },
    {
      "type": "append",
      "step": "Step name",
      "reason": "Why this step (max 15 words)"
    }
  ],
  "optimizedFlow": ["Step 1", "Step 2", "...complete optimized list"]
}

Rules:
- Maximum 5 suggestions
- type: "insert_before" (prepend to workflow), "insert_after" (insert after specific index), "append" (add to end)
- afterIndex is 0-based (0 = first step, 1 = second step, etc.)
- Keep step names concise (max 5 words each)
- Focus on practical, actionable steps for ADHD users
- ${getLanguageInstruction()}`;

  const response = await askGemini(prompt, {}, userId);
  
  try {
    const jsonMatch = response.match(JSON_OBJECT_GREEDY_RE);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse workflow enhancement:', e);
  }
  
  const fallback = getFallbackTexts().workflow;
  return {
    analysis: fallback.analysis,
    suggestions: [],
    optimizedFlow: currentSteps.map(s => s.title || s.name).filter(Boolean)
  };
};
