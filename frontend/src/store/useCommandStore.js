import { create } from 'zustand';
// import { persist } from 'zustand/middleware'; // Removed for Backend persistence

const INITIAL_ROUTINES = [];
const INITIAL_PIPELINES = [];
const INITIAL_SOP_LIBRARY = [];

export const useCommandStore = create(
    (set, get) => ({
      routines: INITIAL_ROUTINES,
      pipelines: INITIAL_PIPELINES,
      sopLibrary: INITIAL_SOP_LIBRARY,
      
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
        return {
          past: [...state.past, historySnapshot].slice(-20),
          future: [],
          routines: state.routines.map(r => r.id === id ? { ...r, done: !r.done } : r)
        };
      }),
      addRoutine: (routine) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        return {
           past: [...state.past, historySnapshot].slice(-20),
           future: [],
           routines: [...state.routines, { ...routine, id: Date.now().toString(), done: false }]
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
      addPipeline: (title, subtitle, color, iconType) => set((state) => {
        const historySnapshot = { pipelines: state.pipelines, routines: state.routines };
        return {
            past: [...state.past, historySnapshot].slice(-20),
            future: [],
            pipelines: [...state.pipelines, {
                id: Date.now().toString(),
                title,
                subtitle,
                color,
                iconType,
                steps: [
                    { id: 's1', title: '시작', status: 'pending' },
                    { id: 's2', title: '종료', status: 'locked' }
                ]
            }]
        };
      }),
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
                    steps: [...p.steps, { id: Date.now().toString(), title, status: 'pending' }] 
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
            newSteps.splice(index, 0, { id: Date.now().toString(), title, status: 'pending' });
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

      // --- PERSISTENCE ACTIONS ---
      hydrate: (data) => set(() => ({
          pipelines: data.pipelines || [],
          routines: data.routines || [],
          sopLibrary: data.sopLibrary || []
      }))

    })
);
