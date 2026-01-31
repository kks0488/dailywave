import { describe, it, expect, vi, beforeEach } from 'vitest';

let callLog = [];
let mockRemote = {
  workspaceId: 'w1',
  pipelines: [],
  routines: [],
  steps: [],
};

const createQuery = (table) => {
  const state = {
    action: 'select',
    in: null,
    eq: {},
    limit: null,
  };

  const query = {
    select: () => {
      state.action = 'select';
      return query;
    },
    eq: (col, val) => {
      state.eq[col] = val;
      return query;
    },
    order: () => query,
    limit: (n) => {
      state.limit = n;
      return query;
    },
    insert: () => query,
    upsert: async (rows) => {
      callLog.push({ table, op: 'upsert', rows });
      return { data: null, error: null };
    },
    delete: () => {
      state.action = 'delete';
      return query;
    },
    in: (col, values) => {
      state.in = { col, values };
      return query;
    },
    single: async () => ({ data: { id: mockRemote.workspaceId }, error: null }),
    then: (resolve, reject) => {
      const result = (() => {
        if (state.action === 'delete') {
          callLog.push({ table, op: 'delete', in: state.in });
          return { data: null, error: null };
        }

        if (table === 'workspaces' && state.limit === 1) {
          return { data: [{ id: mockRemote.workspaceId }], error: null };
        }

        if (table === 'pipelines' && state.eq.workspace_id) {
          return { data: mockRemote.pipelines, error: null };
        }

        if (table === 'routines' && state.eq.workspace_id) {
          return { data: mockRemote.routines, error: null };
        }

        if (table === 'steps' && state.in?.col === 'pipeline_id') {
          const pipelineIds = new Set(state.in.values || []);
          return {
            data: mockRemote.steps.filter(s => pipelineIds.has(s.pipeline_id)),
            error: null,
          };
        }

        return { data: [], error: null };
      })();

      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return query;
};

vi.mock('../supabase', () => {
  return {
    isSupabaseConfigured: () => true,
    supabase: {
      from: (table) => createQuery(table),
    },
  };
});

describe('supabaseSync.saveToSupabase', () => {
  beforeEach(() => {
    callLog = [];
    mockRemote = {
      workspaceId: 'w1',
      pipelines: [{ id: 'p1' }, { id: 'p2' }],
      routines: [{ id: 'r1' }],
      steps: [
        { id: 's1', pipeline_id: 'p1' },
        { id: 's2', pipeline_id: 'p1' },
      ],
    };
  });

  it('bulk upserts and deletes stale remote rows', async () => {
    const { saveToSupabase } = await import('../supabaseSync');

    const ok = await saveToSupabase('user-1', {
      pipelines: [
        {
          id: 'p1',
          title: 'A',
          steps: [{ id: 's1', title: 'S1', status: 'pending' }],
        },
      ],
      routines: [],
    });

    expect(ok).toBe(true);

    const pipelineUpsert = callLog.find(c => c.table === 'pipelines' && c.op === 'upsert');
    const stepsUpsert = callLog.find(c => c.table === 'steps' && c.op === 'upsert');
    const routinesUpsert = callLog.find(c => c.table === 'routines' && c.op === 'upsert');

    expect(pipelineUpsert?.rows?.length).toBe(1);
    expect(stepsUpsert?.rows?.length).toBe(1);
    expect(routinesUpsert).toBeUndefined();

    const deletes = callLog.filter(c => c.op === 'delete');
    const deletedIds = deletes.flatMap(d => d.in?.values || []);

    expect(deletedIds).toContain('p2');
    expect(deletedIds).toContain('r1');
    expect(deletedIds).toContain('s2');
  });
});
