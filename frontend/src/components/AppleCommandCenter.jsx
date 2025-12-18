import React, { useState, useEffect } from 'react';
import { useCommandStore } from '../store/useCommandStore';
import {
    Check, Plus, X, Settings, ChevronRight,
    MoreHorizontal, RotateCcw, Box, Briefcase,
    Zap, Link, Archive, Maximize2, Minimize2, Trash2, Palette,
    Download, Upload, Save, Calendar, Copy
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
  // STORE
  const { routines, pipelines, toggleRoutine, addRoutine, deleteRoutine, 
          updateStepStatus, addStep, deleteStep, renameStep, updateStepDescription, addPipeline, deletePipeline, insertStep, reorderSteps, undo, redo, renamePipeline, reorderPipelines, hydrate } = useCommandStore();

  // ONE-TIME IMPORT: No longer handled by frontend. Backend seeds on load.
  React.useEffect(() => {
     // Initial logic moved to Backend storage.py
  }, []);

  // LOCAL UI STATE
  const [editingStep, setEditingStep] = useState(null); // { pipelineId, step }

  // --- PERSISTENCE: LOAD & SAVE ---
  useEffect(() => {
    // 1. Load from Backend
    fetch(`http://${window.location.hostname}:8020/api/persistence/load`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'loaded' && data.data) {
                hydrate(data.data);
                console.log("Loaded state from backend file.");
            }
        })
        .catch(err => console.error("Failed to load persistence:", err));

    // 2. Auto-Save Subscription
    let timeoutId;
    const save = (state) => {
        const payload = { 
            pipelines: state.pipelines, 
            routines: state.routines,
            sopLibrary: state.sopLibrary
        };
        fetch(`http://${window.location.hostname}:8020/api/persistence/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(e => console.error("Save failed", e));
    };

    const unsubscribe = useCommandStore.subscribe((state) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => save(state), 1000); // 1s Debounce
    });

    return () => {
        unsubscribe();
        clearTimeout(timeoutId);
    };
  }, [hydrate]);


  // --- DELETE CONFIRMATION STATE ---
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'pipeline'|'step'|'routine', id, parentId, message }

  const requestDelete = (type, id, parentId = null, message = '') => {
      let msg = message;
      if (!msg) {
          if (type === 'pipeline') msg = '이 워크플로우를 영구적으로 삭제하시겠습니까?';
          if (type === 'step') msg = '이 단계를 삭제하시겠습니까?';
          if (type === 'routine') msg = '이 루틴을 삭제하시겠습니까?';
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
                  alert('데이터가 성공적으로 복원되었습니다.');
                  setIsSettingsOpen(false);
              } else {
                  alert('올바르지 않은 백업 파일입니다.');
              }
          } catch (err) {
              console.error(err);
              alert('파일을 읽는 중 오류가 발생했습니다.');
          }
      };
      reader.readAsText(file);
  };

  const handleResetData = () => {
      if (confirm('정말로 모든 데이터를 초기화하시겠습니까? 초기화 후 페이지를 새로고침하면 기본 워크플로우가 자동으로 복원됩니다.')) {
        hydrate({ pipelines: [], routines: [] });
        setIsSettingsOpen(false);
        alert('데이터가 초기화되었습니다. 새로고침 시 기본 설정이 복구됩니다.');
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
      if(!newPipeTitle.trim()) return alert('제목을 입력해주세요.');
      
      // Smart Fallback: If user didn't pick a color, auto-assign the next one
      const finalColor = newPipeColor || ALL_COLORS[pipelines.length % ALL_COLORS.length];
      
      addPipeline(newPipeTitle, newPipeSubtitle, finalColor, getIconType(newPipeTitle));
      closePipeModal();
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
      const iconMapped = type === 'zap' ? <Zap size={20} /> :
                         type === 'box' ? <Box size={20} /> :
                         type === 'link' ? <Link size={20} /> : <Briefcase size={20} />;
      return iconMapped;
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
                         <div className="badge">Now {currentTime}</div>
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
            <div className="acc-logo">MARKTRADE</div>
            <div className="date-badge">
                {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', weekday: 'short' }).replace(/\//g, '.')}            </div>
         </div>

         {/* Morning Routines */}
         <div className="routine-block">
            <div className="block-header">
              <h3>오전 루틴</h3>
              <button className="add-mini-btn" onClick={() => setAddingRoutineType('morning')}><Plus size={12}/></button>
            </div>
            {renderRoutineList('morning')}
            {addingRoutineType === 'morning' && (
                <div className="add-routine-form">
                    <input type="time" value={newRoutineTime} onChange={e => setNewRoutineTime(e.target.value)} className="mini-input time"/>
                    <input type="text" placeholder="할 일 입력..." value={newRoutineText} onChange={e => setNewRoutineText(e.target.value)} className="mini-input text" autoFocus onKeyDown={e => e.key==='Enter' && handleAddRoutine(e)}/>
                    <button className="confirm-btn" onClick={handleAddRoutine}><Check size={12}/></button>
                </div>
            )}
         </div>

         {/* Afternoon Routines */}
         <div className="routine-block">
            <div className="block-header">
              <h3>오후 루틴</h3>
              <button className="add-mini-btn" onClick={() => setAddingRoutineType('afternoon')}><Plus size={12}/></button>
            </div>
            {renderRoutineList('afternoon')}
            {addingRoutineType === 'afternoon' && (
                <div className="add-routine-form">
                    <input type="time" value={newRoutineTime} onChange={e => setNewRoutineTime(e.target.value)} className="mini-input time"/>
                    <input type="text" placeholder="할 일 입력..." value={newRoutineText} onChange={e => setNewRoutineText(e.target.value)} className="mini-input text" autoFocus onKeyDown={e => e.key==='Enter' && handleAddRoutine(e)}/>
                    <button className="confirm-btn" onClick={handleAddRoutine}><Check size={12}/></button>
                </div>
            )}
         </div>
       </aside>

       {/* 2. MAIN CONTENT */}
       <main className="acc-main">
         <header className="acc-header">
            <div className="header-left">
              <h1>{focusedPipelineId ? '집중 모드' : 'DailyWave'}</h1>
            </div>

            <div className="acc-actions">
               <button className="create-pipe-btn" onClick={openPipeModal}>
                   <Plus size={14}/> 새 워크플로우
               </button>
               <button className="acc-icon-btn" onClick={() => setIsSettingsOpen(true)}><Settings size={18}/></button>
            </div>
         </header>

          <div className="acc-grid">
             {displayPipelines.map((p, index) => {
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
                     <div className="header-text" onDoubleClick={() => startPipelineRename(p.id, p.title)} title="더블클릭하여 이름 변경">
                        <h2>{p.title}</h2>
                        <p>{p.subtitle}</p>
                     </div>

                    <div className="card-actions">
                        <button className="icon-action-btn" onClick={() => handleToggleFocus(p.id)} title={isFocused ? "축소" : "확대 (집중 모드)"}>
                            {isFocused ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
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
            })}
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
                   <Plus size={14}/> 이 위치에 단계 추가 ({Number.isInteger(contextMenu.index) ? contextMenu.index + 1 : '?'}번)
               </button>
           </div>
       )}

       {/* SETTINGS MODAL */}
       {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
                <div className="modal-header">
                    <h3>설정 및 데이터</h3>
                    <button className="close-btn" onClick={() => setIsSettingsOpen(false)}><X size={18}/></button>
                </div>
                
                <div className="memo-section">
                    <label>데이터 관리</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        <button 
                            className="status-option pending" 
                            style={{ justifyContent: 'center', background: '#f5f5f7', color: '#1d1d1f' }}
                            onClick={handleExportData}
                        >
                            <Download size={16}/> 데이터 백업 (다운로드)
                        </button>
                        
                        <label 
                            className="status-option pending" 
                            style={{ justifyContent: 'center', background: '#f5f5f7', color: '#1d1d1f', cursor: 'pointer', margin: 0 }}
                        >
                            <Upload size={16}/> 
                            데이터 복원 (파일 선택)
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
                    <label>캘린더 연동 (애플/구글)</label>
                    <p style={{ fontSize: '11px', color: '#86868b', marginBottom: '8px', lineHeight: '1.4' }}>
                        이 작업 워크플로우를 캘린더 앱에 동기화할 수 있습니다.<br/>
                        아래 URL을 복사하여 캘린더의 [새 구독 캘린더]에 등록하세요.
                    </p>
                    <button 
                        className="status-option pending" 
                        style={{ justifyContent: 'center', background: '#f5f5f7', color: '#1d1d1f' }}
                        onClick={() => {
                            const calUrl = `http://${window.location.hostname}:8020/api/calendar/feed`;
                            navigator.clipboard.writeText(calUrl);
                            alert('캘린더 구독 URL이 복사되었습니다!\n\n1. 애플 캘린더: [파일] -> [새로운 캘린더 구독]\n2. 구글 캘린더: [다른 캘린더 +] -> [URL로 추가]\n위 주소를 붙여넣어 연동하세요.');
                        }}
                    >
                        <Copy size={16}/> 캘린더 구독 URL 복사
                    </button>
                </div>

                <div className="memo-section">
                    <label>초기화</label>
                    <button 
                        className="status-option locked" 
                        style={{ justifyContent: 'center', border: '1px solid #ff3b30', background: '#fff0f0' }}
                        onClick={handleResetData}
                    >
                        <RotateCcw size={16}/> 모든 데이터 초기화
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
                        완료
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
                      <h3>단계 설정</h3>
                      <button className="close-btn" onClick={closeEditor}><X size={18}/></button>
                   </div>
                   
                   <div className="step-preview-large">
                       {editingStep.step.title}
                   </div>
                   
                   <div className="status-grid">
                       <button className="status-option done" onClick={() => saveStepStatus('done')}>
                           <div className="dot done"/> 완료 (Done)
                       </button>
                       <button className="status-option active" onClick={() => saveStepStatus('active')}>
                           <div className="dot active"/> 진행 중 (Active)
                       </button>
                       <button className="status-option pending" onClick={() => saveStepStatus('pending')}>
                           <div className="dot pending"/> 대기 (Pending)
                       </button>
                       <button className="status-option locked" onClick={() => saveStepStatus('locked')}>
                           <div className="dot locked"/> 잠김 (Locked)
                       </button>
                   </div>

                   <div className="memo-section">
                       <label>매뉴얼 / 메모</label>
                       <textarea 
                           className="glass-textarea"
                           placeholder="이 단계에서 수행해야 할 구체적인 업무 내용을 적어주세요."
                           defaultValue={editingStep.step.description || ''}
                           onBlur={(e) => updateStepDescription(editingStep.pipelineId, editingStep.step.id, e.target.value)}
                       />
                   </div>

                   <div className="modal-actions">
                       <button className="action-btn text" onClick={() => { 
                           const newName = prompt("이름 변경:", editingStep.step.title); 
                           if(newName) { renameStep(editingStep.pipelineId, editingStep.step.id, newName); closeEditor(); } 
                       }}>
                           이름 변경
                       </button>
                       <button className="action-btn danger" onClick={() => { requestDelete('step', editingStep.step.id, editingStep.pipelineId); }}>
                           삭제
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
                      <h3>단계 추가</h3>
                      <button className="close-btn" onClick={closeStepModal}><X size={18}/></button>
                   </div>
                   
                   <div className="form-group">
                       <label>단계 이름</label>
                       <input 
                         className="glass-input" 
                         placeholder="예: 디자인 시안 검토" 
                         value={newStepTitle}
                         onChange={e => setNewStepTitle(e.target.value)}
                         autoFocus
                         onKeyDown={e => e.key === 'Enter' && handleConfirmAddStep()}
                       />
                   </div>

                   <button className="primary-glass-btn" onClick={handleConfirmAddStep}>
                       추가하기
                   </button>
               </div>
           </div>
       )}

       {/* NEW PIPELINE MODAL */}
       {isAddingPipeline && (
           <div className="modal-overlay" onClick={closePipeModal}>
               <div className="glass-modal" onClick={e => e.stopPropagation()}>
                   <div className="modal-header">
                      <h3>새 워크플로우 만들기</h3>
                      <button className="close-btn" onClick={closePipeModal}><X size={18}/></button>
                   </div>
                   
                   <div className="form-group">
                       <label>제목</label>
                       <input 
                         className="glass-input" 
                         placeholder="예: 신제품 런칭" 
                         value={newPipeTitle}
                         onChange={e => setNewPipeTitle(e.target.value)}
                         autoFocus
                       />
                   </div>
                   
                   <div className="form-group">
                       <label>부제목</label>
                       <input 
                         className="glass-input" 
                         placeholder="예: 2025 Q1 마케팅"
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
                           <label className="custom-color-label" title="커스텀 색상 선택">
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
                       워크플로우 생성
                   </button>
               </div>
           </div>
       )}

        {/* RENAME MODAL */}
        {renamingPipeline && (
            <div className="modal-overlay" onClick={() => setRenamingPipeline(null)}>
                <div className="glass-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                       <h3>이름 변경</h3>
                       <button className="close-btn" onClick={() => setRenamingPipeline(null)}><X size={18}/></button>
                    </div>
                    
                    <div className="form-group">
                        <label>워크플로우 이름</label>
                        <input 
                          className="glass-input" 
                          value={renameInput}
                          onChange={e => setRenameInput(e.target.value)}
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleConfirmRename()}
                        />
                    </div>

                    <button className="primary-glass-btn" onClick={handleConfirmRename}>
                        저장하기
                    </button>
                </div>
            </div>
        )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>삭제 확인</h3>
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
                취소
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
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AppleCommandCenter;
