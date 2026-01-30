const VALID_TYPES = new Set(['positive', 'warning', 'suggestion']);

export function normalizeRoutineCoachResult(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};

  const insightsRaw = Array.isArray(base.insights) ? base.insights : [];
  const insights = insightsRaw
    .map((item) => (item && typeof item === 'object' ? item : {}))
    .map((item) => {
      const type = VALID_TYPES.has(item.type) ? item.type : 'suggestion';
      const message = typeof item.message === 'string' ? item.message.trim() : '';
      const affectedRoutine =
        typeof item.affectedRoutine === 'string' && item.affectedRoutine.trim()
          ? item.affectedRoutine.trim()
          : null;
      return { type, message, affectedRoutine };
    })
    .filter((item) => item.message.length > 0)
    .slice(0, 8);

  const scoreRaw = Number(base.overallScore);
  const score =
    Number.isFinite(scoreRaw) ? Math.min(100, Math.max(1, Math.round(scoreRaw))) : 70;

  const topSuggestion =
    typeof base.topSuggestion === 'string' && base.topSuggestion.trim() ? base.topSuggestion.trim() : '';

  return {
    insights,
    overallScore: score,
    topSuggestion,
  };
}

