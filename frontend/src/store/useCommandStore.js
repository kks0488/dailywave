import { create } from 'zustand';
// import { persist } from 'zustand/middleware'; // Removed for Backend persistence

const INITIAL_ROUTINES = [];
const INITIAL_PIPELINES = [];
const INITIAL_SOP_LIBRARY = [];
const INITIAL_COMPLETION_HISTORY = [];
const INITIAL_CHAOS_INBOX = [];

const MAX_COMPLETION_HISTORY_DAYS = 60;
const MAX_CHAOS_INBOX_ITEMS = 200;
const MAX_CHAOS_INBOX_DAYS = 30;

const getLocalDateKey = (date = new Date()) => {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const pruneCompletionHistory = (events) => {
  if (!Array.isArray(events) || events.length === 0) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_COMPLETION_HISTORY_DAYS);
  const cutoffTime = cutoff.getTime();

  return events.filter((event) => {
    const at = typeof event?.at === 'string' ? Date.parse(event.at) : NaN;
    if (!Number.isFinite(at)) return false;
    return at >= cutoffTime;
  });
};

const pruneChaosInbox = (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_CHAOS_INBOX_DAYS);
  const cutoffTime = cutoff.getTime();

  const normalized = items
    .map((item) => {
      const base = typeof item === 'object' && item !== null ? item : null;
      if (!base) return null;

      const text = typeof base.text === 'string' ? base.text : '';
      if (!text.trim()) return null;

      const createdAt = typeof base.createdAt === 'string' ? base.createdAt : '';
      const createdAtTime = Date.parse(createdAt);
      if (!Number.isFinite(createdAtTime)) return null;

      const updatedAt = typeof base.updatedAt === 'string' ? base.updatedAt : createdAt;

      return {
        id: typeof base.id === 'string' ? base.id : crypto.randomUUID(),
        text,
        createdAt,
        updatedAt,
        status: typeof base.status === 'string' ? base.status : 'inbox',
        parsed: typeof base.parsed === 'object' && base.parsed !== null ? base.parsed : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const withinWindow = normalized.filter((item) => Date.parse(item.createdAt) >= cutoffTime);
  return withinWindow.slice(0, MAX_CHAOS_INBOX_ITEMS);
};

export const useCommandStore = create(
    (set) => ({
      routines: INITIAL_ROUTINES,
      pipelines: INITIAL_PIPELINES,
      sopLibrary: INITIAL_SOP_LIBRARY,
      completionHistory: INITIAL_COMPLETION_HISTORY,
      chaosInbox: INITIAL_CHAOS_INBOX,
      
      // History Functionality
      past: [],
      future: [],

      undo: () => set((state) => {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        return {
          past: newPast,
          future: [{ pipelines: state.pipelines, routines: state.routines }, ...state.future],
          pipelines: previous.pipelines,
          routines: previous.routines
        };
      }),

      redo: () => set((state) => {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        return {
          past: [...state.past, { pipelines: state.pipelines, routines: state.routines }],
          future: newFuture,
          pipelines: next.pipelines,
          routines: next.routines
        };
      }),

      // --- ROUTINE ACTIONS ---
      toggleRoutine: (id) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        const todayKey = getLocalDateKey();

        return {
          past: [...state.past, historySnapshot].slice(-20),
          future: [],
          routines: state.routines.map(r => {
            if (r.id !== id) return r;
            const nextDone = !r.done;
            return {
              ...r,
              done: nextDone,
              doneDate: nextDone ? todayKey : null,
            };
          })
        };
      }),
      addRoutine: (routine) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        return {
           past: [...state.past, historySnapshot].slice(-20),
           future: [],
           routines: [...state.routines, { ...routine, id: crypto.randomUUID(), done: false, doneDate: null }]
        };
      }),
      deleteRoutine: (id) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        return {
           past: [...state.past, historySnapshot].slice(-20),
           future: [],
           routines: state.routines.filter(r => r.id !== id)
        };
      }),

      // --- PIPELINE ACTIONS ---
      addPipeline: (title, subtitle, color, iconType, options = {}) => {
        const pipelineId = options.id || crypto.randomUUID();
        const steps = Array.isArray(options.steps) && options.steps.length > 0
          ? options.steps.map((step, index) => ({
              id: step.id || `${pipelineId}-step-${index + 1}`,
              title: step.title || step.name || `Step ${index + 1}`,
              description: step.description || step.memo || '',
              status: step.status || 'pending'
            }))
          : [
              { id: `${pipelineId}-s1`, title: 'Start', status: 'pending' },
              { id: `${pipelineId}-s2`, title: 'Finish', status: 'locked' }
            ];

        set((state) => {
          const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
          return {
              past: [...state.past, historySnapshot].slice(-20),
              future: [],
              pipelines: [...state.pipelines, {
                  id: pipelineId,
                  title,
                  subtitle,
                  color,
                  iconType,
                  steps
              }]
          };
        });

        return pipelineId;
      },
      deletePipeline: (id) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        return {
            past: [...state.past, historySnapshot].slice(-20),
            future: [],
            pipelines: state.pipelines.filter(p => p.id !== id)
        };
      }),
      updateStepStatus: (pipelineId, stepId, status) => set((state) => {
        const previousState = { pipelines: state.pipelines, routines: state.routines };
        const newPast = [...state.past, previousState].slice(-20);

        return {
           past: newPast,
           future: [],
           pipelines: state.pipelines.map(p => {
               if (p.id !== pipelineId) return p;
               const stepIndex = p.steps.findIndex(s => s.id === stepId);
               if (stepIndex === -1) return p;
               const wasActive = p.steps[stepIndex].status === 'active';
               const newSteps = [...p.steps];
               newSteps[stepIndex] = { ...newSteps[stepIndex], status };

               if (wasActive && status === 'done') {
                   for (let k = stepIndex + 1; k < newSteps.length; k++) {
                       const nextStep = newSteps[k];
                       if (nextStep.status === 'pending' || nextStep.status === 'locked' || nextStep.status === 'active') {
                           newSteps[k] = { ...nextStep, status: 'active' };
                           break;
                       }
                   }
               }

               return { ...p, steps: newSteps };
           })
        };
      }),
      addStep: (pipelineId, title) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        return {
            past: [...state.past, historySnapshot].slice(-20),
            future: [],
            pipelines: state.pipelines.map(p => 
            p.id === pipelineId 
                ? { 
                    ...p, 
                    steps: [...p.steps, { id: crypto.randomUUID(), title, status: 'pending' }] 
                }
                : p
            )
        };
      }),
      insertStep: (pipelineId, index, title) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        return {
            past: [...state.past, historySnapshot].slice(-20),
            future: [],
            pipelines: state.pipelines.map(p => {
            if (p.id !== pipelineId) return p;
            const newSteps = [...p.steps];
            newSteps.splice(index, 0, { id: crypto.randomUUID(), title, status: 'pending' });
            return { ...p, steps: newSteps };
            })
        };
      }),
      reorderSteps: (pipelineId, newSteps) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        return {
            past: [...state.past, historySnapshot].slice(-20),
            future: [],
            pipelines: state.pipelines.map(p => 
                p.id === pipelineId ? { ...p, steps: newSteps } : p
            )
        };
      }),
      
      deleteStep: (pipelineId, stepId) => set((state) => {
         const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
         return {
             past: [...state.past, historySnapshot].slice(-20),
             future: [],
             pipelines: state.pipelines.map(p =>
                p.id === pipelineId
                ? { ...p, steps: p.steps.filter(s => s.id !== stepId) }
                : p
             )
         };
      }),
      renameStep: (pipelineId, stepId, newTitle) => set((state) => {
          const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
          return {
              past: [...state.past, historySnapshot].slice(-20),
              future: [],
              pipelines: state.pipelines.map(p =>
                p.id === pipelineId
                ? { ...p, steps: p.steps.map(s => s.id === stepId ? { ...s, title: newTitle } : s) }
                : p
              )
          };
      }),
      updateStepDescription: (pipelineId, stepId, description) => set((state) => {
          const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
          return {
              past: [...state.past, historySnapshot].slice(-20),
              future: [],
              pipelines: state.pipelines.map(p =>
                p.id === pipelineId
                ? { ...p, steps: p.steps.map(s => s.id === stepId ? { ...s, description } : s) }
                : p
              )
           };
      }),
      renamePipeline: (pipelineId, newTitle) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        return {
          past: [...state.past, historySnapshot].slice(-20),
          future: [],
          pipelines: state.pipelines.map(p => 
            p.id === pipelineId ? { ...p, title: newTitle } : p
          )
        };
      }),
      reorderPipelines: (newPipelines) => set((state) => {
         const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
         return {
           past: [...state.past, historySnapshot].slice(-20),
           future: [],
           pipelines: newPipelines
         };
      }),

      // --- COMPLETION HISTORY (Victory / Patterns) ---
      addHistoryEvent: (event) => set((state) => {
        const base = typeof event === 'object' && event !== null ? event : {};
        const nextEvent = {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          ...base,
        };

        return {
          completionHistory: pruneCompletionHistory([...(state.completionHistory || []), nextEvent]),
        };
      }),
      clearHistory: () => set(() => ({ completionHistory: [] })),

      // --- CHAOS INBOX (Unstructured brain dump → organized later) ---
      addChaosDump: (dump) => {
        const base = typeof dump === 'object' && dump !== null ? dump : {};
        const text = typeof base.text === 'string' ? base.text.trim() : '';
        if (!text) return null;

        const now = new Date().toISOString();
        const id = typeof base.id === 'string' && base.id.trim() ? base.id.trim() : crypto.randomUUID();

        const createdAtRaw = typeof base.createdAt === 'string' ? base.createdAt : now;
        const createdAt = Number.isFinite(Date.parse(createdAtRaw)) ? createdAtRaw : now;
        const updatedAtRaw = typeof base.updatedAt === 'string' ? base.updatedAt : createdAt;
        const updatedAt = Number.isFinite(Date.parse(updatedAtRaw)) ? updatedAtRaw : createdAt;

        const nextDump = {
          id,
          text,
          createdAt,
          updatedAt,
          status: typeof base.status === 'string' ? base.status : 'inbox',
          parsed: typeof base.parsed === 'object' && base.parsed !== null ? base.parsed : null,
        };

        set((state) => ({
          chaosInbox: pruneChaosInbox([
            nextDump,
            ...(state.chaosInbox || []).filter((item) => item?.id !== id),
          ]),
        }));

        return id;
      },
      updateChaosDump: (id, updates) => set((state) => {
        if (!id) return { chaosInbox: state.chaosInbox || [] };
        const patch = typeof updates === 'object' && updates !== null ? updates : {};
        const now = new Date().toISOString();

        return {
          chaosInbox: pruneChaosInbox(
            (state.chaosInbox || []).map((item) => {
              if (item?.id !== id) return item;
              return { ...item, ...patch, updatedAt: now };
            })
          ),
        };
      }),
      deleteChaosDump: (id) => set((state) => ({
        chaosInbox: (state.chaosInbox || []).filter((item) => item?.id !== id),
      })),
      clearChaosInbox: () => set(() => ({ chaosInbox: [] })),

      // --- SOP LIBRARY (Flow Recipes) ---
      addSopRecipe: (recipe) => set((state) => {
        const base = typeof recipe === 'object' && recipe !== null ? recipe : {};
        const nextRecipe = {
          id: base.id || crypto.randomUUID(),
          title: base.title || 'Untitled Recipe',
          subtitle: base.subtitle || '',
          color: base.color || 'blue',
          iconType: base.iconType || 'briefcase',
          steps: Array.isArray(base.steps) ? base.steps : [],
          createdAt: base.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const existing = Array.isArray(state.sopLibrary) ? state.sopLibrary : [];
        const next = [
          nextRecipe,
          ...existing.filter((r) => r?.id !== nextRecipe.id),
        ];

        return { sopLibrary: next };
      }),
      deleteSopRecipe: (recipeId) => set((state) => ({
        sopLibrary: (state.sopLibrary || []).filter((recipe) => recipe?.id !== recipeId),
      })),

      // --- PERSISTENCE ACTIONS ---
      hydrate: (data) => set(() => ({
          pipelines: data.pipelines || [],
          routines: (data.routines || []).map((routine) => ({
            ...routine,
            done: !!routine?.done,
            doneDate: routine?.doneDate || routine?.done_date || null,
          })),
          sopLibrary: data.sopLibrary || [],
          completionHistory: pruneCompletionHistory(data.completionHistory || []),
          chaosInbox: pruneChaosInbox(data.chaosInbox || []),
      }))

    })
);
