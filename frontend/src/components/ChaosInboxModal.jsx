import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  ChevronLeft,
  Copy,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { parseChaosDump } from '../lib/gemini';
import { toast } from '../store/useToastStore';
import { memoryTracker } from '../lib/memoryTracker';
import './ChaosInboxModal.css';

const normalizeStatus = (value) => String(value || 'inbox').toLowerCase();

const formatWhen = (iso, locale = 'en') => {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date.toISOString();
  }
};

const getSnippet = (text) => {
  const value = typeof text === 'string' ? text.trim() : '';
  if (!value) return '';
  return value.length > 160 ? `${value.slice(0, 160)}…` : value;
};

const hasChaosTargets = (parsed) => {
  const source = typeof parsed === 'object' && parsed !== null ? parsed : null;
  if (!source) return false;
  return (source.workflows || []).length > 0 || (source.routines || []).length > 0;
};

const ChaosInboxModal = ({
  isOpen,
  onClose,
  chaosInbox,
  pipelines,
  routines,
  trackingUserId,
  aiEnabled,
  hostedNeedsLogin,
  onOpenAuth,
  onOpenSettings,
  updateChaosDump,
  deleteChaosDump,
  clearChaosInbox,
  applyChaosParsed,
  onFocusPipeline,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';
  const items = useMemo(() => (Array.isArray(chaosInbox) ? chaosInbox : []), [chaosInbox]);

  const [selectedId, setSelectedId] = useState(null);
  const selectedDump = useMemo(
    () => items.find((dump) => dump?.id === selectedId) || null,
    [items, selectedId]
  );

  const [draftText, setDraftText] = useState('');
  const [draftParsed, setDraftParsed] = useState(null);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [workflowChecks, setWorkflowChecks] = useState([]);
  const [routineChecks, setRoutineChecks] = useState([]);

  const lastOpenedDumpIdRef = useRef('');

  useEffect(() => {
    if (isOpen) return;
    setSelectedId(null);
    setDraftText('');
    setDraftParsed(null);
    setWorkflowChecks([]);
    setRoutineChecks([]);
    lastOpenedDumpIdRef.current = '';
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedDump?.id) return;
    if (lastOpenedDumpIdRef.current === selectedDump.id) return;
    lastOpenedDumpIdRef.current = selectedDump.id;
    memoryTracker.chaosDumpOpened?.(trackingUserId, {
      dumpId: selectedDump.id,
      status: normalizeStatus(selectedDump.status),
      source: 'inbox',
    });
  }, [isOpen, selectedDump?.id, selectedDump?.status, trackingUserId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const clearSelection = () => {
    setSelectedId(null);
    setDraftText('');
    setDraftParsed(null);
    setWorkflowChecks([]);
    setRoutineChecks([]);
    lastOpenedDumpIdRef.current = '';
  };

  const selectDump = (dump) => {
    if (!dump?.id) return;
    setSelectedId(dump.id);

    const text = typeof dump.text === 'string' ? dump.text : '';
    setDraftText(text);

    const parsed = typeof dump.parsed === 'object' && dump.parsed !== null ? dump.parsed : null;
    setDraftParsed(parsed);

    const workflows = Array.isArray(parsed?.workflows) ? parsed.workflows : [];
    setWorkflowChecks(workflows.map(() => true));

    const routineList = Array.isArray(parsed?.routines) ? parsed.routines : [];
    setRoutineChecks(routineList.map(() => true));
  };

  const parsed = draftParsed;
  const parsedWorkflows = Array.isArray(parsed?.workflows) ? parsed.workflows : [];
  const parsedRoutines = Array.isArray(parsed?.routines) ? parsed.routines : [];
  const parsedNotes = Array.isArray(parsed?.notes) ? parsed.notes : [];

  const selectedWorkflows = parsedWorkflows.filter((_, idx) => workflowChecks[idx] ?? true);
  const selectedRoutines = parsedRoutines.filter((_, idx) => routineChecks[idx] ?? true);

  if (!isOpen) return null;

  const openAiSetup = () => {
    if (hostedNeedsLogin) {
      toast.info(t('auth.subtitle', 'Sign in to sync across devices'));
      onOpenAuth?.();
      return;
    }

    toast.warning(t('ai.noApiKey', 'Set up your AI key in settings'));
    onOpenSettings?.();
  };

  const handleCopyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      toast.success(t('chaos.copied', 'Copied.'));
    } catch {
      toast.warning(t('chaos.copyFailed', 'Could not copy.'));
    }
  };

  const handleQuickApply = (dump) => {
    if (!dump?.parsed || !applyChaosParsed) return;
    const source = dump.parsed;
    if (!hasChaosTargets(source)) {
      toast.info(t('chaos.nothingToApply', 'Nothing to apply.'));
      return;
    }

    const result = applyChaosParsed(source);
    const workflowsApplied = Number.isFinite(Number(result?.workflowsApplied)) ? Number(result.workflowsApplied) : 0;
    const routinesApplied = Number.isFinite(Number(result?.routinesApplied)) ? Number(result.routinesApplied) : 0;
    const appliedCount = workflowsApplied + routinesApplied;
    const createdPipelineIds = Array.isArray(result?.createdPipelineIds) ? result.createdPipelineIds : [];

    updateChaosDump?.(dump.id, {
      status: 'applied',
      appliedAt: new Date().toISOString(),
      appliedResult: {
        ...result,
        selectedWorkflows: Array.isArray(source?.workflows) ? source.workflows.length : 0,
        selectedRoutines: Array.isArray(source?.routines) ? source.routines.length : 0,
      },
    });

    if (appliedCount > 0) {
      toast.success(t('chaos.applied', 'Applied to your workflows.'));
      if (createdPipelineIds[0]) onFocusPipeline?.(createdPipelineIds[0]);
      onClose?.();
    } else {
      toast.info(t('chaos.alreadyExists', 'Looks like those items already exist.'));
    }
  };

  const handleSaveText = () => {
    if (!selectedDump?.id) return;
    const nextText = draftText.trim();
    if (!nextText) {
      toast.warning(t('chaos.emptyText', 'Paste something first.'));
      return;
    }

    updateChaosDump?.(selectedDump.id, {
      text: nextText,
      status: 'inbox',
      parsed: null,
      appliedAt: null,
      appliedResult: null,
    });
    setDraftParsed(null);
    setWorkflowChecks([]);
    setRoutineChecks([]);
    toast.success(t('chaos.saved', 'Saved to Chaos Inbox.'));
  };

  const handleOrganize = async () => {
    if (!selectedDump?.id) return;
    const nextText = draftText.trim();
    if (!nextText || isOrganizing) return;
    if (!aiEnabled) return openAiSetup();

    setIsOrganizing(true);
    try {
      const result = await parseChaosDump(nextText, pipelines, routines, trackingUserId);
      const empty =
        !result?.workflows?.length &&
        !result?.routines?.length &&
        !result?.notes?.length;

      if (empty) {
        updateChaosDump?.(selectedDump.id, { status: 'inbox', parsed: null, text: nextText });
        setDraftParsed(null);
        setWorkflowChecks([]);
        setRoutineChecks([]);
        toast.info(t('chaos.emptyResult', 'No actionable items found. Saved text will stay in your inbox.'));
        return;
      }

      updateChaosDump?.(selectedDump.id, { status: 'organized', parsed: result, text: nextText });
      setDraftParsed(result);
      const workflows = Array.isArray(result?.workflows) ? result.workflows : [];
      const routineList = Array.isArray(result?.routines) ? result.routines : [];
      setWorkflowChecks(workflows.map(() => true));
      setRoutineChecks(routineList.map(() => true));
      toast.success(t('chaos.organized', 'Organized with AI.'));
    } catch (error) {
      toast.error(`AI Error: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleApplySelected = () => {
    if (!selectedDump?.id) return;
    if (!parsed || !applyChaosParsed) return;

    const subset = {
      ...parsed,
      workflows: selectedWorkflows,
      routines: selectedRoutines,
    };

    if (!hasChaosTargets(subset)) {
      toast.info(t('chaos.nothingToApply', 'Nothing to apply.'));
      return;
    }

    const totalWorkflows = parsedWorkflows.length;
    const totalRoutines = parsedRoutines.length;
    const partial =
      (totalWorkflows > 0 && selectedWorkflows.length < totalWorkflows) ||
      (totalRoutines > 0 && selectedRoutines.length < totalRoutines);

    if (partial) {
      memoryTracker.chaosApplyPartial?.(trackingUserId, {
        dumpId: selectedDump.id,
        selectedWorkflows: selectedWorkflows.length,
        selectedRoutines: selectedRoutines.length,
      });
    }

    const result = applyChaosParsed(subset);
    const workflowsApplied = Number.isFinite(Number(result?.workflowsApplied)) ? Number(result.workflowsApplied) : 0;
    const routinesApplied = Number.isFinite(Number(result?.routinesApplied)) ? Number(result.routinesApplied) : 0;
    const appliedCount = workflowsApplied + routinesApplied;
    const createdPipelineIds = Array.isArray(result?.createdPipelineIds) ? result.createdPipelineIds : [];

    updateChaosDump?.(selectedDump.id, {
      status: 'applied',
      parsed,
      appliedAt: new Date().toISOString(),
      appliedResult: {
        ...result,
        selectedWorkflows: selectedWorkflows.length,
        selectedRoutines: selectedRoutines.length,
      },
    });

    if (appliedCount > 0) {
      toast.success(t('chaos.applied', 'Applied to your workflows.'));
      if (createdPipelineIds[0]) onFocusPipeline?.(createdPipelineIds[0]);
      onClose?.();
    } else {
      toast.info(t('chaos.alreadyExists', 'Looks like those items already exist.'));
    }
  };

  const handleDelete = (dumpId) => {
    if (!dumpId) return;
    if (!confirm(t('chaos.deleteConfirm', 'Delete this dump?'))) return;
    deleteChaosDump?.(dumpId);
    if (selectedId === dumpId) clearSelection();
  };

  const renderStatusPill = (dump) => {
    const status = normalizeStatus(dump?.status);
    const hasParsed = !!dump?.parsed;
    const mergedCount = Number.isFinite(Number(dump?.mergedCount)) ? Number(dump.mergedCount) : 1;

    const label =
      status === 'applied'
        ? t('chaos.statusApplied', 'Applied')
        : status === 'organized'
          ? t('chaos.statusOrganized', 'Organized')
          : t('chaos.statusInbox', 'Inbox');

    return (
      <div className="chaos-row-pills">
        <span className={`chaos-pill chaos-pill-${status}`}>{label}</span>
        {hasParsed && status !== 'organized' && status !== 'applied' ? (
          <span className="chaos-pill chaos-pill-ai">{t('chaos.ai', 'AI')}</span>
        ) : null}
        {mergedCount > 1 ? <span className="chaos-pill chaos-pill-merge">×{mergedCount}</span> : null}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-modal chaos-inbox-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-center">
            {selectedId ? (
              <button className="modal-back-btn" onClick={clearSelection} aria-label={t('modal.back', 'Back')}>
                <ChevronLeft size={24} />
              </button>
            ) : null}
            <h3>{t('chaos.title', 'Chaos Inbox')}</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label={t('modal.close', 'Close')}>
            <X size={20} />
          </button>
        </div>

        {!selectedId ? (
          <>
            <div className="chaos-modal-toolbar">
              <div className="chaos-modal-count">
                {t('chaos.count', 'Items')}: {items.length}
              </div>
              <button
                className="status-option locked settings-btn-danger"
                onClick={() => {
                  if (!items.length) return;
                  if (!confirm(t('chaos.clearConfirm', 'Clear all chaos inbox items?'))) return;
                  clearChaosInbox?.();
                  toast.success(t('chaos.cleared', 'Chaos inbox cleared.'));
                }}
                disabled={!items.length}
              >
                <RotateCcw size={16} /> {t('chaos.clear', 'Clear')}
              </button>
            </div>

            {items.length === 0 ? (
              <p className="settings-text-muted" style={{ marginTop: 0 }}>
                {t('chaos.empty', 'No dumps yet. Use the Chaos Dump tab to save one.')}
              </p>
            ) : (
              <div className="chaos-modal-list">
                {items.map((dump) => {
                  const when = formatWhen(dump?.updatedAt || dump?.createdAt, locale);
                  const snippet = getSnippet(dump?.text || '');
                  const hasParsed = !!dump?.parsed;
                  const status = normalizeStatus(dump?.status);

                  return (
                    <div
                      key={dump.id}
                      className={`chaos-modal-row ${status === 'applied' ? 'is-applied' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectDump(dump)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') selectDump(dump);
                      }}
                    >
                      <div className="chaos-modal-row-main">
                        <div className="chaos-row-top">
                          <div className="chaos-row-when">{when}</div>
                          {renderStatusPill(dump)}
                        </div>
                        <div className="chaos-row-snippet">{snippet}</div>
                      </div>

                      <div className="chaos-modal-row-actions" onClick={(e) => e.stopPropagation()}>
                        {hasParsed && status !== 'applied' ? (
                          <button
                            className="status-option pending settings-btn-secondary chaos-row-action"
                            onClick={() => handleQuickApply(dump)}
                          >
                            <Wand2 size={16} /> {t('chaos.apply', 'Apply')}
                          </button>
                        ) : null}
                        <button
                          className="status-option pending settings-btn-secondary chaos-row-action"
                          onClick={() => handleCopyText(dump?.text || '')}
                        >
                          <Copy size={16} /> {t('chaos.copy', 'Copy')}
                        </button>
                        <button
                          className="status-option locked settings-btn-danger chaos-row-action"
                          onClick={() => handleDelete(dump.id)}
                        >
                          <Trash2 size={16} /> {t('chaos.delete', 'Delete')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : selectedDump ? (
          <>
            <div className="chaos-detail-meta">
              <div className="chaos-detail-when">
                {t('chaos.updated', 'Updated')}: {formatWhen(selectedDump?.updatedAt || selectedDump?.createdAt, locale)}
              </div>
              {renderStatusPill(selectedDump)}
            </div>

            <div className="chaos-detail-editor">
              <textarea
                className="glass-textarea chaos-detail-textarea"
                value={draftText}
                onChange={(e) => {
                  setDraftText(e.target.value);
                  if (draftParsed) {
                    setDraftParsed(null);
                    setWorkflowChecks([]);
                    setRoutineChecks([]);
                  }
                }}
                placeholder={t('chaos.placeholder', 'Dump anything here…')}
              />

              <div className="chaos-detail-actions">
                <button
                  className="status-option pending settings-btn-secondary chaos-detail-action"
                  onClick={handleSaveText}
                  disabled={!draftText.trim()}
                >
                  <Save size={16} /> {t('workflow.save', 'Save')}
                </button>
                <button
                  className="status-option pending settings-btn-secondary chaos-detail-action"
                  onClick={handleOrganize}
                  disabled={!draftText.trim() || isOrganizing}
                  title={!aiEnabled ? t('ai.noApiKey', 'Set up your AI key in settings') : ''}
                >
                  <Sparkles size={16} /> {isOrganizing ? t('ai.analyzing', 'Analyzing your workflow...') : t('chaos.organize', 'Organize with AI')}
                </button>
                <button
                  className="status-option pending settings-btn-secondary chaos-detail-action"
                  onClick={() => handleCopyText(draftText)}
                  disabled={!draftText.trim()}
                >
                  <Copy size={16} /> {t('chaos.copy', 'Copy')}
                </button>
                <button
                  className="status-option locked settings-btn-danger chaos-detail-action"
                  onClick={() => handleDelete(selectedDump.id)}
                >
                  <Trash2 size={16} /> {t('chaos.delete', 'Delete')}
                </button>
              </div>
            </div>

            {parsed ? (
              <div className="chaos-preview">
                <div className="chaos-preview-section">
                  <div className="chaos-preview-header">
                    <div className="chaos-preview-title">
                      {t('chaos.workflows', 'Workflows')} · {parsedWorkflows.length}
                    </div>
                    <div className="chaos-preview-toggles">
                      <button
                        className="status-option pending settings-btn-secondary chaos-preview-toggle"
                        onClick={() => setWorkflowChecks(parsedWorkflows.map(() => true))}
                        disabled={!parsedWorkflows.length}
                      >
                        {t('chaos.selectAll', 'All')}
                      </button>
                      <button
                        className="status-option pending settings-btn-secondary chaos-preview-toggle"
                        onClick={() => setWorkflowChecks(parsedWorkflows.map(() => false))}
                        disabled={!parsedWorkflows.length}
                      >
                        {t('chaos.selectNone', 'None')}
                      </button>
                    </div>
                  </div>

                  {parsedWorkflows.length === 0 ? (
                    <div className="settings-text-muted">{t('chaos.noWorkflows', 'No workflows found.')}</div>
                  ) : (
                    <div className="chaos-preview-list">
                      {parsedWorkflows.map((wf, idx) => {
                        const checked = workflowChecks[idx] ?? true;
                        const title = typeof wf?.title === 'string' ? wf.title : '';
                        const subtitle = typeof wf?.subtitle === 'string' ? wf.subtitle : '';
                        const steps = Array.isArray(wf?.steps) ? wf.steps : [];
                        return (
                          <div key={`${title}:${idx}`} className={`chaos-preview-item ${checked ? 'is-checked' : ''}`}>
                            <button
                              className="chaos-preview-check"
                              onClick={() =>
                                setWorkflowChecks((prev) => prev.map((v, i) => (i === idx ? !v : v)))
                              }
                              aria-label={checked ? t('chaos.unselect', 'Unselect') : t('chaos.select', 'Select')}
                              aria-pressed={checked}
                            >
                              {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                            <div className="chaos-preview-main">
                              <div className="chaos-preview-item-title">{title || t('workflow.untitled', 'Untitled')}</div>
                              {subtitle ? <div className="chaos-preview-item-sub">{subtitle}</div> : null}
                              {steps.length ? (
                                <div className="chaos-preview-item-sub">
                                  {t('recipes.steps', 'steps')}: {steps.length}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="chaos-preview-section">
                  <div className="chaos-preview-header">
                    <div className="chaos-preview-title">
                      {t('chaos.routines', 'Routines')} · {parsedRoutines.length}
                    </div>
                    <div className="chaos-preview-toggles">
                      <button
                        className="status-option pending settings-btn-secondary chaos-preview-toggle"
                        onClick={() => setRoutineChecks(parsedRoutines.map(() => true))}
                        disabled={!parsedRoutines.length}
                      >
                        {t('chaos.selectAll', 'All')}
                      </button>
                      <button
                        className="status-option pending settings-btn-secondary chaos-preview-toggle"
                        onClick={() => setRoutineChecks(parsedRoutines.map(() => false))}
                        disabled={!parsedRoutines.length}
                      >
                        {t('chaos.selectNone', 'None')}
                      </button>
                    </div>
                  </div>

                  {parsedRoutines.length === 0 ? (
                    <div className="settings-text-muted">{t('chaos.noRoutines', 'No routines found.')}</div>
                  ) : (
                    <div className="chaos-preview-list">
                      {parsedRoutines.map((routine, idx) => {
                        const checked = routineChecks[idx] ?? true;
                        const title = typeof routine?.title === 'string' ? routine.title : '';
                        const time = typeof routine?.time === 'string' ? routine.time : '';
                        return (
                          <div key={`${title}:${time}:${idx}`} className={`chaos-preview-item ${checked ? 'is-checked' : ''}`}>
                            <button
                              className="chaos-preview-check"
                              onClick={() =>
                                setRoutineChecks((prev) => prev.map((v, i) => (i === idx ? !v : v)))
                              }
                              aria-label={checked ? t('chaos.unselect', 'Unselect') : t('chaos.select', 'Select')}
                              aria-pressed={checked}
                            >
                              {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                            <div className="chaos-preview-main">
                              <div className="chaos-preview-item-title">
                                {title || t('routine.untitled', 'Untitled')}
                              </div>
                              <div className="chaos-preview-item-sub">{time ? `${t('routine.time', 'Time')}: ${time}` : ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {parsedNotes.length ? (
                  <div className="chaos-preview-section">
                    <div className="chaos-preview-header">
                      <div className="chaos-preview-title">
                        {t('chaos.notes', 'Notes')} · {parsedNotes.length}
                      </div>
                    </div>
                    <ul className="chaos-notes">
                      {parsedNotes.map((note, idx) => (
                        <li key={`${idx}:${String(note).slice(0, 10)}`}>{String(note)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <button
                  className="primary-glass-btn"
                  onClick={handleApplySelected}
                  disabled={!hasChaosTargets(parsed) || (!selectedWorkflows.length && !selectedRoutines.length)}
                >
                  {t('chaos.applySelected', 'Apply selected')} ·{' '}
                  {t('chaos.applyCounts', '{{w}} workflows, {{r}} routines', {
                    w: selectedWorkflows.length,
                    r: selectedRoutines.length,
                  })}
                </button>
              </div>
            ) : (
              <div className="chaos-preview-empty">
                <div className="settings-text-muted">
                  {aiEnabled
                    ? t('chaos.organizeHint', 'Run “Organize with AI” to preview workflows & routines.')
                    : t('chaos.organizeHintNoAi', 'Add an AI key in settings (or sign in) to organize this dump.')}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="settings-text-muted">{t('chaos.notFound', 'This dump no longer exists.')}</p>
        )}
      </div>
    </div>
  );
};

export default ChaosInboxModal;
