import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCommandStore } from '../store/useCommandStore';
import { toast } from '../store/useToastStore';
import ToastContainer from './Toast';
import { PipelineSkeleton, RoutineSkeleton } from './Skeleton';
import { EmptyPipelines } from './EmptyState';
import WhatsNext from './WhatsNext';
import { getApiKey, setApiKey, hasApiKey, enhanceWorkflow } from '../lib/gemini';
import {
    Check, Plus, X, Settings, ChevronRight,
    MoreHorizontal, RotateCcw, Box, Briefcase,
    Zap, Link, Archive, Maximize2, Minimize2, Trash2, Palette,
    Download, Upload, Save, Calendar, Copy, Sun, Moon, Sparkles, Wand2
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
  const backendUrl = import.meta.env.VITE_API_URL || '';

  const {
    pipelines,
    routines,
    addPipeline,
    addRoutine,
    deleteRoutine,
    toggleRoutine,
    deletePipeline,
    deleteStep,
    updateStepStatus,
    addStep,
    insertStep,
    reorderSteps,
    renameStep,
    renamePipeline,
    reorderPipelines,
    updateStepDescription,
    hydrate,
    undo,
    redo
  } = useCommandStore();

  const [isLoading, setIsLoading] = useState(true);
  const [editingStep, setEditingStep] = useState(null);
  const [aiApiKey, setAiApiKey] = useState(getApiKey());

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const nowDate = new Date();
  const weekdayLabel = new Intl.DateTimeFormat(i18n.language || 'en', { weekday: 'short' }).format(nowDate);
  const monthLabel = String(nowDate.getMonth() + 1).padStart(2, '0');
  const dayLabel = String(nowDate.getDate()).padStart(2, '0');
  const sidebarDate = `${weekdayLabel}, ${monthLabel}.${dayLabel}`;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    // 1. Load from Backend (local dev) or localStorage (production)
    if (backendUrl) {
      fetch(`${backendUrl}/api/persistence/load`)
          .then(res => res.json())
          .then(data => {
              if (data.status === 'loaded' && data.data) {
                  hydrate(data.data);
                  console.log("Loaded state from backend file.");
              }
          })
          .catch(() => {
              console.log("Backend not available, using localStorage");
              const saved = localStorage.getItem('dailywave_state');
              if (saved) {
                  try {
                    hydrate(JSON.parse(saved));
                  } catch (e) {
                    console.error('Failed to parse local storage state', e);
                    localStorage.removeItem('dailywave_state');
                  }
              }
          })
          .finally(() => {
              setTimeout(() => setIsLoading(false), 500);
          });
    } else {
      const saved = localStorage.getItem('dailywave_state');
      if (saved) {
          try {
            hydrate(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse local storage state', e);
            localStorage.removeItem('dailywave_state');
          }
      }
      setTimeout(() => setIsLoading(false), 300);
    }

    // 2. Auto-Save Subscription
    let timeoutId;
    const save = (state) => {
        const payload = { 
            pipelines: state.pipelines, 
            routines: state.routines,
            sopLibrary: state.sopLibrary
        };
        localStorage.setItem('dailywave_state', JSON.stringify(payload));
        if (backendUrl) {
          fetch(`${backendUrl}/api/persistence/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          }).catch(() => {});
        }
    };

    const unsubscribe = useCommandStore.subscribe((state) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => save(state), 1000); // 1s Debounce
    });

    return () => {
        unsubscribe();
        clearTimeout(timeoutId);
    };
  }, [backendUrl, hydrate]);


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

  // --- STATE ---
  const [newPipeTitle, setNewPipeTitle] = useState('');
  const [newPipeSubtitle, setNewPipeSubtitle] = useState('');
  const [newPipeColor, setNewPipeColor] = useState('blue');

  // --- CONSTANTS ---
  const ALL_COLORS = ['blue', 'red', 'green', 'purple', 'orange', 'pink', 'cyan', 'teal', 'indigo', 'yellow'];

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, targetId: null, parentId: null });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [aiEnhanceModal, setAiEnhanceModal] = useState({ open: false, pipelineId: null, loading: false, result: null });

  const normalizeAiSteps = (steps) => {
    const rawSteps = Array.isArray(steps) ? steps : typeof steps === 'string' ? [steps] : [];
    return rawSteps.map((step) => (typeof step === 'string' ? step.trim() : '')).filter(Boolean);
  };

  const buildStepsFromTitles = (titles) => {
    const normalized = normalizeAiSteps(titles);
    if (normalized.length === 0) return [];
    const baseId = Date.now();
    return normalized.map((title, index) => ({
      id: `${baseId}-${index + 1}`,
      title,
      status: index === 0 ? 'active' : 'locked'
    }));
  };

  const ensureActiveStep = (pipelineId) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline || !pipeline.steps?.length) return;
    if (pipeline.steps.some(step => step.status === 'active')) return;

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

  const handleAiEnhance = async (pipelineId) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    
    if (!hasApiKey()) {
      toast.warning(t('ai.noApiKey', 'Set up your AI key in settings first'));
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
      const dataStr = JSON.stringify({ pipelines, routines }, null, 2);
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
                  hydrate(parsed);
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
        hydrate({ pipelines: [], routines: [] });
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
      setNewRoutineText('');
      setAddingRoutineType(null);
  };

  const handleCreatePipeline = () => {
      if(!newPipeTitle.trim()) return toast.warning(t('workflow.title'));
      
      // Smart Fallback: If user didn't pick a color, auto-assign the next one
      const finalColor = newPipeColor || ALL_COLORS[pipelines.length % ALL_COLORS.length];
      
      addPipeline(newPipeTitle, newPipeSubtitle, finalColor, getIconType(newPipeTitle));
      closePipeModal();
  };

  const handleAiAddWorkflow = ({ title, subtitle = '', steps = [] }) => {
      const workflowTitle = typeof title === 'string' ? title.trim() : '';
      if (!workflowTitle) return false;

      const workflowSubtitle = typeof subtitle === 'string' ? subtitle.trim() : '';
      const finalColor = ALL_COLORS[pipelines.length % ALL_COLORS.length];
      const stepList = buildStepsFromTitles(steps);
      const finalSteps = stepList.length ? stepList : buildStepsFromTitles(['Start', 'Finish']);

      addPipeline(workflowTitle, workflowSubtitle, finalColor, getIconType(workflowTitle), { steps: finalSteps });
      return true;
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
        updateStepStatus(editingStep.pipelineId, editingStep.step.id, status);
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
      // This is a heuristic. For robust index specific context menus, adding 'Add' buttons between nodes is also valid.
      // But user asked for "Right click intermediate points".
      // Let's rely on finding where the click happened relative to items.
      // Simpler UX: Show context menu "Add Step" and default to end, or try to guess.
      // Let's try to identify if we clicked ON a step (block context menu on step) or BETWEEN.

      // Actually, standardizing: clicking background -> Add at End? Or finding nearest?
      // Let's find the nearest gap.
      // Advanced approach: Get all children elements
      let insertIndex = -1;
      const container = e.currentTarget;
      const children = Array.from(container.querySelectorAll('.acc-step'));

      children.forEach((child, idx) => {
          const childRect = child.getBoundingClientRect();
          const center = childRect.left + childRect.width / 2;
          
          // If click is before center of child[i], insert at i.
          // Let's simplify: find the first child where clickX < center.
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
                <div
                    className={`checkbox-circle ${type==='afternoon'?'evening':''} ${r.done ? 'checked' : ''}`}
                    onClick={() => toggleRoutine(r.id)}
                >
                   {r.done && <Check size={12} strokeWidth={4} />}
                </div>
                 <div className="text-content">
                   <div className="time">{r.time}</div>
                   <div className="title">
                       {r.title && r.title.startsWith && r.title.startsWith(r.time) ? r.title.replace(r.time, '').trim() : r.title}
                   </div>
                </div>
                <button className="del-btn" onClick={() => requestDelete('routine', r.id)}><X size={10}/></button>
             </div>
          );
      });
      return renderedItems;
  };

  return (
    <div className="acc-container" onClick={() => setContextMenu(null)}>

       {/* 1. SIDEBAR */}
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
               <button className="add-mini-btn" onClick={() => setAddingRoutineType('morning')}><Plus size={12}/></button>
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
                     <div className="add-routine-form">
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
               <button className="add-mini-btn" onClick={() => setAddingRoutineType('afternoon')}><Plus size={12}/></button>
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
                     <div className="add-routine-form">
                         <input type="time" value={newRoutineTime} onChange={e => setNewRoutineTime(e.target.value)} className="mini-input time"/>
                         <input type="text" placeholder={t('sidebar.addPlaceholder')} value={newRoutineText} onChange={e => setNewRoutineText(e.target.value)} className="mini-input text" autoFocus onKeyDown={e => e.key==='Enter' && handleAddRoutine(e)}/>
                         <button className="confirm-btn" onClick={handleAddRoutine}><Check size={12}/></button>
                     </div>
                 )}
             </div>
          </div>

          <div className="sidebar-footer">
              <button className="sidebar-settings" onClick={() => setIsSettingsOpen(true)}>
                  <Settings size={14} />
                  {t('sidebar.preferences', 'Preferences')}
              </button>
          </div>
       </aside>

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
                  <button className="acc-icon-btn" onClick={() => setIsSettingsOpen(true)} title={t('settings.title')} aria-label={t('settings.title')}>
                    <Settings size={18}/>
                  </button>
                  <div className="acc-avatar" title="Profile">
                    <span>DW</span>
                  </div>
               </div>
            </header>

            <div className="acc-grid">
{!isLoading && !focusedPipelineId && (
                  <WhatsNext 
                      pipelines={pipelines} 
                      routines={routines} 
                      onOpenSettings={() => setIsSettingsOpen(true)}
                      onAddRoutine={(title, time) => {
                          const hour = parseInt(time.split(':')[0], 10);
                          const type = hour >= 12 ? 'afternoon' : 'morning';
                          addRoutine({ title, time, type });
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
                              return true;
                          }

                          return false;
                      }}
                      onAddWorkflow={(data) => handleAiAddWorkflow(data)}
                  />
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
                      >
                         {getIcon(p.iconType, p.color)}
                      </div>
                      <div className="header-text" onDoubleClick={() => startPipelineRename(p.id, p.title)} title={t('workflow.rename')}>
                         <h2>{p.title}</h2>
                         <p>{p.subtitle}</p>
                      </div>

                     <div className="card-actions">
                         <button className="icon-action-btn" onClick={() => handleToggleFocus(p.id)} title={isFocused ? t('settings.minimize') : t('header.focusMode')}>
                             {isFocused ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                         </button>
                       <button className="icon-action-btn ai-btn" onClick={() => handleAiEnhance(p.id)} title={t('ai.enhance', 'AI Enhance')}>
                             <Wand2 size={16} />
                       </button>
                       <button className="icon-action-btn" onClick={() => handleHeaderAddStep(p.id)}>
                             <Plus size={16} />
                       </button>
                       <button className="icon-action-btn danger" onClick={(e) => handlePipelineDelete(p.id, e)}>
                             <Trash2 size={16} />
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
                <button onClick={handleContextAdd}>
                    <Plus size={14}/> {t('step.addAt')} ({Number.isInteger(contextMenu.index) ? contextMenu.index + 1 : '?'})
                </button>
            </div>
        )}

        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
         <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
             <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
                 <div className="modal-header">
                     <h3>{t('settings.title')}</h3>
                     <button className="close-btn" onClick={() => setIsSettingsOpen(false)}><X size={18}/></button>
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
                          <option value="ko">한국어</option>
                          <option value="ja">日本語</option>
                          <option value="zh">中文</option>
                      </select>
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
                      <p style={{ fontSize: '11px', color: '#86868b', marginTop: '6px' }}>
                          {t('ai.apiKeyDesc')} →{' '}
                          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#0a84ff' }}>
                              aistudio.google.com
                          </a>
                      </p>
                  </div>

                  <div className="memo-section">
                      <label>{t('settings.dataManagement')}</label>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                         <button 
                             className="status-option pending" 
                             style={{ justifyContent: 'center', background: '#f5f5f7', color: '#1d1d1f' }}
                             onClick={handleExportData}
                         >
                             <Download size={16}/> {t('settings.backup')}
                         </button>
                         
                         <label 
                             className="status-option pending" 
                             style={{ justifyContent: 'center', background: '#f5f5f7', color: '#1d1d1f', cursor: 'pointer', margin: 0 }}
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
                     <label>{t('settings.calendar')}</label>
                     <p style={{ fontSize: '11px', color: '#86868b', marginBottom: '8px', lineHeight: '1.4' }}>
                         {t('settings.calendarDesc')}
                     </p>
                     <button 
                         className="status-option pending" 
                         style={{ justifyContent: 'center', background: '#f5f5f7', color: '#1d1d1f' }}
                          onClick={() => {
                              const calUrl = `http://${window.location.hostname}:8030/api/calendar/feed`;
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
                         className="status-option locked" 
                         style={{ justifyContent: 'center', border: '1px solid #ff3b30', background: '#fff0f0' }}
                         onClick={handleResetData}
                     >
                         <RotateCcw size={16}/> {t('settings.resetAll')}
                     </button>
                 </div>

                 <div className="modal-actions" style={{ marginTop: '24px', borderTop: 'none' }}>
                     <div style={{ flex: 1 }}></div>
                     <button 
                         style={{
                             padding: '12px 24px', borderRadius: '16px', border: 'none',
                             background: '#1d1d1f', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer'
                         }}
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
                       <h3>{t('step.settings')}</h3>
                       <button className="close-btn" onClick={closeEditor}><X size={18}/></button>
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
                       <h3>{t('step.add')}</h3>
                       <button className="close-btn" onClick={closeStepModal}><X size={18}/></button>
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
                       <h3>{t('workflow.create')}</h3>
                       <button className="close-btn" onClick={closePipeModal}><X size={18}/></button>
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
                        <h3>{t('workflow.rename')}</h3>
                        <button className="close-btn" onClick={() => setRenamingPipeline(null)}><X size={18}/></button>
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
              <h3>{t('modal.deleteTitle')}</h3>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}><X size={18}/></button>
            </div>
            
            <div className="delete-confirm-body" style={{ margin: '20px 0', fontSize: '15px', color: '#86868b', lineHeight: '1.5' }}>
              {deleteConfirm.message}
            </div>

            <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', borderTop: 'none', padding: 0 }}>
              <button 
                onClick={() => setDeleteConfirm(null)}
                style={{
                    flex: 1, padding: '14px', borderRadius: '16px', border: 'none',
                    background: '#f5f5f7', color: '#1d1d1f', fontWeight: '700', fontSize: '14px', cursor: 'pointer'
                }}
              >
                {t('modal.cancel')}
              </button>
              <button 
                onClick={confirmDelete}
                autoFocus
                style={{ 
                    flex: 1, padding: '14px', borderRadius: '16px', border: 'none',
                    background: '#ff3b30', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)'
                }} 
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wand2 size={20} style={{ color: '#ff9500' }} />
                <h3>{t('ai.enhanceTitle', 'AI Workflow Enhancement')}</h3>
              </div>
              <button className="close-btn" onClick={() => setAiEnhanceModal({ open: false, pipelineId: null, loading: false, result: null })}>
                <X size={18}/>
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

      <ToastContainer />
    </div>
  );
};

export default AppleCommandCenter;
