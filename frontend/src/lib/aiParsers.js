export const JSON_OBJECT_RE = /\{[\s\S]*?\}/;
export const JSON_OBJECT_GREEDY_RE = /\{[\s\S]*\}/;
export const JSON_ARRAY_RE = /\[[\s\S]*\]/;

export const parseFirstJsonObject = (response) => {
  const jsonMatch = typeof response === 'string' ? response.match(JSON_OBJECT_RE) : null;
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
};

export const parseGreedyJsonObject = (response) => {
  const jsonMatch = typeof response === 'string' ? response.match(JSON_OBJECT_GREEDY_RE) : null;
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
};

export const parseJsonArray = (response) => {
  const jsonMatch = typeof response === 'string' ? response.match(JSON_ARRAY_RE) : null;
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
};

export const normalizeTimeHHMM = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  const [hh, mm] = text.split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeList = (value) => {
  const rawList = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return rawList.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
};

export const normalizeChaosParseResult = (raw, pipelines, routines) => {
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
