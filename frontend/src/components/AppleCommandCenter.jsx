import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useCommandStore } from '../store/useCommandStore';
import { toast } from '../store/useToastStore';
import { PipelineSkeleton, RoutineSkeleton } from './Skeleton';
import { EmptyPipelines } from './EmptyState';
import AuthModal from './AuthModal';
import ChaosInboxModal from './ChaosInboxModal';
const WhatsNext = lazy(() => import('./WhatsNext'));
import { getApiKey, setApiKey, enhanceWorkflow, analyzeRoutinePatterns } from '../lib/gemini';
import { memoryTracker } from '../lib/memoryTracker';
import { useAuthStore } from '../store/useAuthStore';
import { normalizeRoutineCoachResult } from '../lib/routineCoach';
import { useAiAvailability } from '../hooks/useAiAvailability';
import { usePersistenceSync } from '../hooks/usePersistenceSync';
import {
  buildStepsFromTitles,
  ensureActiveStepForPipeline,
  getChaosSnippet,
} from '../lib/commandCenterHelpers';
import {
    Check, Plus, X, Settings, ChevronRight, ChevronLeft,
    MoreHorizontal, RotateCcw, Box, Briefcase,
    Zap, Link, Archive, Maximize2, Minimize2, Trash2, Palette,
    Download, Upload, Save, Calendar, Copy, Sun, Moon, Sparkles, Wand2, Trophy, ListTodo
} from 'lucide-react';
import './AppleCommandCenter.css';

// Icon Mapper (This will be replaced by getIcon and getIconType)
// const IconMap = {
//   shield: <ShieldAlert size={18} />,
//   dollar: <BadgeDollarSign size={18} />,
//   cpu: <Cpu size={18} />,
//   layers: <Layers size={18} />
// };

const AppleCommandCenter = () => {
  const { t, i18n } = useTranslation();
  const backendUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';
  const apiSecretKey = import.meta.env.VITE_API_SECRET_KEY || '';
  const { user, isGuest, initialize: initializeAuth, signOut } = useAuthStore();

  // Data selectors - only re-render when these specific values change
  const pipelines = useCommandStore(s => s.pipelines);
  const routines = useCommandStore(s => s.routines);
  const sopLibrary = useCommandStore(s => s.sopLibrary);
  const completionHistory = useCommandStore(s => s.completionHistory);
  const chaosInbox = useCommandStore(s => s.chaosInbox);
  const chaosActiveCount = useMemo(() => {
    const list = Array.isArray(chaosInbox) ? chaosInbox : [];
    return list.filter((item) => String(item?.status || '').toLowerCase() !== 'applied').length;
  }, [chaosInbox]);

  // Actions - stable references, never trigger re-renders
  const {
    addPipeline, addRoutine, deleteRoutine, toggleRoutine,
    deletePipeline, deleteStep, updateStepStatus,
    addStep, insertStep, reorderSteps, renameStep,
    renamePipeline, reorderPipelines, updateStepDescription,
    hydrate, undo, redo,
    addSopRecipe, deleteSopRecipe,
    addHistoryEvent, clearHistory,
    addChaosDump, updateChaosDump, deleteChaosDump, clearChaosInbox,
  } = useMemo(() => useCommandStore.getState(), []);

  const [editingStep, setEditingStep] = useState(null);
  const [aiApiKey, setAiApiKey] = useState(getApiKey());
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [routineCoachResult, setRoutineCoachResult] = useState(null);
  const [routineCoachLoading, setRoutineCoachLoading] = useState(false);
  const [routineCoachError, setRoutineCoachError] = useState('');
  const [anonUserId] = useState(() => {
    const key = 'dailywave_anon_user_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(key, next);
    return next;
  });

  const trackingUserId = user && !isGuest ? user.id : anonUserId;
  const { aiEnabled, hostedNeedsLogin } = useAiAvailability({
    user,
    isGuest,
  });
  const todayKey = useMemo(() => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const { isLoading, cloudSyncStatus, syncFromCloud } = usePersistenceSync({
    user,
    isGuest,
    backendUrl,
    apiSecretKey,
    hydrate,
    t,
  });

  const sessionTrackedRef = React.useRef(new Set());
  useEffect(() => {
    if (!trackingUserId) return;
    if (sessionTrackedRef.current.has(trackingUserId)) return;
    sessionTrackedRef.current.add(trackingUserId);

    memoryTracker.sessionStart(trackingUserId);
    addHistoryEvent({
      type: 'session_start',
      userId: trackingUserId,
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      date: todayKey,
    });
  }, [addHistoryEvent, todayKey, trackingUserId]);

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    initializeAuth?.().catch(() => {});
    return () => {
      const sub = useAuthStore.getState()._authSubscription;
      sub?.unsubscribe?.();
    };
  }, [initializeAuth]);

  useEffect(() => {
    if (user && !isGuest) setIsAuthOpen(false);
  }, [isGuest, user]);

  const sidebarDate = useMemo(() => {
    const now = new Date();
    const weekday = new Intl.DateTimeFormat(i18n.language || 'en', { weekday: 'short' }).format(now);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${weekday}, ${mm}.${dd}`;
  }, [i18n.language]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    // Update colors for mobile status bar
    const bgColor = theme === 'dark' ? '#0f1419' : '#f8fafc';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bgColor);
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSyncFromCloud = async () => {
    const result = await syncFromCloud();
    if (result?.requiresAuth) {
      setIsAuthOpen(true);
      return;
    }
    if (result?.ok) {
      toast.success(result.message || t('settings.synced', 'Synced from cloud.'));
      return;
    }
    toast.warning(result?.message || t('settings.syncFailed', 'Could not load from cloud.'));
  };

  const runRoutineCoach = async () => {
    if (!aiEnabled) {
      if (hostedNeedsLogin) setIsAuthOpen(true);
      else setIsSettingsOpen(true);
      return;
    }

    setRoutineCoachLoading(true);
    setRoutineCoachError('');
    try {
      const result = await analyzeRoutinePatterns(routines, completionHistory, trackingUserId);
      setRoutineCoachResult(normalizeRoutineCoachResult(result));

      memoryTracker.routinePatternCoachUsed?.(trackingUserId, {
        routinesCount: Array.isArray(routines) ? routines.length : 0,
        historyCount: Array.isArray(completionHistory) ? completionHistory.length : 0,
        usedAt: new Date().toISOString(),
      });
    } catch {
      setRoutineCoachError(t('victory.coachError', 'AI coach failed. Showing local insights only.'));
    } finally {
      setRoutineCoachLoading(false);
    }
  };

  // --- DELETE CONFIRMATION STATE ---
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'pipeline'|'step'|'routine', id, parentId, message }

  const requestDelete = (type, id, parentId = null, message = '') => {
      let msg = message;
      if (!msg) {
          if (type === 'pipeline') msg = t('workflow.deleteConfirm');
          if (type === 'step') msg = t('step.deleteConfirm');
          if (type === 'routine') msg = t('routine.deleteConfirm');
      }
      setDeleteConfirm({ type, id, parentId, message: msg });
  };

  const confirmDelete = () => {
      if (!deleteConfirm) return;
      const { type, id, parentId } = deleteConfirm;
      
      if (type === 'pipeline') deletePipeline(id);
      if (type === 'step') {
          deleteStep(parentId, id);
          if (editingStep && editingStep.step.id === id) setEditingStep(null); // Close editor if deleting open step
      }
      if (type === 'routine') deleteRoutine(id);

      setDeleteConfirm(null);
  };

  // ... (existing state) ...
  const [isAddingPipeline, setIsAddingPipeline] = useState(false);
  const [focusedPipelineId, setFocusedPipelineId] = useState(null); // Focus Mode State

  // ... (rest of state) ...



  // Specific Step Creation State
  const [isAddingStep, setIsAddingStep] = useState(false); // true/false
  const [stepAddDetails, setStepAddDetails] = useState({ pipelineId: null, index: null });
  const [newStepTitle, setNewStepTitle] = useState('');

  // Routine State
  const [newRoutineText, setNewRoutineText] = useState('');
  const [newRoutineTime, setNewRoutineTime] = useState('09:00');
  const [addingRoutineType, setAddingRoutineType] = useState(null); // 'morning' | 'afternoon' | null
  const addRoutineFormRef = React.useRef(null);

  // --- STATE ---
  const [newPipeTitle, setNewPipeTitle] = useState('');
  const [newPipeSubtitle, setNewPipeSubtitle] = useState('');
  const [newPipeColor, setNewPipeColor] = useState('blue');

  // --- CONSTANTS ---
  const ALL_COLORS = ['blue', 'red', 'green', 'purple', 'orange', 'pink', 'cyan', 'teal', 'indigo', 'yellow'];

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, targetId: null, parentId: null });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChaosInboxOpen, setIsChaosInboxOpen] = useState(false);

  const [aiEnhanceModal, setAiEnhanceModal] = useState({ open: false, pipelineId: null, loading: false, result: null });
  const ensureActiveStep = (pipelineId) => {
    ensureActiveStepForPipeline({ pipelineId, pipelines, reorderSteps });
  };

  const handleAiEnhance = async (pipelineId) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    
    if (!aiEnabled) {
      if (hostedNeedsLogin) {
        toast.info(t('auth.subtitle', 'Sign in to sync across devices'));
        setIsAuthOpen(true);
      } else {
        toast.warning(t('ai.noApiKey', 'Set up your AI key in settings first'));
        setIsSettingsOpen(true);
      }
      return;
    }

    setAiEnhanceModal({ open: true, pipelineId, loading: true, result: null });
    
    try {
      const result = await enhanceWorkflow(pipeline.title, pipeline.steps || []);
      setAiEnhanceModal(prev => ({ ...prev, loading: false, result }));
    } catch (error) {
      toast.error(`AI Error: ${error.message}`);
      setAiEnhanceModal({ open: false, pipelineId: null, loading: false, result: null });
    }
  };

  const handleApplySuggestion = (suggestion) => {
    const { pipelineId } = aiEnhanceModal;
    if (!pipelineId) return;

    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;

    const stepTitle = typeof suggestion.step === 'string' ? suggestion.step.trim() : '';
    if (!stepTitle) return;

    if (suggestion.type === 'insert_before') {
      insertStep(pipelineId, 0, stepTitle);
    } else if (suggestion.type === 'insert_after') {
      const baseIndex = Number.isInteger(suggestion.afterIndex) ? suggestion.afterIndex : pipeline.steps.length - 1;
      const insertIndex = Math.min(Math.max(baseIndex + 1, 0), pipeline.steps.length);
      insertStep(pipelineId, insertIndex, stepTitle);
    } else if (suggestion.type === 'append') {
      addStep(pipelineId, stepTitle);
    } else {
      return;
    }

    ensureActiveStep(pipelineId);
    toast.success(t('ai.stepAdded', `Added: ${stepTitle}`));
  };

  const handleApplyAllSuggestions = () => {
    const { pipelineId, result } = aiEnhanceModal;
    if (!pipelineId) return;

    const optimizedSteps = buildStepsFromTitles(result?.optimizedFlow || []);
    if (optimizedSteps.length === 0) {
      toast.warning(t('ai.workflowOptimizeFailed', 'AI did not return a full flow.'));
      return;
    }

    reorderSteps(pipelineId, optimizedSteps);
    ensureActiveStep(pipelineId);
    toast.success(t('ai.workflowOptimized', 'Workflow optimized!'));
    setAiEnhanceModal({ open: false, pipelineId: null, loading: false, result: null });
  };

  // --- DATA MANAGEMENT HANDLERS ---
  const handleExportData = () => {
      const dataStr = JSON.stringify({
        pipelines,
        routines,
        sopLibrary,
        completionHistory,
        chaosInbox,
        exportedAt: new Date().toISOString(),
      }, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dailywave_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportData = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const parsed = JSON.parse(event.target.result);
              if (parsed.pipelines && parsed.routines) {
                  hydrate({
                    pipelines: parsed.pipelines,
                    routines: parsed.routines,
                    sopLibrary: parsed.sopLibrary || [],
                    completionHistory: parsed.completionHistory || [],
                    chaosInbox: parsed.chaosInbox || [],
                  });
                  toast.success(t('settings.restoreSuccess'));
                  setIsSettingsOpen(false);
              } else {
                  toast.error(t('settings.restoreError'));
              }
          } catch (err) {
              console.error(err);
              toast.error(t('settings.restoreError'));
          }
      };
      reader.readAsText(file);
  };

  const handleResetData = () => {
      if (confirm(t('settings.resetConfirm'))) {
        hydrate({ pipelines: [], routines: [], sopLibrary: [], completionHistory: [], chaosInbox: [] });
        setIsSettingsOpen(false);
        toast.success(t('settings.dataReset'));
      }
  };

  // --- SHORTCUTS ---
  React.useEffect(() => {
    const handleKeyDown = (e) => {
        // ESC -> Close Modals & Focus
        if (e.key === 'Escape') {
            if (contextMenu && contextMenu.visible) setContextMenu(prev => ({ ...prev, visible: false }));
            if (isAddingPipeline) {
                setIsAddingPipeline(false);
                setNewPipeTitle('');
                setNewPipeSubtitle('');
            }
            if (editingStep) setEditingStep(null);
            if (focusedPipelineId) setFocusedPipelineId(null);
            return;
        }

        // Undo: Cmd+Z or Ctrl+Z
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            if (e.shiftKey) { e.preventDefault(); redo(); } else { e.preventDefault(); undo(); }
        }
        else if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, contextMenu, isAddingPipeline, editingStep, focusedPipelineId]);

  // PIPELINE REORDERING
  const dragPipeItem = React.useRef(null);
  const dragPipeOverItem = React.useRef(null);

  const handlePipeDragStart = (e, position) => {
    dragPipeItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePipeDragOver = (e, position) => {
      e.preventDefault();
      dragPipeOverItem.current = position;
  };

  const handlePipeDrop = (e) => {
      e.preventDefault();
      const dragIndex = dragPipeItem.current;
      const dropIndex = dragPipeOverItem.current;

      if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) return;

      // Reorder
      const newPipelines = [...pipelines];
      const draggedItem = newPipelines[dragIndex];
      newPipelines.splice(dragIndex, 1);
      newPipelines.splice(dropIndex, 0, draggedItem);

      reorderPipelines(newPipelines);
      
      dragPipeItem.current = null;
      dragPipeOverItem.current = null;
  };

  // PIPELINE RENAMING
  const [renamingPipeline, setRenamingPipeline] = useState(null); // { id, title }
  const [renameInput, setRenameInput] = useState('');

  // Fixed: Don't use useEffect to sync state, do it on trigger
  const startPipelineRename = (id, title) => {
      setRenamingPipeline({ id, title });
      setRenameInput(title);
  };

  const handleConfirmRename = () => {
      if (renamingPipeline && renameInput.trim()) {
          renamePipeline(renamingPipeline.id, renameInput);
          setRenamingPipeline(null);
      }
  };
  // --- HANDLERS ---
  const openPipeModal = () => {
      // Manual Selection: No default color
      setNewPipeColor(''); 
      setNewPipeTitle('');
      setNewPipeSubtitle('');
      setIsAddingPipeline(true);
  };

  const handleToggleFocus = (id) => {
      if (focusedPipelineId === id) setFocusedPipelineId(null);
      else setFocusedPipelineId(id);
  };
  // --- ROUTINES (Handlers) ---
  const handleAddRoutine = () => {
      if (!newRoutineText.trim()) return;
      
      // Auto-Determine Type based on Time (User Request)
      // If user is in "Morning" add mode but types 14:00, it should go to Afternoon.
      let finalType = addingRoutineType;
      if (newRoutineTime) {
          const hour = parseInt(newRoutineTime.split(':')[0], 10);
          if (hour >= 12) finalType = 'afternoon';
          else finalType = 'morning';
      }

      addRoutine({ title: newRoutineText, time: newRoutineTime, type: finalType });
      addHistoryEvent({
        type: 'routine_created',
        userId: trackingUserId,
        title: newRoutineText,
        time: newRoutineTime,
        routineType: finalType,
        date: todayKey,
      });
      setNewRoutineText('');
      setAddingRoutineType(null);
  };

  const closeRoutineAdder = () => {
      setNewRoutineText('');
      setAddingRoutineType(null);
  };

  useEffect(() => {
      if (!addingRoutineType) return;

      const onPointerDown = (e) => {
          const target = e.target;
          if (!(target instanceof Element)) return;
          if (addRoutineFormRef.current?.contains(target)) return;
          if (target.closest?.('[data-action="open-add-routine"]')) return;
          closeRoutineAdder();
      };

      const onKeyDown = (e) => {
          if (e.key === 'Escape') closeRoutineAdder();
      };

      document.addEventListener('pointerdown', onPointerDown, { capture: true });
      document.addEventListener('keydown', onKeyDown);
      return () => {
          document.removeEventListener('pointerdown', onPointerDown, { capture: true });
          document.removeEventListener('keydown', onKeyDown);
      };
  }, [addingRoutineType]);

  const handleCreatePipeline = () => {
      if(!newPipeTitle.trim()) return toast.warning(t('workflow.title'));
      
      // Smart Fallback: If user didn't pick a color, auto-assign the next one
      const finalColor = newPipeColor || ALL_COLORS[pipelines.length % ALL_COLORS.length];
      
      const createdTitle = newPipeTitle;
      const createdSubtitle = newPipeSubtitle;
      const pipelineId = addPipeline(createdTitle, createdSubtitle, finalColor, getIconType(createdTitle));

      memoryTracker.pipelineCreated(trackingUserId, createdTitle);
      addHistoryEvent({
        type: 'pipeline_created',
        userId: trackingUserId,
        pipelineId,
        title: createdTitle,
        subtitle: createdSubtitle,
        date: todayKey,
      });
      closePipeModal();
  };

  const handleAiAddWorkflow = ({ title, subtitle = '', steps = [] }) => {
      const workflowTitle = typeof title === 'string' ? title.trim() : '';
      if (!workflowTitle) return false;

      const workflowSubtitle = typeof subtitle === 'string' ? subtitle.trim() : '';
      const finalColor = ALL_COLORS[pipelines.length % ALL_COLORS.length];
      const stepList = buildStepsFromTitles(steps);
      const finalSteps = stepList.length ? stepList : buildStepsFromTitles(['Start', 'Finish']);

      const pipelineId = addPipeline(workflowTitle, workflowSubtitle, finalColor, getIconType(workflowTitle), { steps: finalSteps });

      memoryTracker.pipelineCreated(trackingUserId, workflowTitle);
      addHistoryEvent({
        type: 'pipeline_created',
        userId: trackingUserId,
        pipelineId,
        title: workflowTitle,
        subtitle: workflowSubtitle,
        date: todayKey,
        source: 'ai',
      });
      return true;
  };

  const handleChaosDumpSaved = ({ text, parsed = null, status, id } = {}) => {
    const input = typeof text === 'string' ? text.trim() : '';
    if (!input) return null;

    const safeParsed = typeof parsed === 'object' && parsed !== null ? parsed : null;
    const finalStatus = typeof status === 'string' ? status : safeParsed ? 'organized' : 'inbox';
    const snippet = getChaosSnippet(input);

    const dumpId = addChaosDump({ id, text: input, parsed: safeParsed, status: finalStatus });
    if (!dumpId) return null;

    memoryTracker.chaosDumpSaved(trackingUserId, {
      snippet,
      length: input.length,
      hasParsed: !!safeParsed,
      status: finalStatus,
    });

    addHistoryEvent({
      type: 'chaos_dump_saved',
      userId: trackingUserId,
      snippet,
      length: input.length,
      hasParsed: !!safeParsed,
      status: finalStatus,
      date: todayKey,
    });

    return dumpId;
  };

  const handleChaosDumpUpdated = (dumpId, updates) => {
    if (!dumpId) return false;
    const patch = typeof updates === 'object' && updates !== null ? updates : {};
    updateChaosDump(dumpId, patch);
    return true;
  };

  const openChaosInbox = (source = 'header') => {
    memoryTracker.chaosInboxOpened?.(trackingUserId, { source });
    setIsChaosInboxOpen(true);
  };

  const applyChaosParsed = (parsed) => {
    const source = typeof parsed === 'object' && parsed !== null ? parsed : {};
    const workflows = Array.isArray(source.workflows) ? source.workflows : [];
    const routinesToAdd = Array.isArray(source.routines) ? source.routines : [];
    const notes = Array.isArray(source.notes) ? source.notes : [];

    let workflowsApplied = 0;
    let routinesApplied = 0;
    let skippedWorkflows = 0;
    let skippedRoutines = 0;
    const createdPipelineIds = [];

    const existingWorkflowTitles = new Set(
      pipelines
        .map((p) => (typeof p?.title === 'string' ? p.title.trim().toLowerCase() : ''))
        .filter(Boolean)
    );

    for (let i = 0; i < workflows.length; i++) {
      const wf = workflows[i];
      const title = typeof wf?.title === 'string' ? wf.title.trim() : '';
      if (!title) continue;
      const key = title.toLowerCase();
      if (existingWorkflowTitles.has(key)) {
        skippedWorkflows += 1;
        continue;
      }

      const workflowSubtitle = typeof wf?.subtitle === 'string' ? wf.subtitle : '';
      const stepList = buildStepsFromTitles(Array.isArray(wf?.steps) ? wf.steps : []);
      const finalSteps = stepList.length ? stepList : buildStepsFromTitles(['Start', 'Finish']);
      const finalColor = ALL_COLORS[(pipelines.length + createdPipelineIds.length) % ALL_COLORS.length];

      const pipelineId = addPipeline(title, workflowSubtitle, finalColor, getIconType(title), { steps: finalSteps });
      createdPipelineIds.push(pipelineId);
      workflowsApplied += 1;
      existingWorkflowTitles.add(key);

      memoryTracker.pipelineCreated(trackingUserId, title);
      addHistoryEvent({
        type: 'pipeline_created',
        userId: trackingUserId,
        pipelineId,
        title,
        subtitle: workflowSubtitle,
        date: todayKey,
        source: 'chaos',
      });
    }

    const existingRoutineKeys = new Set(
      routines
        .map((r) => {
          const title = typeof r?.title === 'string' ? r.title.trim().toLowerCase() : '';
          const time = typeof r?.time === 'string' ? r.time.trim() : '';
          return title ? `${title}|${time}` : '';
        })
        .filter(Boolean)
    );

    for (const r of routinesToAdd) {
      const title = typeof r?.title === 'string' ? r.title.trim() : '';
      if (!title) continue;

      const time = typeof r?.time === 'string' ? r.time.trim().slice(0, 5) : '09:00';
      const key = `${title.toLowerCase()}|${time}`;
      if (existingRoutineKeys.has(key)) {
        skippedRoutines += 1;
        continue;
      }

      const hour = parseInt(time.split(':')[0], 10);
      const type = hour >= 12 ? 'afternoon' : 'morning';
      addRoutine({ title, time, type });
      addHistoryEvent({
        type: 'routine_created',
        userId: trackingUserId,
        title,
        time,
        routineType: type,
        date: todayKey,
        source: 'chaos',
      });
      routinesApplied += 1;
      existingRoutineKeys.add(key);
    }

    memoryTracker.chaosDumpApplied(trackingUserId, {
      workflowsApplied,
      routinesApplied,
      notesCount: notes.length,
    });

    addHistoryEvent({
      type: 'chaos_dump_applied',
      userId: trackingUserId,
      workflowsApplied,
      routinesApplied,
      notesCount: notes.length,
      date: todayKey,
    });

    return {
      workflowsApplied,
      routinesApplied,
      skippedWorkflows,
      skippedRoutines,
      notesCount: notes.length,
      createdPipelineIds,
    };
  };

  const handleChaosDumpApply = ({ dumpId, text, parsed } = {}) => {
    const safeParsed = typeof parsed === 'object' && parsed !== null ? parsed : null;
    const hasTargets =
      (safeParsed?.workflows || []).length > 0 ||
      (safeParsed?.routines || []).length > 0;

    if (!hasTargets) {
      return false;
    }

    const input = typeof text === 'string' ? text.trim() : '';
    if (dumpId) {
      updateChaosDump(dumpId, {
        ...(input ? { text: input } : {}),
        ...(safeParsed ? { parsed: safeParsed } : {}),
        status: 'applied',
      });
    } else if (input) {
      dumpId = handleChaosDumpSaved({ text: input, parsed: safeParsed, status: 'applied' });
    }

    return applyChaosParsed(safeParsed);
  };

    const handlePipelineDelete = (id, e) => {
      e.stopPropagation();
      requestDelete('pipeline', id);
    };

  const openEditor = (pipelineId, step) => {
    setEditingStep({ pipelineId, step });
    setContextMenu(null);
  };

  const closeEditor = () => setEditingStep(null);

  const closePipeModal = () => {
      setIsAddingPipeline(false);
      setNewPipeTitle('');
      setNewPipeSubtitle('');
  };

  const closeStepModal = () => {
    setIsAddingStep(false);
    setNewStepTitle('');
    setStepAddDetails({ pipelineId: null, index: null });
  };

  const saveStepStatus = (status) => {
    if (editingStep) {
        const prevStatus = editingStep.step.status;
        const pipelineId = editingStep.pipelineId;
        const stepId = editingStep.step.id;
        const stepTitle = editingStep.step.title;

        updateStepStatus(pipelineId, stepId, status);

        if (status === 'done' && prevStatus !== 'done') {
          const pipelineTitle = pipelines.find(p => p.id === pipelineId)?.title || '';
          memoryTracker.stepCompleted(trackingUserId, pipelineTitle, stepTitle);
          addHistoryEvent({
            type: 'step_completed',
            userId: trackingUserId,
            pipelineId,
            pipelineTitle,
            stepId,
            stepTitle,
            date: todayKey,
          });
        }

        closeEditor();
    }
  };

  // Helper to guess icon
  const getIconType = (title) => {
    if(title.includes('출고') || title.includes('배송')) return 'box';
    if(title.includes('매칭') || title.includes('연동')) return 'link';
    if(title.includes('위기') || title.includes('긴급')) return 'zap';
    return 'briefcase';
  };

  const getIcon = (type) => {
      // const colors = {
      //     blue: '#007aff', red: '#ff3b30', green: '#34c759',
      //     purple: '#af52de', orange: '#ff9500'
      // };
      switch (type) {
        case 'zap': return <Zap size={20} />;
        case 'box': return <Box size={20} />;
        case 'link': return <Link size={20} />;
        case 'sun': return <Sun size={20} />;
        case 'palette': return <Palette size={20} />;
        case 'calendar': return <Calendar size={20} />;
        default: return <Briefcase size={20} />;
      }
  };

  // --- Drag & Drop Logic ---
  const [draggedItem, setDraggedItem] = useState(null); // { pipelineId, index }

  const handleDragStart = (e, pipelineId, index) => {
    setDraggedItem({ pipelineId, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, pipelineId) => {
    e.preventDefault(); // Necessary for drop
    if (!draggedItem || draggedItem.pipelineId !== pipelineId) return;
  };

  const handleDrop = (e, pipelineId, dropIndex) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.pipelineId !== pipelineId) return;

    const dragIndex = draggedItem.index;
    if (dragIndex === dropIndex) return;

    // Reorder
    const pipeline = pipelines.find(p => p.id === pipelineId);
    const newSteps = [...pipeline.steps];
    const [movedStep] = newSteps.splice(dragIndex, 1);
    newSteps.splice(dropIndex, 0, movedStep);

    reorderSteps(pipelineId, newSteps);
    setDraggedItem(null);
  };

  // --- Context Menu Logic ---
  const handleContextMenu = (e, pipelineId) => {
      e.preventDefault();

      // Calculate approximate index based on X position
      let insertIndex = -1;
      const container = e.currentTarget;
      const children = Array.from(container.querySelectorAll('.acc-step'));

      children.forEach((child, idx) => {
          const childRect = child.getBoundingClientRect();
          const center = childRect.left + childRect.width / 2;
          if (e.clientX < center && insertIndex === -1) {
              insertIndex = idx;
          }
      });

      if (insertIndex === -1) insertIndex = children.length;

      setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          pipelineId,
          index: insertIndex
      });
  };

  // Mobile more button handler
  const handleMobileMoreMenu = (e, pipelineId) => {
      e.preventDefault();
      e.stopPropagation();
      const pipeline = pipelines.find(p => p.id === pipelineId);
      const stepsCount = pipeline?.steps?.length || 0;

      setContextMenu({
          visible: true,
          x: e.clientX || e.touches?.[0]?.clientX || window.innerWidth / 2,
          y: e.clientY || e.touches?.[0]?.clientY || 100,
          pipelineId,
          index: stepsCount // Add at end by default
      });
  };

  const handleSavePipelineAsRecipe = (pipelineId) => {
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline) return;

      addSopRecipe({
        title: pipeline.title,
        subtitle: pipeline.subtitle || '',
        color: pipeline.color || 'blue',
        iconType: pipeline.iconType || 'briefcase',
        steps: (pipeline.steps || []).map((step) => ({
          title: step.title,
          description: step.description || '',
        })),
      });

      addHistoryEvent({
        type: 'recipe_saved',
        userId: trackingUserId,
        pipelineId: pipeline.id,
        title: pipeline.title,
        date: todayKey,
      });

      toast.success(t('recipes.saved', 'Saved to recipes'));
  };

  const handleCreatePipelineFromRecipe = (recipe) => {
      if (!recipe) return;

      const rawSteps = Array.isArray(recipe.steps) ? recipe.steps : [];
      const steps = rawSteps.length > 0
        ? rawSteps.map((step, index) => ({
            title: step.title,
            description: step.description || '',
            status: index === 0 ? 'active' : 'locked',
          }))
        : buildStepsFromTitles(['Start', 'Finish']);

      const pipelineId = addPipeline(
        recipe.title || t('workflow.name', 'Workflow Name'),
        recipe.subtitle || '',
        recipe.color || ALL_COLORS[pipelines.length % ALL_COLORS.length],
        recipe.iconType || 'briefcase',
        { steps }
      );

      memoryTracker.pipelineCreated(trackingUserId, recipe.title);
      addHistoryEvent({
        type: 'pipeline_created',
        userId: trackingUserId,
        pipelineId,
        title: recipe.title,
        subtitle: recipe.subtitle || '',
        source: 'recipe',
        recipeId: recipe.id,
        date: todayKey,
      });

      ensureActiveStep(pipelineId);
      toast.success(t('recipes.used', 'Recipe added as workflow'));
  };

  const handleConfirmAddStep = () => {
      if(!newStepTitle) return;
      if(stepAddDetails.index !== null) {
          insertStep(stepAddDetails.pipelineId, stepAddDetails.index, newStepTitle);
      } else {
          // Fallback append
          addStep(stepAddDetails.pipelineId, newStepTitle);
      }
      closeStepModal();
  };

  // Trigger from Header "+" Button
  const handleHeaderAddStep = (pipelineId) => {
     setStepAddDetails({ pipelineId, index: null }); // Null means append
     setIsAddingStep(true);
  };

  // Trigger from Context Menu
  const handleContextAdd = () => {
      if(contextMenu) {
        setStepAddDetails({ pipelineId: contextMenu.pipelineId, index: contextMenu.index });
        setIsAddingStep(true);
        setContextMenu(null);
      }
  };

  // FILTERED RENDER
  // If focused, show only that one. Otherwise show all.
  const displayPipelines = focusedPipelineId
        ? pipelines.filter(p => p.id === focusedPipelineId)
        : pipelines;

  // --- TIME & SORTING ---
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handleToggleRoutineTracked = (routine) => {
      if (!routine?.id) return;
      const nextDone = !routine.done;

      toggleRoutine(routine.id);

      if (nextDone) {
        memoryTracker.routineCompleted(trackingUserId, routine);
        addHistoryEvent({
          type: 'routine_completed',
          userId: trackingUserId,
          routineId: routine.id,
          title: routine.title,
          time: routine.time,
          routineType: routine.type,
          date: todayKey,
        });
      } else {
        addHistoryEvent({
          type: 'routine_unchecked',
          userId: trackingUserId,
          routineId: routine.id,
          title: routine.title,
          time: routine.time,
          routineType: routine.type,
          date: todayKey,
        });
      }
  };

  const getLocalDateKeyFromIso = (isoString) => {
      const parsed = isoString ? new Date(isoString) : new Date();
      const date = Number.isFinite(parsed.getTime()) ? parsed : new Date();
      const yyyy = String(date.getFullYear());
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
  };

  const formatClockTime = (isoString) => {
      const parsed = isoString ? new Date(isoString) : new Date();
      const date = Number.isFinite(parsed.getTime()) ? parsed : new Date();
      return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  const todayEvents = useMemo(() => {
      const events = Array.isArray(completionHistory) ? completionHistory : [];
      return events
        .map((event) => {
          const base = typeof event === 'object' && event !== null ? event : {};
          const dateKey = typeof base.date === 'string' ? base.date : getLocalDateKeyFromIso(base.at);
          return { ...base, _dateKey: dateKey };
        })
        .filter((event) => event._dateKey === todayKey)
        .sort((a, b) => {
          const aMs = typeof a?.at === 'string' ? Date.parse(a.at) : NaN;
          const bMs = typeof b?.at === 'string' ? Date.parse(b.at) : NaN;
          return (Number.isFinite(aMs) ? aMs : 0) - (Number.isFinite(bMs) ? bMs : 0);
        });
  }, [completionHistory, todayKey]);

  const victoryStats = useMemo(() => {
      const attemptedTypes = new Set([
        'routine_completed',
        'routine_unchecked',
        'routine_created',
        'step_created',
        'step_completed',
        'pipeline_created',
        'recipe_saved',
        'ai_recommendation_used',
      ]);

      const completedTypes = new Set(['routine_completed', 'step_completed']);

      const attemptedCount = todayEvents.filter((e) => attemptedTypes.has(e.type)).length;
      const completedCount = todayEvents.filter((e) => completedTypes.has(e.type)).length;

      const remainingRoutines = routines.filter((r) => !r.done).length;
      const remainingSteps = pipelines.reduce((sum, pipeline) => {
        const steps = Array.isArray(pipeline.steps) ? pipeline.steps : [];
        return sum + steps.filter((s) => s.status !== 'done').length;
      }, 0);

      return {
        attemptedCount,
        completedCount,
        remainingCount: remainingRoutines + remainingSteps,
        remainingRoutines,
        remainingSteps,
      };
  }, [pipelines, routines, todayEvents]);

  const victoryInsight = useMemo(() => {
      const events = Array.isArray(completionHistory) ? completionHistory : [];
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const hourCounts = new Array(24).fill(0);

      events.forEach((event) => {
        const type = event?.type;
        if (type !== 'routine_completed' && type !== 'step_completed') return;
        const atMs = typeof event?.at === 'string' ? Date.parse(event.at) : NaN;
        if (!Number.isFinite(atMs) || atMs < cutoff) return;
        const hour = new Date(atMs).getHours();
        hourCounts[hour] += 1;
      });

      const max = Math.max(...hourCounts);
      if (max < 3) return null;
      const hour = hourCounts.indexOf(max);
      return { hour, count: max };
  }, [completionHistory]);

  const isEveningNow = new Date().getHours() >= 19;

  const tomorrowCandidate = useMemo(() => {
      const pendingRoutines = routines
        .filter((r) => !r.done)
        .slice()
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      if (pendingRoutines[0]) {
        return { kind: 'routine', title: pendingRoutines[0].title };
      }

      for (const pipeline of pipelines) {
        const steps = Array.isArray(pipeline.steps) ? pipeline.steps : [];
        const nextStep =
          steps.find((s) => s.status === 'active') ||
          steps.find((s) => s.status === 'pending') ||
          steps.find((s) => s.status === 'locked');
        if (nextStep?.title) {
          return { kind: 'step', title: nextStep.title, pipelineTitle: pipeline.title };
        }
      }

      return null;
  }, [pipelines, routines]);

  const getEventDisplay = (event) => {
      const type = event?.type;
      if (type === 'session_start') return { emoji: '🌊', text: t('victory.event.session', 'Opened the app') };
      if (type === 'routine_created') return { emoji: '🕒', text: `${t('victory.event.routineCreated', 'Created routine')}: ${event.title || ''}`.trim() };
      if (type === 'routine_completed') return { emoji: '✅', text: `${t('victory.event.routineDone', 'Routine completed')}: ${event.title || ''}`.trim() };
      if (type === 'routine_unchecked') return { emoji: '↩️', text: `${t('victory.event.routineUndo', 'Routine unchecked')}: ${event.title || ''}`.trim() };
      if (type === 'pipeline_created') return { emoji: '🧩', text: `${t('victory.event.pipelineCreated', 'Created workflow')}: ${event.title || ''}`.trim() };
      if (type === 'step_created') return { emoji: '➕', text: `${t('victory.event.stepCreated', 'Added step')}: ${event.stepTitle || event.title || ''}`.trim() };
      if (type === 'step_completed') return { emoji: '🏁', text: `${t('victory.event.stepDone', 'Step completed')}: ${event.stepTitle || ''}`.trim() };
      if (type === 'recipe_saved') return { emoji: '📌', text: `${t('victory.event.recipeSaved', 'Saved as recipe')}: ${event.title || ''}`.trim() };
      if (type === 'ai_recommendation_used') return { emoji: '✨', text: `${t('victory.event.aiUsed', 'Used AI recommendation')}: ${event.task || ''}`.trim() };
      return { emoji: '•', text: t('victory.event.generic', 'Activity') };
  };

  const renderRoutineList = (type) => {
      const sortedRoutines = routines
          .filter(r => r.type === type)
          .sort((a, b) => a.time.localeCompare(b.time));

      const renderedItems = [];
      let timeMarkerInserted = false;

      sortedRoutines.forEach((r) => {
          // Timeline Marker Logic
          if (!timeMarkerInserted && currentTime < r.time) {
             const currentHour = new Date().getHours();
             const isMorningNow = currentHour < 12;
             
             if ( (type === 'morning' && isMorningNow) || (type === 'afternoon' && !isMorningNow) ) {
                 renderedItems.push(
                     <div key="timeline-marker" className="timeline-marker">
                         <div className="line"></div>
                         <div className="badge">{t('status.now', 'Now')} {currentTime}</div>
                         <div className="line"></div>
                     </div>
                 );
                 timeMarkerInserted = true;
             }
          }

          renderedItems.push(
             <div key={r.id} className={`acc-routine-item ${r.done ? 'done' : ''}`}>
                <button
                    className={`checkbox-circle ${type==='afternoon'?'evening':''} ${r.done ? 'checked' : ''}`}
                    onClick={() => handleToggleRoutineTracked(r)}
                    aria-label={r.done ? t('routine.markIncomplete', 'Mark as incomplete') : t('routine.markComplete', 'Mark as complete')}
                    aria-pressed={r.done}
                >
                   {r.done && <Check size={12} strokeWidth={4} />}
                </button>
                 <div className="text-content">
                   <div className="time">{r.time}</div>
                   <div className="title">
                       {r.title && r.title.startsWith && r.title.startsWith(r.time) ? r.title.replace(r.time, '').trim() : r.title}
                   </div>
                </div>
                <button className="del-btn" onClick={() => requestDelete('routine', r.id)} aria-label={t('routine.delete', 'Delete routine')}><X size={14}/></button>
             </div>
          );
      });
      return renderedItems;
  };

  return (
    <div className="acc-container" onClick={() => setContextMenu(null)}>

       {/* 1. SIDEBAR - 집중모드일 때 숨김 */}
       {!focusedPipelineId && (
       <aside className="acc-sidebar">
         {/* Logo & Date */}
         <div className="sidebar-top">
             <div className="acc-logo">{t('sidebar.title', 'Routine')}</div>
             <div className="date-block">
                 <span className="date-label">{t('sidebar.today', 'Today')}</span>
                 <span className="date-value">{sidebarDate}</span>
             </div>
         </div>

          {/* Morning Routines */}
          <div className="routine-block">
             <div className="block-header">
               <h3>{t('sidebar.morningRoutine')}</h3>
	               <button className="add-mini-btn" data-action="open-add-routine" onClick={() => setAddingRoutineType('morning')} aria-label={t('routine.addMorning', 'Add morning routine')}><Plus size={12}/></button>
             </div>
             <div className="routine-list">
                 {isLoading ? (
                     <>
                         <RoutineSkeleton />
                         <RoutineSkeleton />
                     </>
                 ) : (
                     <>
                         {renderRoutineList('morning')}
                     </>
                 )}
                 {addingRoutineType === 'morning' && (
	                     <div className="add-routine-form" ref={addRoutineFormRef}>
	                         <input type="time" value={newRoutineTime} onChange={e => setNewRoutineTime(e.target.value)} className="mini-input time"/>
	                         <input type="text" placeholder={t('sidebar.addPlaceholder')} value={newRoutineText} onChange={e => setNewRoutineText(e.target.value)} className="mini-input text" autoFocus onKeyDown={e => e.key==='Enter' && handleAddRoutine(e)}/>
	                         <button className="confirm-btn" onClick={handleAddRoutine}><Check size={12}/></button>
	                     </div>
                 )}
             </div>
          </div>

          {/* Afternoon Routines */}
          <div className="routine-block">
             <div className="block-header">
               <h3>{t('sidebar.afternoonRoutine')}</h3>
	               <button className="add-mini-btn" data-action="open-add-routine" onClick={() => setAddingRoutineType('afternoon')} aria-label={t('routine.addAfternoon', 'Add afternoon routine')}><Plus size={12}/></button>
             </div>
             <div className="routine-list">
                 {isLoading ? (
                     <>
                         <RoutineSkeleton />
                         <RoutineSkeleton />
                     </>
                 ) : (
                     <>
                         {renderRoutineList('afternoon')}
                     </>
                 )}
                 {addingRoutineType === 'afternoon' && (
	                     <div className="add-routine-form" ref={addRoutineFormRef}>
	                         <input type="time" value={newRoutineTime} onChange={e => setNewRoutineTime(e.target.value)} className="mini-input time"/>
	                         <input type="text" placeholder={t('sidebar.addPlaceholder')} value={newRoutineText} onChange={e => setNewRoutineText(e.target.value)} className="mini-input text" autoFocus onKeyDown={e => e.key==='Enter' && handleAddRoutine(e)}/>
	                         <button className="confirm-btn" onClick={handleAddRoutine}><Check size={12}/></button>
	                     </div>
                 )}
             </div>
          </div>

       </aside>
       )}

        {/* 2. MAIN CONTENT */}
        <main className="acc-main">
          <div className="acc-content">
            <header className="acc-header">
               <div className="header-left">
                 <div>
                   <h1>{t('app.name')}</h1>
                   <p className="header-subtitle">
                     {focusedPipelineId ? t('header.focusMode') : t('app.tagline')}
                   </p>
                 </div>
               </div>

               {/* Mobile: Theme toggle + Settings button */}
               <div className="mobile-header-actions">
                   <button className="mobile-theme-btn" onClick={toggleTheme} title={theme === 'light' ? t('settings.darkMode') : t('settings.lightMode')} aria-label={theme === 'light' ? t('settings.darkMode') : t('settings.lightMode')}>
                       {theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}
                   </button>
                   <button className="mobile-chaos-btn with-badge" onClick={() => openChaosInbox('header_mobile')} title={t('chaos.title', 'Chaos Inbox')} aria-label={t('chaos.title', 'Chaos Inbox')}>
                       <ListTodo size={18}/>
                       {chaosActiveCount > 0 && (
                         <span className="acc-icon-badge">{Math.min(99, chaosActiveCount)}</span>
                       )}
                   </button>
                   <button className="mobile-victory-btn" onClick={() => setIsVictoryOpen(true)} title={t('victory.title', 'Victory Wall')} aria-label={t('victory.title', 'Victory Wall')}>
                       <Trophy size={18}/>
                   </button>
                   <button className="mobile-settings-btn" onClick={() => setIsSettingsOpen(true)} title={t('settings.title')} aria-label={t('settings.title')}>
                       <Settings size={18}/>
                   </button>
               </div>

               {/* Desktop: Action buttons (hidden on mobile) */}
               <div className="acc-actions">
                  <div className="acc-status-pill">
                    <span className="status-dot" />
                    <span>{t('header.systemStatus', 'System Optimal')}</span>
                  </div>
                  <button
                    className="acc-primary-icon"
                    onClick={openPipeModal}
                    title={t('header.newWorkflow')}
                    aria-label={t('header.newWorkflow')}
                  >
                      <Plus size={16}/>
                  </button>
                  <button className="acc-icon-btn" onClick={toggleTheme} title={theme === 'light' ? t('settings.darkMode') : t('settings.lightMode')}>
                      {theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}
                  </button>
                  <button className="acc-icon-btn with-badge" onClick={() => openChaosInbox('header')} title={t('chaos.title', 'Chaos Inbox')} aria-label={t('chaos.title', 'Chaos Inbox')}>
                    <ListTodo size={18}/>
                    {chaosActiveCount > 0 && (
                      <span className="acc-icon-badge">{Math.min(99, chaosActiveCount)}</span>
                    )}
                  </button>
                  <button className="acc-icon-btn" onClick={() => setIsVictoryOpen(true)} title={t('victory.title', 'Victory Wall')} aria-label={t('victory.title', 'Victory Wall')}>
                    <Trophy size={18}/>
                  </button>
                  <button className="acc-icon-btn" onClick={() => setIsSettingsOpen(true)} title={t('settings.title')} aria-label={t('settings.title')}>
                    <Settings size={18}/>
                  </button>
               </div>
            </header>

            <div className="acc-grid">
{!isLoading && !focusedPipelineId && (
                  <Suspense fallback={<div className="whats-next-card" />}>
                  <WhatsNext
                      pipelines={pipelines} 
                      routines={routines} 
                      userId={trackingUserId}
                      onRecommendationUsed={(recommendation) => {
                        if (!recommendation) return;
                        memoryTracker.aiRecommendationUsed(trackingUserId, recommendation);
                        addHistoryEvent({
                          type: 'ai_recommendation_used',
                          userId: trackingUserId,
                          task: recommendation.task,
                          reason: recommendation.reason,
                          estimatedMinutes: recommendation.estimatedMinutes,
                          date: todayKey,
                        });
                      }}
                      onOpenSettings={() => setIsSettingsOpen(true)}
                      onOpenAuth={() => setIsAuthOpen(true)}
                      onAddRoutine={(title, time) => {
                          const hour = parseInt(time.split(':')[0], 10);
                          const type = hour >= 12 ? 'afternoon' : 'morning';
                          addRoutine({ title, time, type });
                          addHistoryEvent({
                            type: 'routine_created',
                            userId: trackingUserId,
                            title,
                            time,
                            routineType: type,
                            date: todayKey,
                            source: 'ai',
                          });
                      }}
                      onAddStep={(title, workflowName) => {
                          const stepTitle = typeof title === 'string' ? title.trim() : '';
                          if (!stepTitle) return false;

                          const workflowQuery = typeof workflowName === 'string' ? workflowName.trim().toLowerCase() : '';
                          const pipeline = workflowQuery
                              ? pipelines.find(p => p.title.toLowerCase().includes(workflowQuery))
                              : pipelines[0];

                          if (pipeline) {
                              addStep(pipeline.id, stepTitle);
                              ensureActiveStep(pipeline.id);
                              addHistoryEvent({
                                type: 'step_created',
                                userId: trackingUserId,
                                pipelineId: pipeline.id,
                                pipelineTitle: pipeline.title,
                                stepTitle,
                                date: todayKey,
                                source: 'ai',
                              });
                              return true;
                          }

                          return false;
                      }}
                      onAddWorkflow={(data) => handleAiAddWorkflow(data)}
                      onChaosDumpSaved={(data) => handleChaosDumpSaved(data)}
                      onChaosDumpUpdated={(dumpId, updates) => handleChaosDumpUpdated(dumpId, updates)}
                      onChaosDumpApply={(data) => handleChaosDumpApply(data)}
                  />
                  </Suspense>
              )}
             {isLoading ? (
                 <>
                    <PipelineSkeleton />
                    <PipelineSkeleton />
                    <PipelineSkeleton />
                 </>
             ) : displayPipelines.length === 0 ? (
                 <EmptyPipelines onAction={openPipeModal} />
             ) : (
             displayPipelines.map((p, index) => {
                const isFocused = focusedPipelineId === p.id;
                const isHex = p.color && p.color.startsWith('#');
                                 return (
               <div 
                  key={p.id} 
                  className={`acc-card ${isFocused ? 'expanded' : ''}`}
                  draggable={!isFocused} // Only draggable when not expanded
                  onDragStart={(e) => handlePipeDragStart(e, index)} // Need index from map map(p, index)
                  onDragOver={(e) => handlePipeDragOver(e, index)}
                  onDrop={(e) => handlePipeDrop(e)}
               >
                  <div className="card-header">
                     <div
                          className={`icon-wrapper ${!isHex ? p.color : ''}`}
                          style={isHex ? { backgroundColor: p.color } : {}}
                          onClick={() => { if (window.innerWidth <= 768 && !focusedPipelineId) handleToggleFocus(p.id); }}
                      >
                         {getIcon(p.iconType, p.color)}
                      </div>
                      <div
                          className="header-text"
                          onDoubleClick={() => startPipelineRename(p.id, p.title)}
                          onClick={() => { if (window.innerWidth <= 768 && !focusedPipelineId) handleToggleFocus(p.id); }}
                          title={t('workflow.rename')}
                      >
                         <h2>{p.title}</h2>
                         <p>{p.subtitle}</p>
                      </div>

                     <div className="card-actions">
                         {/* Desktop: 모든 버튼 표시 */}
                         <button className="icon-action-btn desktop-only" onClick={() => handleToggleFocus(p.id)} title={isFocused ? t('header.exitFocus', 'Exit Focus') : t('header.focusMode')}>
                             {isFocused ? <X size={16}/> : <Maximize2 size={16}/>}
                         </button>
                         <button className="icon-action-btn ai-btn desktop-only" onClick={() => handleAiEnhance(p.id)} title={t('ai.enhance', 'AI Enhance')}>
                             <Wand2 size={16} />
                         </button>
                         <button className="icon-action-btn desktop-only" onClick={() => handleHeaderAddStep(p.id)}>
                             <Plus size={16} />
                         </button>
                         <button className="icon-action-btn danger desktop-only" onClick={(e) => handlePipelineDelete(p.id, e)}>
                             <Trash2 size={16} />
                         </button>
                         {/* Mobile: 더보기 버튼만 표시 */}
                         <button className="icon-action-btn mobile-only" onClick={(e) => handleMobileMoreMenu(e, p.id)}>
                             <MoreHorizontal size={18} />
                         </button>
                    </div>
                 </div>

                 <div
                     className="card-body"
                     onContextMenu={(e) => handleContextMenu(e, p.id)}
                    >
                    {!isFocused && <div className="acc-track-line"></div>}

                    <div className="acc-steps-container">
                       {p.steps.map((step, idx) => (
                         <div
                             key={step.id}
                             className={`acc-step ${step.status} ${!isHex?p.color:''}`}
                             style={isHex ? { '--active-color': p.color } : {}}
                             draggable
                             onDragStart={(e) => handleDragStart(e, p.id, idx)}
                             onDragOver={(e) => handleDragOver(e, p.id, idx)}
                             onDrop={(e) => handleDrop(e, p.id, idx)}
                             onContextMenu={(e) => {
                                 e.stopPropagation(); 
                                 openEditor(p.id, step);
                             }}
                             onClick={() => openEditor(p.id, step)}
                         >
                            {step.status === 'active' && <div className="now-tag">Now</div>}
                            <div className="step-indicator">
                                {step.status === 'done' && <Check size={14} strokeWidth={3} />}
                                {step.status === 'active' && <div className="white-dot" />}
                                {(step.status === 'pending' || step.status === 'locked') && <span className="num">{idx + 1}</span>}
                            </div>
                            <span className="step-label">{step.title}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            );
            }))}

            {/* Mobile: Add workflow button - only when workflows exist and not in focus mode */}
            {!isLoading && displayPipelines.length > 0 && !focusedPipelineId && (
                <button className="mobile-add-workflow-btn" onClick={openPipeModal}>
                    <Plus size={18}/> {t('workflow.create')}
                </button>
            )}

            {/* 집중모드 종료 버튼 - 집중모드일 때만 표시 */}
            {focusedPipelineId && (
                <button className="exit-focus-btn" onClick={() => setFocusedPipelineId(null)}>
                    <X size={18}/> {t('header.exitFocus', 'Exit Focus')}
                </button>
            )}
         </div>
        </div>
       </main>

        {/* CONTEXT MENU */}
        {contextMenu && contextMenu.visible && (
            <div
              className="context-menu"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
                {/* Focus Mode Toggle */}
                <button onClick={() => {
                    handleToggleFocus(contextMenu.pipelineId);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                }}>
                    {focusedPipelineId === contextMenu.pipelineId ? <X size={14}/> : <Maximize2 size={14}/>}
                    {focusedPipelineId === contextMenu.pipelineId ? t('header.exitFocus', 'Exit Focus') : t('header.focusMode')}
                </button>
                {/* AI Enhance */}
                <button onClick={() => {
                    handleAiEnhance(contextMenu.pipelineId);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                }}>
                    <Wand2 size={14}/> AI
                </button>
                {/* Add Step */}
                <button onClick={handleContextAdd}>
                    <Plus size={14}/> {t('step.add')}
                </button>
                {/* Save as Recipe */}
                <button onClick={() => {
                    handleSavePipelineAsRecipe(contextMenu.pipelineId);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                }}>
                    <Archive size={14}/> {t('recipes.save', 'Save as Recipe')}
                </button>
                {/* Delete */}
                <button onClick={(e) => {
                    handlePipelineDelete(contextMenu.pipelineId, e);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                }} style={{ color: 'var(--color-danger)' }}>
                    <Trash2 size={14}/> {t('workflow.delete')}
                </button>
            </div>
        )}

        {/* VICTORY WALL MODAL */}
        {isVictoryOpen && (
         <div className="modal-overlay" onClick={() => setIsVictoryOpen(false)}>
             <div className="glass-modal victory-modal" onClick={e => e.stopPropagation()}>
                 <div className="modal-header">
                     <div className="modal-header-center">
                         <button className="modal-back-btn" onClick={() => setIsVictoryOpen(false)}>
                             <ChevronLeft size={24}/>
                         </button>
                         <h3>{t('victory.title', 'Victory Wall')}</h3>
                     </div>
                     <button className="close-btn" onClick={() => setIsVictoryOpen(false)}><X size={20}/></button>
                 </div>

                 <div className="victory-hero">
                     <div className="victory-badge">
                         <Trophy size={18} />
                     </div>
                     <div className="victory-hero-text">
                         <div className="victory-date">{sidebarDate}</div>
                         <div className="victory-subtitle">{t('victory.subtitle', 'Small wins count.')}</div>
                     </div>
                 </div>

                 <div className="victory-stats">
                     <div className="victory-stat">
                         <div className="label">{t('victory.tried', 'Tried')}</div>
                         <div className="value">{victoryStats.attemptedCount}</div>
                     </div>
                     <div className="victory-stat">
                         <div className="label">{t('victory.done', 'Done')}</div>
                         <div className="value">{victoryStats.completedCount}</div>
                     </div>
                     <div className="victory-stat">
                         <div className="label">{t('victory.left', 'Left')}</div>
                         <div className="value">{victoryStats.remainingCount}</div>
                     </div>
                 </div>

                 <div className="victory-card">
                     <div className="victory-card-title">
                         {isEveningNow ? t('victory.noShameTitle', 'No‑Shame Evening') : t('victory.gentleTitle', 'Gentle Summary')}
                     </div>
                     <div className="victory-card-body">
                         {isEveningNow
                           ? t('victory.noShameBody', "You showed up today. That matters.")
                           : t('victory.gentleBody', "You're doing fine. Pick one small next step.")
                         }
                     </div>
                     <div className="victory-card-tip">
                         {tomorrowCandidate
                           ? `${t('victory.tomorrowStartWith', 'Tomorrow, start with')}: ${tomorrowCandidate.title}`
                           : t('victory.tomorrowJustOne', 'Tomorrow, one small step is enough.')
                         }
                     </div>
                 </div>

	                 <div className="victory-insight">
	                     <div className="victory-insight-title">{t('victory.insightTitle', 'Pattern')}</div>
	                     <div className="victory-insight-body">
	                         {victoryInsight
	                           ? `${t('victory.insightText', 'Most wins happen around')} ${String(victoryInsight.hour).padStart(2, '0')}:00 (${victoryInsight.count})`
	                           : t('victory.insightNone', 'Keep going — insights get better with more data.')
	                         }
	                     </div>
	                 </div>

	                 <div className="victory-coach">
	                     <div className="victory-coach-header">
	                         <div className="victory-coach-title">{t('victory.coachTitle', 'Routine Pattern Coach')}</div>
	                         <button
	                           className="victory-coach-btn"
	                           onClick={runRoutineCoach}
	                           disabled={routineCoachLoading}
	                           aria-label={t('victory.coachCta', 'Add AI insights')}
	                         >
	                           <Sparkles size={14} />
		                           {routineCoachLoading
		                             ? t('victory.coachLoading', 'Analyzing...')
		                             : aiEnabled
		                               ? t('victory.coachCta', 'Add AI insights')
		                               : hostedNeedsLogin
		                                 ? t('auth.signIn', 'Sign In')
		                                 : t('victory.coachConnect', 'Connect AI')}
		                         </button>
		                     </div>

		                     {!aiEnabled && (
		                       <div className="victory-coach-hint">
		                         {hostedNeedsLogin
		                           ? t('auth.subtitle', 'Sign in to sync across devices')
		                           : t('victory.coachHint', 'Connect AI to get routine pattern insights. Local insights still work.')}
		                       </div>
		                     )}

	                     {!!routineCoachError && (
	                       <div className="victory-coach-error">{routineCoachError}</div>
	                     )}

	                     {routineCoachResult && (
	                       <div className="victory-coach-body">
	                         <div className="victory-coach-summary">
	                           <div className="victory-coach-score">
	                             {t('victory.coachScore', 'Score')}: {routineCoachResult.overallScore}/100
	                           </div>
	                           <div className="victory-coach-top">
	                             {routineCoachResult.topSuggestion || t('victory.coachEmpty', 'No additional insights yet.')}
	                           </div>
	                         </div>

	                         {routineCoachResult.insights.length > 0 && (
	                           <div className="victory-coach-list">
	                             {routineCoachResult.insights.map((insight, idx) => {
	                               const icon =
	                                 insight.type === 'positive'
	                                   ? '✨'
	                                   : insight.type === 'warning'
	                                     ? '⚠️'
	                                     : '💡';
	                               return (
	                                 <div key={`${idx}-${insight.message}`} className="victory-coach-item">
	                                   <div className="victory-coach-item-icon">{icon}</div>
	                                   <div className="victory-coach-item-text">{insight.message}</div>
	                                 </div>
	                               );
	                             })}
	                           </div>
	                         )}
	                       </div>
	                     )}
	                 </div>
	
	                 <div className="victory-timeline">
	                     <div className="victory-timeline-title">{t('victory.timeline', 'Timeline')}</div>
	                     {todayEvents.length === 0 ? (
	                         <p className="settings-text-muted" style={{ marginTop: 8 }}>
                             {t('victory.timelineEmpty', 'No events yet. Any small action counts.')}
                         </p>
                     ) : (
                         <div className="victory-timeline-list">
                             {todayEvents.slice(-50).map((event) => {
                                 const display = getEventDisplay(event);
                                 const key = event.id || `${event.type}-${event.at}`;
                                 return (
                                     <div key={key} className="victory-event-row">
                                         <div className="victory-event-time">{formatClockTime(event.at)}</div>
                                         <div className="victory-event-emoji">{display.emoji}</div>
                                         <div className="victory-event-text">{display.text}</div>
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                 </div>
             </div>
         </div>
        )}

        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
         <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
             <div className="glass-modal settings-modal" onClick={e => e.stopPropagation()}>
                 <div className="modal-header">
                     <div className="modal-header-center">
                         <button className="modal-back-btn" onClick={() => setIsSettingsOpen(false)}>
                             <ChevronLeft size={24}/>
                         </button>
                         <h3>{t('settings.title')}</h3>
                     </div>
                     <button className="close-btn" onClick={() => setIsSettingsOpen(false)}><X size={20}/></button>
                 </div>
                 
	                  <div className="memo-section">
	                        <label>{t('settings.language')}</label>
	                       <select
	                          value={i18n.language}
	                          onChange={(e) => i18n.changeLanguage(e.target.value)}
	                          className="glass-input"
	                          style={{ width: '100%', marginTop: '8px' }}
	                      >
	                          <option value="en">English</option>
	                          <option value="de">Deutsch</option>
	                          <option value="ko">한국어</option>
	                          <option value="ja">日本語</option>
	                          <option value="zh">中文</option>
	                      </select>
	                  </div>

	                  <div className="memo-section">
	                      <label>{t('settings.account', 'Account')}</label>
	                      {user && !isGuest ? (
	                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
	                          <div className="settings-text-muted" style={{ marginTop: 0 }}>
	                            {t('settings.signedInAs', 'Signed in as')}: {user.email || user.id}
	                          </div>
	                          <div className="settings-text-muted" style={{ marginTop: 0 }}>
	                            {cloudSyncStatus.state === 'saving'
	                              ? 'Cloud: saving…'
	                              : cloudSyncStatus.state === 'loading'
	                                ? 'Cloud: syncing…'
	                              : cloudSyncStatus.state === 'error'
	                                ? `Cloud: ${cloudSyncStatus.lastError || 'Save failed.'}`
	                                : cloudSyncStatus.lastSavedAt
	                                  ? `Cloud: last saved ${new Date(cloudSyncStatus.lastSavedAt).toLocaleTimeString(i18n.language || 'en', { hour: '2-digit', minute: '2-digit' })}`
	                                  : 'Cloud: connected'}
	                          </div>
	                          <button
	                            className="status-option pending settings-btn-secondary"
	                            onClick={handleSyncFromCloud}
	                            disabled={cloudSyncStatus.state === 'loading' || cloudSyncStatus.state === 'saving'}
	                          >
	                            <RotateCcw size={16} /> {t('settings.syncNow', 'Sync now')}
	                          </button>
	                          <button
	                            className="status-option locked settings-btn-secondary"
	                            onClick={() => signOut?.()}
	                          >
	                            <X size={16} /> {t('auth.signOut', 'Sign Out')}
	                          </button>
	                        </div>
	                      ) : (
	                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
	                          <p className="settings-text-muted" style={{ marginTop: 0 }}>
	                            {t('auth.subtitle', 'Sign in to sync across devices')}
	                          </p>
	                          <button
	                            className="status-option pending settings-btn-secondary"
	                            onClick={() => setIsAuthOpen(true)}
	                          >
	                            <Sparkles size={16} /> {t('auth.signIn', 'Sign In')}
	                          </button>
	                        </div>
	                      )}
	                  </div>
	
	                  <div className="memo-section">
	                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
	                          <Sparkles size={14} color="#ff9500" />
	                          {t('ai.apiKey')}
                      </label>
                      <input 
                          type="password"
                          className="glass-input"
                          placeholder={t('ai.apiKeyPlaceholder')}
                          value={aiApiKey}
                          onChange={(e) => {
                              setAiApiKey(e.target.value);
                              setApiKey(e.target.value);
                          }}
                          style={{ width: '100%', marginTop: '8px' }}
                      />
                      <p className="settings-text-muted">
                          {t('ai.apiKeyDesc')} →{' '}
                          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                              aistudio.google.com
                          </a>
                      </p>
                  </div>

                  <div className="memo-section">
                      <label>{t('settings.dataManagement')}</label>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                         <button
                             className="status-option pending settings-btn-secondary"
                             onClick={handleExportData}
                         >
                             <Download size={16}/> {t('settings.backup')}
                         </button>

                         <label
                             className="status-option pending settings-btn-secondary"
                             style={{ cursor: 'pointer', margin: 0 }}
                         >
                             <Upload size={16}/> 
                             {t('settings.restore')}
                             <input 
                                 type="file" 
                                 accept=".json" 
                                 style={{ display: 'none' }} 
                                 onChange={handleImportData}
                             />
                         </label>
                     </div>
                 </div>

                 <div className="memo-section">
                     <label>{t('recipes.title', 'Flow Recipes')}</label>
                     <p className="settings-text-muted" style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                         {t('recipes.desc', 'Save workflows as reusable templates (stored locally).')}
                     </p>

                     {sopLibrary.length === 0 ? (
                         <p className="settings-text-muted" style={{ marginTop: 0 }}>
                             {t('recipes.empty', 'No recipes yet. Right-click a workflow to save one.')}
                         </p>
                     ) : (
                         <div className="recipes-list">
                             {sopLibrary.map((recipe) => (
                                 <div key={recipe.id} className="recipe-row">
                                     <div className="recipe-meta">
                                         <div className="recipe-title">{recipe.title}</div>
                                         <div className="recipe-subtitle">
                                             {(recipe.steps?.length || 0)} {t('recipes.steps', 'steps')}
                                         </div>
                                     </div>
                                     <div className="recipe-actions">
                                         <button
                                             className="status-option pending settings-btn-secondary recipe-btn"
                                             onClick={() => handleCreatePipelineFromRecipe(recipe)}
                                         >
                                             <Plus size={16}/> {t('recipes.use', 'Use')}
                                         </button>
                                         <button
                                             className="status-option locked settings-btn-danger recipe-btn"
                                             onClick={() => {
                                               if (confirm(t('recipes.deleteConfirm', 'Delete this recipe?'))) {
                                                 deleteSopRecipe(recipe.id);
                                               }
                                             }}
                                         >
                                             <Trash2 size={16}/> {t('recipes.delete', 'Delete')}
                                         </button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>

                 <div className="memo-section">
                     <label>{t('history.title', 'History')}</label>
                     <p className="settings-text-muted" style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                         {t('history.desc', 'Used for Victory Wall & pattern insights (stored locally).')}
                     </p>
                     <div className="history-row">
                         <div className="history-count">
                             {t('history.events', 'Events')}: {completionHistory.length}
                         </div>
                         <button
                             className="status-option locked settings-btn-danger"
                             onClick={() => {
                               if (confirm(t('history.clearConfirm', 'Clear all history events?'))) {
                                 clearHistory();
                                 toast.success(t('history.cleared', 'History cleared.'));
                               }
                             }}
                         >
                             <RotateCcw size={16}/> {t('history.clear', 'Clear')}
                         </button>
                     </div>
                 </div>

                 <div className="memo-section">
                     <label>{t('chaos.title', 'Chaos Inbox')}</label>
                     <p className="settings-text-muted" style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                         {t('chaos.desc', 'Unstructured dumps saved here so nothing gets lost (stored locally).')}
                     </p>

                     {chaosInbox.length === 0 ? (
                         <p className="settings-text-muted" style={{ marginTop: 0 }}>
                             {t('chaos.empty', 'No dumps yet. Use the Chaos Dump tab to save one.')}
                         </p>
                     ) : (
                         <>
                             <div className="chaos-inbox-header">
                                 <div className="chaos-inbox-count">
                                     {t('chaos.count', 'Items')}: {chaosInbox.length}
                                 </div>
                                 <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                     <button
                                       className="status-option pending settings-btn-secondary"
                                       onClick={() => {
                                         setIsSettingsOpen(false);
                                         openChaosInbox('settings');
                                       }}
                                     >
                                       <ListTodo size={16}/> {t('chaos.open', 'Open')}
                                     </button>
                                     <button
                                         className="status-option locked settings-btn-danger"
                                         onClick={() => {
                                           if (confirm(t('chaos.clearConfirm', 'Clear all chaos inbox items?'))) {
                                             clearChaosInbox();
                                             toast.success(t('chaos.cleared', 'Chaos inbox cleared.'));
                                           }
                                         }}
                                     >
                                         <RotateCcw size={16}/> {t('chaos.clear', 'Clear')}
                                     </button>
                                 </div>
                             </div>

                             <div className="chaos-inbox-list">
                                 {chaosInbox.slice(0, 20).map((dump) => {
                                   const created = dump?.createdAt ? new Date(dump.createdAt) : null;
                                   const when = created && !Number.isNaN(created.getTime())
                                     ? created.toLocaleString(i18n.language || 'en', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                                     : '';
                                   const snippet = getChaosSnippet(dump?.text || '');
                                   const hasParsed = !!dump?.parsed;

                                   return (
                                     <div key={dump.id} className="chaos-inbox-row">
                                       <div className="chaos-inbox-meta">
                                         <div className="chaos-inbox-when">{when}</div>
                                         <div className="chaos-inbox-snippet">{snippet}</div>
                                         <div className="chaos-inbox-status">
                                           {dump?.status ? String(dump.status) : 'inbox'}{hasParsed ? ' · AI' : ''}
                                         </div>
                                       </div>
                                       <div className="chaos-inbox-actions">
                                         {hasParsed && (
                                           <button
                                             className="status-option pending settings-btn-secondary chaos-inbox-btn"
                                             onClick={() => {
                                               const { workflowsApplied, routinesApplied } = applyChaosParsed(dump.parsed);
                                               updateChaosDump(dump.id, { status: 'applied' });
                                               if (workflowsApplied + routinesApplied > 0) {
                                                 toast.success(t('chaos.applied', 'Applied to your workflows.'));
                                               } else {
                                                 toast.info(t('chaos.alreadyExists', 'Looks like those items already exist.'));
                                               }
                                             }}
                                           >
                                             <Wand2 size={16}/> {t('chaos.apply', 'Apply')}
                                           </button>
                                         )}
                                         <button
                                           className="status-option pending settings-btn-secondary chaos-inbox-btn"
                                           onClick={() => {
                                             navigator.clipboard.writeText(dump?.text || '');
                                             toast.success(t('chaos.copied', 'Copied.'));
                                           }}
                                         >
                                           <Copy size={16}/> {t('chaos.copy', 'Copy')}
                                         </button>
                                         <button
                                           className="status-option locked settings-btn-danger chaos-inbox-btn"
                                           onClick={() => {
                                             if (confirm(t('chaos.deleteConfirm', 'Delete this dump?'))) {
                                               deleteChaosDump(dump.id);
                                             }
                                           }}
                                         >
                                           <Trash2 size={16}/> {t('chaos.delete', 'Delete')}
                                         </button>
                                       </div>
                                     </div>
                                   );
                                 })}
                             </div>
                         </>
                     )}
                 </div>

                 <div className="memo-section">
                     <label>{t('settings.calendar')}</label>
                     <p className="settings-text-muted" style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                         {t('settings.calendarDesc')}
                     </p>
                     <button
                         className="status-option pending settings-btn-secondary"
                          onClick={() => {
                              const calUrl = backendUrl ? `${backendUrl}/api/calendar/feed` : `${window.location.origin}/api/calendar/feed`;
                              navigator.clipboard.writeText(calUrl);
                              toast.success(t('settings.calendarCopied'));
                          }}
                      >
                          <Copy size={16}/> {t('settings.copyCalendarUrl')}
                     </button>
                 </div>

                 <div className="memo-section">
                     <label>{t('settings.reset')}</label>
                     <button
                         className="status-option locked settings-btn-danger"
                         onClick={handleResetData}
                     >
                         <RotateCcw size={16}/> {t('settings.resetAll')}
                     </button>
                 </div>

                 <div className="modal-actions" style={{ marginTop: '24px', borderTop: 'none' }}>
                     <div style={{ flex: 1 }}></div>
                     <button
                         className="settings-btn-done"
                         onClick={() => setIsSettingsOpen(false)}
                     >
                         {t('settings.done')}
                     </button>
                 </div>
             </div>
         </div>
        )}

        {/* STEP EDITOR MODAL */}
        {editingStep && (
            <div className="modal-overlay" onClick={closeEditor}>
                <div className="glass-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                       <div className="modal-header-center">
                           <button className="modal-back-btn" onClick={closeEditor}>
                               <ChevronLeft size={24}/>
                           </button>
                           <h3>{t('step.settings')}</h3>
                       </div>
                       <button className="close-btn" onClick={closeEditor}><X size={20}/></button>
                    </div>
                    
                    <div className="step-preview-large">
                        {editingStep.step.title}
                    </div>
                    
                    <div className="status-grid">
                        <button className="status-option done" onClick={() => saveStepStatus('done')}>
                            <div className="dot done"/> {t('status.done')}
                        </button>
                        <button className="status-option active" onClick={() => saveStepStatus('active')}>
                            <div className="dot active"/> {t('status.active')}
                        </button>
                        <button className="status-option pending" onClick={() => saveStepStatus('pending')}>
                            <div className="dot pending"/> {t('status.pending')}
                        </button>
                        <button className="status-option locked" onClick={() => saveStepStatus('locked')}>
                            <div className="dot locked"/> {t('status.locked')}
                        </button>
                    </div>

                    <div className="memo-section">
                        <label>{t('step.memo')}</label>
                        <textarea 
                            className="glass-textarea"
                            placeholder={t('step.memoPlaceholder')}
                            defaultValue={editingStep.step.description || ''}
                            onBlur={(e) => updateStepDescription(editingStep.pipelineId, editingStep.step.id, e.target.value)}
                        />
                    </div>

                    <div className="modal-actions">
                        <button className="action-btn text" onClick={() => { 
                            const newName = prompt(t('workflow.rename') + ":", editingStep.step.title); 
                            if(newName) { renameStep(editingStep.pipelineId, editingStep.step.id, newName); closeEditor(); } 
                        }}>
                            {t('workflow.rename')}
                        </button>
                        <button className="action-btn danger" onClick={() => { requestDelete('step', editingStep.step.id, editingStep.pipelineId); }}>
                            {t('workflow.delete')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ADD STEP MODAL */}
        {isAddingStep && (
            <div className="modal-overlay" onClick={closeStepModal}>
                <div className="glass-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                       <div className="modal-header-center">
                           <button className="modal-back-btn" onClick={closeStepModal}>
                               <ChevronLeft size={24}/>
                           </button>
                           <h3>{t('step.add')}</h3>
                       </div>
                       <button className="close-btn" onClick={closeStepModal}><X size={20}/></button>
                    </div>
                    
                    <div className="form-group">
                        <label>{t('step.name')}</label>
                        <input 
                          className="glass-input" 
                          placeholder={t('step.namePlaceholder')} 
                          value={newStepTitle}
                          onChange={e => setNewStepTitle(e.target.value)}
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleConfirmAddStep()}
                        />
                    </div>

                    <button className="primary-glass-btn" onClick={handleConfirmAddStep}>
                        {t('step.addButton')}
                    </button>
                </div>
            </div>
        )}

        {/* NEW PIPELINE MODAL */}
        {isAddingPipeline && (
            <div className="modal-overlay" onClick={closePipeModal}>
                <div className="glass-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                       <div className="modal-header-center">
                           <button className="modal-back-btn" onClick={closePipeModal}>
                               <ChevronLeft size={24}/>
                           </button>
                           <h3>{t('workflow.create')}</h3>
                       </div>
                       <button className="close-btn" onClick={closePipeModal}><X size={20}/></button>
                    </div>
                    
                    <div className="form-group">
                        <label>{t('workflow.title')}</label>
                        <input 
                          className="glass-input" 
                          placeholder={t('workflow.titlePlaceholder')} 
                          value={newPipeTitle}
                          onChange={e => setNewPipeTitle(e.target.value)}
                          autoFocus
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>{t('workflow.subtitle')}</label>
                        <input 
                          className="glass-input" 
                          placeholder={t('workflow.subtitlePlaceholder')}
                          value={newPipeSubtitle}
                          onChange={e => setNewPipeSubtitle(e.target.value)}
                        />
                    </div>


                     <div className="form-group">
                        <div className="color-selector">
                            {ALL_COLORS.map(c => (
                                <div 
                                  key={c} 
                                  className={`color-dot-select ${c} ${newPipeColor === c ? 'selected' : ''}`}
                                  onClick={() => setNewPipeColor(c)}
                                />
                            ))}
                            <label className="custom-color-label" title={t('settings.customColor')}>
                                <input 
                                  type="color" 
                                  className="hidden-color-input"
                                  value={(newPipeColor && newPipeColor.startsWith('#')) ? newPipeColor : '#ffffff'}
                                  onChange={(e) => setNewPipeColor(e.target.value)}
                                />
                                <div 
                                  className={`custom-icon ${(newPipeColor && newPipeColor.startsWith('#')) ? 'selected' : ''}`}
                                  style={{ 
                                      background: (newPipeColor && newPipeColor.startsWith('#')) ? newPipeColor : '#f2f2f7',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}
                                >
                                  {!(newPipeColor && newPipeColor.startsWith('#')) && <Palette size={14} color="#1d1d1f"/>}
                                </div>
                            </label>
                        </div>
                    </div>

                    <button className="primary-glass-btn" onClick={handleCreatePipeline}>
                        {t('workflow.create')}
                    </button>
                </div>
            </div>
        )}

         {/* RENAME MODAL */}
         {renamingPipeline && (
             <div className="modal-overlay" onClick={() => setRenamingPipeline(null)}>
                 <div className="glass-modal" onClick={e => e.stopPropagation()}>
                     <div className="modal-header">
                        <div className="modal-header-center">
                            <button className="modal-back-btn" onClick={() => setRenamingPipeline(null)}>
                                <ChevronLeft size={24}/>
                            </button>
                            <h3>{t('workflow.rename')}</h3>
                        </div>
                        <button className="close-btn" onClick={() => setRenamingPipeline(null)}><X size={20}/></button>
                     </div>
                     
                     <div className="form-group">
                         <label>{t('workflow.name')}</label>
                         <input 
                           className="glass-input" 
                           value={renameInput}
                           onChange={e => setRenameInput(e.target.value)}
                           autoFocus
                           onKeyDown={e => e.key === 'Enter' && handleConfirmRename()}
                         />
                     </div>

                     <button className="primary-glass-btn" onClick={handleConfirmRename}>
                         {t('workflow.save')}
                     </button>
                 </div>
             </div>
         )}

        {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-center">
                  <button className="modal-back-btn" onClick={() => setDeleteConfirm(null)}>
                      <ChevronLeft size={24}/>
                  </button>
                  <h3>{t('modal.deleteTitle')}</h3>
              </div>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}><X size={20}/></button>
            </div>
            
            <div className="delete-confirm-body">
              {deleteConfirm.message}
            </div>

            <div className="delete-modal-actions">
              <button
                className="delete-modal-btn-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                {t('modal.cancel')}
              </button>
              <button
                className="delete-modal-btn-delete"
                onClick={confirmDelete}
                autoFocus
              >
                {t('modal.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {aiEnhanceModal.open && (
        <div className="modal-overlay" onClick={() => setAiEnhanceModal({ open: false, pipelineId: null, loading: false, result: null })}>
          <div className="glass-modal ai-enhance-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-center">
                  <button className="modal-back-btn" onClick={() => setAiEnhanceModal({ open: false, pipelineId: null, loading: false, result: null })}>
                      <ChevronLeft size={24}/>
                  </button>
                  <Wand2 size={20} style={{ color: '#ff9500' }} />
                  <h3>{t('ai.enhanceTitle', 'AI Workflow Enhancement')}</h3>
              </div>
              <button className="close-btn" onClick={() => setAiEnhanceModal({ open: false, pipelineId: null, loading: false, result: null })}>
                <X size={20}/>
              </button>
            </div>
            
            {aiEnhanceModal.loading ? (
              <div className="ai-loading-state">
                <div className="ai-loading-spinner"></div>
                <p>{t('ai.analyzing', 'Analyzing your workflow...')}</p>
              </div>
            ) : aiEnhanceModal.result ? (
              <div className="ai-enhance-content">
                <div className="ai-analysis">
                  <Sparkles size={16} style={{ color: '#ff9500' }} />
                  <p>{aiEnhanceModal.result.analysis}</p>
                </div>

                {aiEnhanceModal.result.suggestions?.length > 0 && (
                  <div className="ai-suggestions">
                    <h4>{t('ai.suggestions', 'Suggested Steps')}</h4>
                    {aiEnhanceModal.result.suggestions.map((suggestion, idx) => (
                      <div key={idx} className={`ai-suggestion-item ${suggestion.type}`}>
                        <div className="suggestion-info">
                          <span className="suggestion-type">
                            {suggestion.type === 'insert_before' ? '⬆️ ' : 
                             suggestion.type === 'append' ? '⬇️ ' : '↔️ '}
                            {suggestion.step}
                          </span>
                          <span className="suggestion-reason">{suggestion.reason}</span>
                        </div>
                        <button 
                          className="apply-btn"
                          onClick={() => handleApplySuggestion(suggestion)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {aiEnhanceModal.result.optimizedFlow?.length > 0 && (
                  <div className="ai-optimized-flow">
                    <h4>{t('ai.optimizedFlow', 'Optimized Workflow')}</h4>
                    <div className="optimized-steps">
                      {aiEnhanceModal.result.optimizedFlow.map((step, idx) => (
                        <div key={idx} className="optimized-step">
                          <span className="step-num">{idx + 1}</span>
                          <span className="step-name">{step}</span>
                        </div>
                      ))}
                    </div>
                    <button className="apply-all-btn" onClick={handleApplyAllSuggestions}>
                      <Wand2 size={16} />
                      {t('ai.applyAll', 'Apply Optimized Flow')}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ChaosInboxModal
        isOpen={isChaosInboxOpen}
        onClose={() => setIsChaosInboxOpen(false)}
        chaosInbox={chaosInbox}
        pipelines={pipelines}
        routines={routines}
        trackingUserId={trackingUserId}
        aiEnabled={aiEnabled}
        hostedNeedsLogin={hostedNeedsLogin}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        updateChaosDump={updateChaosDump}
        deleteChaosDump={deleteChaosDump}
        clearChaosInbox={clearChaosInbox}
        applyChaosParsed={applyChaosParsed}
        onFocusPipeline={(pipelineId) => setFocusedPipelineId(pipelineId)}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

    </div>
  );
};

export default AppleCommandCenter;
