const readLocalStorage = (key) => {
  try {
    return globalThis?.localStorage?.getItem(key) || null;
  } catch {
    return null;
  }
};

let _cachedLang = null;

export const resetAiPromptCache = () => {
  _cachedLang = null;
};

export const getCurrentLanguageCode = () => {
  if (_cachedLang !== null) return _cachedLang;
  const lang = readLocalStorage('i18nextLng') || globalThis?.navigator?.language || 'en';
  _cachedLang = lang.startsWith('ko') ? 'ko' : 'en';
  return _cachedLang;
};

export const getLanguageLabel = () => (getCurrentLanguageCode() === 'ko' ? 'Korean' : 'English');

export const getLanguageInstruction = () => {
  const lang = getLanguageLabel();
  return `IMPORTANT: Respond in ${lang}. All text fields must be in ${lang}.`;
};

export const buildSystemPrompt = () => `You are DailyWave AI, an ADHD-friendly productivity assistant.
Your role is to help users with time blindness and decision paralysis.
Be concise, encouraging, and never judgmental.
Current time: ${new Date().toLocaleTimeString()}
Current date: ${new Date().toLocaleDateString()}
${getLanguageInstruction()}`;

export const getFallbackTexts = () => {
  const isKorean = getCurrentLanguageCode() === 'ko';
  return {
    whatsNext: isKorean
      ? {
          reasonActiveTask: '첫 번째 진행 중인 작업부터 시작해요',
          reasonEmpty: '할 일이 아직 없어요',
          encouragement: '지금 시작하면 돼요!',
          emptyTask: '5분 휴식하기',
          task: '휴식',
        }
      : {
          reasonActiveTask: 'Start with your first active task',
          reasonEmpty: 'No pending tasks found',
          encouragement: 'You got this! Just start.',
          emptyTask: 'Take a 5-minute break',
          task: 'Break',
        },
    commandUnknown: isKorean
      ? '명령을 이해하지 못했습니다. 다시 시도해주세요.'
      : 'I did not understand that. Please try again.',
    dailySummary: isKorean
      ? {
          celebration: '오늘도 수고했어요!',
          tomorrowTip: '가장 중요한 일부터 시작해요.',
          mood: 'good',
        }
      : {
          celebration: 'Great effort today!',
          tomorrowTip: 'Start with your most important task first.',
          mood: 'good',
        },
    quickActions: isKorean
      ? [
          { action: '2분 스트레칭', type: 'break', duration: 2, emoji: '🧘' },
          { action: '다음 작업 확인', type: 'quick_win', duration: 5, emoji: '📋' },
          { action: '물 한 잔 마시기', type: 'break', duration: 1, emoji: '💧' },
        ]
      : [
          { action: 'Take a 2-minute stretch break', type: 'break', duration: 2, emoji: '🧘' },
          { action: 'Review your next task', type: 'quick_win', duration: 5, emoji: '📋' },
          { action: 'Drink some water', type: 'break', duration: 1, emoji: '💧' },
        ],
    suggestOptimalTime: isKorean
      ? {
          suggestedTime: '09:00',
          reason: '오전이 집중하기 좋아요',
          alternativeTime: '14:00',
          energyRequired: 'medium',
        }
      : {
          suggestedTime: '09:00',
          reason: 'Morning is best for important tasks',
          alternativeTime: '14:00',
          energyRequired: 'medium',
        },
    analyzeRoutinePatterns: isKorean
      ? {
          insights: [{ type: 'positive', message: '좋은 흐름이에요!', affectedRoutine: null }],
          overallScore: 70,
          topSuggestion: '아침 루틴부터 처리해요.',
        }
      : {
          insights: [{ type: 'positive', message: 'Keep up the good work!', affectedRoutine: null }],
          overallScore: 70,
          topSuggestion: 'Try to complete morning routines first.',
        },
    workflow: isKorean
      ? {
          analysis: '워크플로우를 분석하지 못했어요. 다시 시도해주세요.',
          suggestions: [],
          optimizedFlow: [],
        }
      : {
          analysis: 'Could not analyze workflow. Try again.',
          suggestions: [],
          optimizedFlow: [],
        },
  };
};

export const buildWhatsNextPrompt = ({ activeTasks, pendingRoutines, timeOfDay, hour, currentEnergy }) => `Based on the user's current tasks, recommend ONE specific task to focus on RIGHT NOW.

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

export const buildParseCommandPrompt = ({ userInput, workflowNames }) => {
  const langLabel = getLanguageLabel();
  return `You are a JSON-only parser. Parse this command and return ONLY valid JSON.

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
};

export const buildChaosDumpPrompt = ({ input, workflowTitles, routineTitles }) => `You are a JSON-only organizer. Turn the user's unstructured brain dump into actionable items.

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

export const buildEstimateTaskTimePrompt = ({ taskName, taskMemo = '' }) => `Estimate how long this task will take for someone with ADHD (include buffer time for context switching).

Task: ${taskName}
${taskMemo ? `Details: ${taskMemo}` : ''}

${getLanguageInstruction()}

Respond with ONLY a JSON object, no other text:
{
  "minutes": number between 5-120,
  "breakdown": "Brief breakdown if task > 15 min"
}`;

export const buildDailySummaryPrompt = ({ completedRoutines, completedTasks, pendingRoutines, pendingTasks }) => `You are DailyWave AI. Generate a daily summary for an ADHD user.

COMPLETED TODAY:
- Routines: ${completedRoutines.map((r) => r.title).join(', ') || 'None'}
- Workflow tasks: ${completedTasks.map((t) => t.task).join(', ') || 'None'}

STILL PENDING:
- Routines: ${pendingRoutines.map((r) => r.title).join(', ') || 'None'}
- Workflow tasks: ${pendingTasks.map((t) => t.task).join(', ') || 'None'}

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

export const buildSuggestOptimalTimePrompt = ({ taskTitle, hour, userEnergy }) => `You are DailyWave AI. Suggest the best time to do this task for someone with ADHD.

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

export const buildAnalyzeRoutinePatternsPrompt = ({ routineStats, completionHistory }) => `You are DailyWave AI. Analyze routine patterns for an ADHD user.

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

export const buildQuickActionsPrompt = ({ hour, currentEnergy, pendingRoutines, activeTasks }) => `You are DailyWave AI. Suggest 3 quick actions for RIGHT NOW.

Current time: ${hour}:00
Energy level: ${currentEnergy}
Pending routines: ${pendingRoutines.map((r) => `${r.title} (${r.time})`).join(', ') || 'None'}
Active tasks: ${activeTasks.map((t) => t.task).join(', ') || 'None'}

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

export const buildEnhanceWorkflowPrompt = ({ workflowTitle, stepsText }) => `You are DailyWave AI, a workflow optimization expert.

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
