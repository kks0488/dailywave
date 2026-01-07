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
        maxOutputTokens: 500,
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
    const jsonMatch = response.match(/\{[^{}]*\}/);
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
