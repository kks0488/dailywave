import { describe, it, expect } from 'vitest';
import { normalizeRoutineCoachResult } from '../routineCoach';

describe('routineCoach - normalizeRoutineCoachResult', () => {
  it('returns safe defaults for invalid input', () => {
    const result = normalizeRoutineCoachResult(null);
    expect(result).toEqual({
      insights: [],
      overallScore: 70,
      topSuggestion: '',
    });
  });

  it('normalizes score and trims strings', () => {
    const result = normalizeRoutineCoachResult({
      overallScore: 101.2,
      topSuggestion: '  Do the morning routine first.  ',
      insights: [{ type: 'positive', message: '  Nice momentum  ' }],
    });

    expect(result.overallScore).toBe(100);
    expect(result.topSuggestion).toBe('Do the morning routine first.');
    expect(result.insights[0]).toEqual({
      type: 'positive',
      message: 'Nice momentum',
      affectedRoutine: null,
    });
  });

  it('filters invalid insights and caps list length', () => {
    const result = normalizeRoutineCoachResult({
      overallScore: 10,
      topSuggestion: 'ok',
      insights: [
        { type: 'unknown', message: '  ' },
        { type: 'warning', message: 'One' },
        'bad',
        { type: 'suggestion', message: 'Two', affectedRoutine: '  Morning  ' },
        ...Array.from({ length: 20 }, (_, i) => ({ type: 'positive', message: `m${i}` })),
      ],
    });

    expect(result.insights.length).toBe(8);
    expect(result.insights[0]).toEqual({
      type: 'warning',
      message: 'One',
      affectedRoutine: null,
    });
    expect(result.insights[1]).toEqual({
      type: 'suggestion',
      message: 'Two',
      affectedRoutine: 'Morning',
    });
  });
});

