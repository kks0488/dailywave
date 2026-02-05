export const normalizeAiSteps = (steps) => {
  const rawSteps = Array.isArray(steps) ? steps : typeof steps === 'string' ? [steps] : [];
  return rawSteps.map((step) => (typeof step === 'string' ? step.trim() : '')).filter(Boolean);
};

export const buildStepsFromTitles = (titles, now = Date.now()) => {
  const normalized = normalizeAiSteps(titles);
  if (normalized.length === 0) return [];

  return normalized.map((title, index) => ({
    id: `${now}-${index + 1}`,
    title,
    status: index === 0 ? 'active' : 'locked',
  }));
};

export const ensureActiveStepForPipeline = ({ pipelineId, pipelines, reorderSteps }) => {
  const pipeline = pipelines.find((p) => p.id === pipelineId);
  if (!pipeline || !pipeline.steps?.length) return;
  if (pipeline.steps.some((step) => step.status === 'active')) return;

  let activated = false;
  const nextSteps = pipeline.steps.map((step) => {
    if (activated || step.status === 'done') return step;
    activated = true;
    return { ...step, status: 'active' };
  });

  if (activated) {
    reorderSteps(pipelineId, nextSteps);
  }
};

export const getChaosSnippet = (text) => {
  const value = typeof text === 'string' ? text.trim() : '';
  if (!value) return '';
  return value.length > 140 ? `${value.slice(0, 140)}…` : value;
};
