import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandStore } from '../useCommandStore';

const getLocalDateKey = (date = new Date()) => {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

describe('useCommandStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useCommandStore.getState();
    store.hydrate({ pipelines: [], routines: [], sopLibrary: [] });
    useCommandStore.setState({ past: [], future: [] });
  });

  describe('Initial State', () => {
    it('should have empty pipelines array', () => {
      const { pipelines } = useCommandStore.getState();
      expect(pipelines).toEqual([]);
    });

    it('should have empty routines array', () => {
      const { routines } = useCommandStore.getState();
      expect(routines).toEqual([]);
    });

    it('should have empty sopLibrary array', () => {
      const { sopLibrary } = useCommandStore.getState();
      expect(sopLibrary).toEqual([]);
    });

    it('should have empty completionHistory array', () => {
      const { completionHistory } = useCommandStore.getState();
      expect(completionHistory).toEqual([]);
    });

    it('should have empty chaosInbox array', () => {
      const { chaosInbox } = useCommandStore.getState();
      expect(chaosInbox).toEqual([]);
    });

    it('should have empty history arrays', () => {
      const { past, future } = useCommandStore.getState();
      expect(past).toEqual([]);
      expect(future).toEqual([]);
    });
  });

  describe('Pipeline Actions', () => {
    it('should add a pipeline with default steps', () => {
      const { addPipeline } = useCommandStore.getState();

      const pipelineId = addPipeline('Test Pipeline', 'Test Subtitle', '#ff0000', 'code');

      const state = useCommandStore.getState();
      expect(state.pipelines).toHaveLength(1);
      expect(state.pipelines[0]).toMatchObject({
        id: pipelineId,
        title: 'Test Pipeline',
        subtitle: 'Test Subtitle',
        color: '#ff0000',
        iconType: 'code'
      });
      expect(state.pipelines[0].steps).toHaveLength(2);
    });

    it('should add a pipeline with custom steps', () => {
      const { addPipeline } = useCommandStore.getState();

      const customSteps = [
        { title: 'Step 1', status: 'pending' },
        { title: 'Step 2', status: 'pending' },
        { title: 'Step 3', status: 'pending' }
      ];

      addPipeline('Custom Pipeline', '', '#00ff00', 'layout', { steps: customSteps });

      const state = useCommandStore.getState();
      expect(state.pipelines).toHaveLength(1);
      expect(state.pipelines[0].steps).toHaveLength(3);
      expect(state.pipelines[0].steps[0].title).toBe('Step 1');
    });

    it('should delete a pipeline', () => {
      const { addPipeline, deletePipeline } = useCommandStore.getState();

      const pipelineId = addPipeline('To Delete', '', '#0000ff', 'trash');
      expect(useCommandStore.getState().pipelines).toHaveLength(1);

      deletePipeline(pipelineId);
      expect(useCommandStore.getState().pipelines).toHaveLength(0);
    });

    it('should update step status', () => {
      const { addPipeline, updateStepStatus } = useCommandStore.getState();

      const pipelineId = addPipeline('Test', '', '#000000', 'check');
      const state = useCommandStore.getState();
      const stepId = state.pipelines[0].steps[0].id;

      updateStepStatus(pipelineId, stepId, 'active');

      const updatedState = useCommandStore.getState();
      expect(updatedState.pipelines[0].steps[0].status).toBe('active');
    });

    it('should add a step to a pipeline', () => {
      const { addPipeline, addStep } = useCommandStore.getState();

      const pipelineId = addPipeline('Test', '', '#000000', 'plus');
      const initialStepCount = useCommandStore.getState().pipelines[0].steps.length;

      addStep(pipelineId, 'New Step');

      const state = useCommandStore.getState();
      expect(state.pipelines[0].steps).toHaveLength(initialStepCount + 1);
      expect(state.pipelines[0].steps[initialStepCount].title).toBe('New Step');
    });

    it('should rename a pipeline', () => {
      const { addPipeline, renamePipeline } = useCommandStore.getState();

      const pipelineId = addPipeline('Old Name', '', '#000000', 'edit');
      renamePipeline(pipelineId, 'New Name');

      const state = useCommandStore.getState();
      expect(state.pipelines[0].title).toBe('New Name');
    });
  });

  describe('Routine Actions', () => {
    it('should add a routine', () => {
      const { addRoutine } = useCommandStore.getState();

      addRoutine({ title: 'Morning Exercise', time: '07:00', type: 'morning' });

      const state = useCommandStore.getState();
      expect(state.routines).toHaveLength(1);
      expect(state.routines[0]).toMatchObject({
        title: 'Morning Exercise',
        time: '07:00',
        type: 'morning',
        done: false,
        doneDate: null
      });
      expect(state.routines[0].id).toBeDefined();
    });

    it('should toggle routine done status', () => {
      const { addRoutine, toggleRoutine } = useCommandStore.getState();

      addRoutine({ title: 'Test Routine', time: '10:00' });
      const routineId = useCommandStore.getState().routines[0].id;

      toggleRoutine(routineId);
      expect(useCommandStore.getState().routines[0].done).toBe(true);
      expect(useCommandStore.getState().routines[0].doneDate).toBe(getLocalDateKey());

      toggleRoutine(routineId);
      expect(useCommandStore.getState().routines[0].done).toBe(false);
      expect(useCommandStore.getState().routines[0].doneDate).toBe(null);
    });

    it('should delete a routine', () => {
      const { addRoutine, deleteRoutine } = useCommandStore.getState();

      addRoutine({ title: 'To Delete', time: '12:00' });
      const routineId = useCommandStore.getState().routines[0].id;

      deleteRoutine(routineId);
      expect(useCommandStore.getState().routines).toHaveLength(0);
    });
  });

  describe('History (Undo/Redo)', () => {
    it('should track history when adding pipeline', () => {
      const { addPipeline } = useCommandStore.getState();

      addPipeline('Test', '', '#000000', 'history');

      const state = useCommandStore.getState();
      expect(state.past).toHaveLength(1);
    });

    it('should undo pipeline addition', () => {
      const { addPipeline, undo } = useCommandStore.getState();

      addPipeline('Test', '', '#000000', 'undo');
      expect(useCommandStore.getState().pipelines).toHaveLength(1);

      undo();
      expect(useCommandStore.getState().pipelines).toHaveLength(0);
    });

    it('should redo pipeline addition', () => {
      const { addPipeline, undo, redo } = useCommandStore.getState();

      addPipeline('Test', '', '#000000', 'redo');
      undo();
      expect(useCommandStore.getState().pipelines).toHaveLength(0);

      redo();
      expect(useCommandStore.getState().pipelines).toHaveLength(1);
    });

    it('should clear future when making new change after undo', () => {
      const { addPipeline, undo } = useCommandStore.getState();

      addPipeline('First', '', '#000000', 'test1');
      undo();

      addPipeline('Second', '', '#000000', 'test2');

      const state = useCommandStore.getState();
      expect(state.future).toHaveLength(0);
    });
  });

  describe('Hydrate', () => {
    it('should hydrate store with data', () => {
      const { hydrate } = useCommandStore.getState();
      const now = new Date().toISOString();

      const mockData = {
        pipelines: [{ id: '1', title: 'Pipeline 1', steps: [] }],
        routines: [{ id: '2', title: 'Routine 1', done: false }],
        sopLibrary: [{ id: '3', name: 'SOP 1' }],
        completionHistory: [{ id: '4', at: new Date().toISOString(), type: 'session_start' }],
        chaosInbox: [{ id: 'c1', text: 'Brain dump', createdAt: now, updatedAt: now, status: 'inbox', parsed: null }]
      };

      hydrate(mockData);

      const state = useCommandStore.getState();
      expect(state.pipelines).toMatchObject(mockData.pipelines);
      expect(state.routines).toEqual([{ ...mockData.routines[0], doneDate: null }]);
      expect(state.sopLibrary).toEqual(mockData.sopLibrary);
      expect(state.completionHistory).toEqual(mockData.completionHistory);
      expect(state.chaosInbox).toEqual([
        {
          ...mockData.chaosInbox[0],
          mergedCount: 1,
          appliedAt: null,
          appliedResult: null,
        },
      ]);
    });
  });

  describe('Completion History', () => {
    it('should add history events', () => {
      const { addHistoryEvent } = useCommandStore.getState();

      addHistoryEvent({ type: 'session_start' });

      const state = useCommandStore.getState();
      expect(state.completionHistory).toHaveLength(1);
      expect(state.completionHistory[0].type).toBe('session_start');
      expect(state.completionHistory[0].id).toBeDefined();
      expect(state.completionHistory[0].at).toBeDefined();
    });
  });

  describe('SOP Library', () => {
    it('should add and delete sop recipes', () => {
      const { addSopRecipe, deleteSopRecipe } = useCommandStore.getState();

      addSopRecipe({ id: 'recipe-1', title: 'My Recipe', steps: [{ title: 'Step 1' }] });
      expect(useCommandStore.getState().sopLibrary).toHaveLength(1);

      deleteSopRecipe('recipe-1');
      expect(useCommandStore.getState().sopLibrary).toHaveLength(0);
    });
  });

  describe('Chaos Inbox', () => {
    it('should add, update, and delete chaos dumps', () => {
      const { addChaosDump, updateChaosDump, deleteChaosDump } = useCommandStore.getState();

      const dumpId = addChaosDump({ text: 'Need to pay bills, email Sam, workout' });
      expect(typeof dumpId).toBe('string');
      expect(useCommandStore.getState().chaosInbox).toHaveLength(1);

      updateChaosDump(dumpId, { status: 'organized' });
      expect(useCommandStore.getState().chaosInbox[0].status).toBe('organized');

      deleteChaosDump(dumpId);
      expect(useCommandStore.getState().chaosInbox).toHaveLength(0);
    });

    it('should dedupe identical chaos dumps within window', () => {
      const { addChaosDump } = useCommandStore.getState();

      const firstId = addChaosDump({ text: 'Need to pay bills, email Sam, workout' });
      const secondId = addChaosDump({ text: '  Need   to pay bills, email Sam, workout   ' });

      expect(firstId).toBe(secondId);
      const inbox = useCommandStore.getState().chaosInbox;
      expect(inbox).toHaveLength(1);
      expect(inbox[0].mergedCount).toBe(2);
    });

    it('should not dedupe against applied items', () => {
      const { addChaosDump, updateChaosDump } = useCommandStore.getState();

      const firstId = addChaosDump({ text: 'Repeatable dump' });
      updateChaosDump(firstId, { status: 'applied' });

      const secondId = addChaosDump({ text: 'Repeatable dump' });
      expect(secondId).not.toBe(firstId);
      expect(useCommandStore.getState().chaosInbox).toHaveLength(2);
    });
  });
});
