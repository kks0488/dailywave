const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export const getApiKey = () => {
  return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
};

export const setApiKey = (key) => {
  localStorage.setItem('gemini_api_key', key);
};

export const hasApiKey = () => {
  return !!getApiKey();
};

export const askGemini = async (prompt, context = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please set your Gemini API key in Settings.');
  }
  
  console.log('Using API key:', apiKey.substring(0, 10) + '...');

  const systemPrompt = `You are DailyWave AI, an ADHD-friendly productivity assistant. 
Your role is to help users with time blindness and decision paralysis.
Be concise, encouraging, and never judgmental.
Current time: ${new Date().toLocaleTimeString()}
Current date: ${new Date().toLocaleDateString()}`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    console.error('Gemini API Error:', errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

export const getWhatsNext = async (pipelines, routines, currentEnergy = 'medium') => {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  
  const activeTasks = [];
  
  pipelines.forEach(p => {
    p.steps?.forEach((step, idx) => {
      if (step.status === 'active' || step.status === 'pending') {
        activeTasks.push({
          type: 'workflow',
          pipeline: p.title,
          task: step.name,
          status: step.status,
          position: idx + 1,
          memo: step.memo
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

Respond in this exact JSON format only, no other text:
{
  "task": "The specific task name",
  "reason": "One short sentence why this task now (max 15 words)",
  "estimatedMinutes": number between 5-60,
  "encouragement": "A short ADHD-friendly encouragement (max 10 words)"
}`;

  const response = await askGemini(prompt, { timeOfDay, currentEnergy });
  console.log('Raw AI response:', response);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed AI response:', parsed);
      return parsed;
    }
    console.warn('No JSON found in response');
  } catch (e) {
    console.error('Failed to parse AI response:', e, response);
  }
  
  if (activeTasks.length > 0) {
    return {
      task: activeTasks[0].task,
      reason: "Starting with your first active task",
      estimatedMinutes: 25,
      encouragement: "You got this! Just start."
    };
  }
  
  return {
    task: "Take a 5-minute break",
    reason: "No pending tasks found",
    estimatedMinutes: 5,
    encouragement: "Rest is productive too!"
  };
};

export const parseAICommand = async (userInput, pipelines, routines) => {
  const workflowNames = pipelines.map(p => p.title).join(', ') || 'None';
  
  const prompt = `You are a JSON-only parser. Parse this command and return ONLY valid JSON.

INPUT: "${userInput}"
WORKFLOWS: ${workflowNames}

RULES:
- Output ONLY JSON, no explanation, no markdown
- Extract the task/action from the input
- Match workflow names if mentioned (fuzzy match OK)
- Time format: HH:MM (24h)

OUTPUT FORMAT (strict JSON):
{"action":"add_routine","data":{"title":"task","time":"09:00"},"confirmation":"확인 메시지"}
{"action":"add_workflow_step","data":{"title":"step","workflow":"workflow name"},"confirmation":"확인 메시지"}
{"action":"unknown","data":{},"confirmation":"이해하지 못했습니다"}

Examples:
Input: "9시에 운동 추가해줘" → {"action":"add_routine","data":{"title":"운동","time":"09:00"},"confirmation":"9시에 운동을 추가했습니다"}
Input: "마케팅 워크플로우에 보고서 작성 넣어줘" → {"action":"add_workflow_step","data":{"title":"보고서 작성","workflow":"마케팅"},"confirmation":"마케팅에 보고서 작성을 추가했습니다"}

NOW PARSE AND OUTPUT JSON ONLY:`;

  const response = await askGemini(prompt);
  console.log('AI command raw response:', response);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed command:', parsed);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse command:', e, response);
  }
  
  return { action: 'unknown', data: {}, confirmation: '명령을 이해하지 못했습니다. 다시 시도해주세요.' };
};

export const estimateTaskTime = async (taskName, taskMemo = '') => {
  const prompt = `Estimate how long this task will take for someone with ADHD (include buffer time for context switching).

Task: ${taskName}
${taskMemo ? `Details: ${taskMemo}` : ''}

Respond with ONLY a JSON object, no other text:
{
  "minutes": number between 5-120,
  "breakdown": "Brief breakdown if task > 15 min"
}`;

  const response = await askGemini(prompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse time estimate:', e);
  }
  
  return { minutes: 25, breakdown: null };
};

export const getDailySummary = async (pipelines, routines) => {
  const completedRoutines = routines.filter(r => r.done);
  const pendingRoutines = routines.filter(r => !r.done);
  
  const completedTasks = [];
  const pendingTasks = [];
  
  pipelines.forEach(p => {
    p.steps?.forEach(step => {
      if (step.status === 'completed') {
        completedTasks.push({ pipeline: p.title, task: step.name });
      } else if (step.status === 'active' || step.status === 'pending') {
        pendingTasks.push({ pipeline: p.title, task: step.name });
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

Respond with ONLY this JSON format:
{
  "celebration": "Short celebration message for what they accomplished (max 15 words)",
  "completedCount": ${completedRoutines.length + completedTasks.length},
  "pendingCount": ${pendingRoutines.length + pendingTasks.length},
  "tomorrowTip": "One specific tip for tomorrow based on pending items (max 20 words)",
  "mood": "great" | "good" | "okay" | "needs_improvement"
}`;

  const response = await askGemini(prompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse daily summary:', e);
  }
  
  return {
    celebration: "Great effort today!",
    completedCount: completedRoutines.length + completedTasks.length,
    pendingCount: pendingRoutines.length + pendingTasks.length,
    tomorrowTip: "Start with your most important task first.",
    mood: "good"
  };
};

export const suggestOptimalTime = async (taskTitle, userEnergy = 'medium') => {
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

Respond with ONLY this JSON:
{
  "suggestedTime": "HH:MM",
  "reason": "Why this time is optimal (max 15 words)",
  "alternativeTime": "HH:MM",
  "energyRequired": "low" | "medium" | "high"
}`;

  const response = await askGemini(prompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse time suggestion:', e);
  }
  
  return {
    suggestedTime: "09:00",
    reason: "Morning is best for important tasks",
    alternativeTime: "14:00",
    energyRequired: "medium"
  };
};

export const analyzeRoutinePatterns = async (routines, completionHistory = []) => {
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

  const response = await askGemini(prompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse pattern analysis:', e);
  }
  
  return {
    insights: [{ type: "positive", message: "Keep up the good work!", affectedRoutine: null }],
    overallScore: 70,
    topSuggestion: "Try to complete morning routines first."
  };
};

export const getQuickActions = async (pipelines, routines, currentEnergy = 'medium') => {
  const hour = new Date().getHours();
  const pendingRoutines = routines.filter(r => !r.done);
  const activeTasks = [];
  
  pipelines.forEach(p => {
    p.steps?.forEach(step => {
      if (step.status === 'active' || step.status === 'pending') {
        activeTasks.push({ pipeline: p.title, task: step.name, status: step.status });
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

Respond with ONLY this JSON array:
[
  {
    "action": "Specific action to take",
    "type": "routine" | "task" | "break" | "quick_win",
    "duration": number (minutes),
    "emoji": "relevant emoji"
  }
]`;

  const response = await askGemini(prompt);
  
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse quick actions:', e);
  }
  
  return [
    { action: "Take a 2-minute stretch break", type: "break", duration: 2, emoji: "🧘" },
    { action: "Review your next task", type: "quick_win", duration: 5, emoji: "📋" },
    { action: "Drink some water", type: "break", duration: 1, emoji: "💧" }
  ];
};

export const enhanceWorkflow = async (workflowTitle, currentSteps) => {
  const stepsText = currentSteps.length > 0 
    ? currentSteps.map((s, i) => `${i + 1}. ${s.name}`).join('\n')
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
- Focus on practical, actionable steps for ADHD users`;

  const response = await askGemini(prompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse workflow enhancement:', e);
  }
  
  return {
    analysis: "Could not analyze workflow. Try again.",
    suggestions: [],
    optimizedFlow: currentSteps.map(s => s.name)
  };
};
