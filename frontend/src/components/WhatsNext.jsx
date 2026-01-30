import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Pause, RotateCcw, ChevronRight, Zap, BatteryLow, BatteryMedium, Send, MessageCircle, Sun, Trophy, ListTodo } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getWhatsNext, hasApiKey, parseAICommand, getDailySummary, getQuickActions, parseChaosDump } from '../lib/gemini';
import { useToastStore } from '../store/useToastStore';
import { logger } from '../lib/logger';
import './WhatsNext.css';

const getStoredSimpleMode = () => {
  try {
    const raw = globalThis?.localStorage?.getItem('dailywave_simple_mode');
    if (raw === null) return true; // default: simple
    return raw === '1';
  } catch {
    // ignore storage access errors
    return true;
  }
};

const getLocalNext = ({ pipelines, routines, t }) => {
  const safePipelines = Array.isArray(pipelines) ? pipelines : [];
  const safeRoutines = Array.isArray(routines) ? routines : [];

  for (const pipeline of safePipelines) {
    const steps = Array.isArray(pipeline?.steps) ? pipeline.steps : [];
    const active = steps.find((s) => s?.status === 'active');
    const title = active?.title || active?.name;
    if (title) {
      return {
        task: title,
        reason: pipeline?.title
          ? `${t('ai.localReason.active', 'Active step')} · ${pipeline.title}`
          : t('ai.localReason.active', 'Active step'),
      };
    }
  }

  for (const pipeline of safePipelines) {
    const steps = Array.isArray(pipeline?.steps) ? pipeline.steps : [];
    const next =
      steps.find((s) => s?.status === 'pending') || steps.find((s) => s?.status === 'locked');
    const title = next?.title || next?.name;
    if (title) {
      return {
        task: title,
        reason: pipeline?.title
          ? `${t('ai.localReason.next', 'Next step')} · ${pipeline.title}`
          : t('ai.localReason.next', 'Next step'),
      };
    }
  }

  const pendingRoutines = safeRoutines
    .filter((r) => !r?.done)
    .slice()
    .sort((a, b) => String(a?.time || '').localeCompare(String(b?.time || '')));
  const routine = pendingRoutines[0];
  if (routine?.title) {
    const time = routine?.time ? String(routine.time) : '';
    const timeLabel = time ? ` · ${time}` : '';
    return {
      task: routine.title,
      reason: `${t('ai.localReason.routine', 'Next routine')}${timeLabel}`,
    };
  }

  return {
    task: t('ai.localEmptyTask', 'Dump your thoughts, then pick one tiny step.'),
    reason: t('ai.localEmptyReason', 'No active items found'),
  };
};

const WhatsNext = ({
  pipelines,
  routines,
  userId,
  onRecommendationUsed,
  onOpenSettings,
  onAddRoutine,
  onAddStep,
  onAddWorkflow,
  onChaosDumpSaved,
  onChaosDumpUpdated,
  onChaosDumpApply,
}) => {
  const { t } = useTranslation();
  const toast = useToastStore(state => state.addToast);
  const aiEnabled = hasApiKey();
  const [simpleMode, setSimpleMode] = useState(getStoredSimpleMode);
  
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [energy, setEnergy] = useState('medium');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [dailySummary, setDailySummary] = useState(null);
  const [quickActions, setQuickActions] = useState(null);
  const [activeTab, setActiveTab] = useState(() => (hasApiKey() ? 'recommend' : 'chaos'));
  const [trackedRecommendationKey, setTrackedRecommendationKey] = useState(null);
  const timerRef = useRef(null);
  const [chaosText, setChaosText] = useState('');
  const [chaosPreview, setChaosPreview] = useState(null);
  const [chaosDumpId, setChaosDumpId] = useState(null);
  const selectedTab = simpleMode ? 'chaos' : activeTab;
  const localNext = getLocalNext({ pipelines, routines, t });

  useEffect(() => {
    if (!simpleMode) return;
    if (activeTab !== 'chaos') setActiveTab('chaos');
  }, [activeTab, simpleMode]);

  const toggleMode = () => {
    setSimpleMode((prev) => {
      const next = !prev;
      try {
        globalThis?.localStorage?.setItem('dailywave_simple_mode', next ? '1' : '0');
      } catch {
        // ignore storage access errors
      }
      return next;
    });
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    if (!hasApiKey()) {
      toast('warning', t('ai.noApiKey', 'Set up your AI key in settings'));
      onOpenSettings?.();
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await parseAICommand(chatInput, pipelines, routines, userId);
      logger.log('AI command result:', result);
      
      const data = result?.data || {};
      let handled = false;

      if (result.action === 'add_routine' && onAddRoutine) {
        onAddRoutine(data.title, data.time || '09:00');
        toast('success', result.confirmation);
        handled = true;
      } else if (result.action === 'add_workflow_step') {
        if (onAddStep) {
          handled = !!onAddStep(data.title, data.workflow);
        }

        if (!handled && onAddWorkflow && data.workflow) {
          handled = !!onAddWorkflow({ title: data.workflow, steps: [data.title] });
        }

        if (handled) {
          toast('success', result.confirmation);
        } else {
          toast('warning', t('ai.commandFailed', 'Could not apply that command.'));
        }
      } else if (result.action === 'add_workflow') {
        if (onAddWorkflow) {
          handled = !!onAddWorkflow({
            title: data.title,
            subtitle: data.subtitle,
            steps: data.steps
          });
        }

        if (handled) {
          toast('success', result.confirmation);
        } else {
          toast('warning', t('ai.commandFailed', 'Could not apply that command.'));
        }
      } else if (result.action === 'unknown') {
        toast('warning', result.confirmation);
      } else {
        toast('info', result.confirmation);
      }
      setChatInput('');
    } catch (error) {
      toast('error', `AI Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChaosSave = () => {
    const text = chaosText.trim();
    if (!text) {
      toast('warning', t('chaos.noInput', 'Write something first.'));
      return;
    }

    if (chaosDumpId && typeof onChaosDumpUpdated === 'function') {
      onChaosDumpUpdated(chaosDumpId, {
        text,
        parsed: chaosPreview,
        status: chaosPreview ? 'organized' : 'inbox',
      });
      toast('success', t('chaos.saved', 'Saved to Chaos Inbox.'));
      setChaosText('');
      setChaosPreview(null);
      setChaosDumpId(null);
      return;
    }

    if (typeof onChaosDumpSaved === 'function') {
      const savedId = onChaosDumpSaved({
        text,
        parsed: chaosPreview,
        status: chaosPreview ? 'organized' : 'inbox',
      });
      if (!savedId) {
        toast('warning', t('chaos.saveUnavailable', 'Saving is not available right now.'));
        return;
      }
      toast('success', t('chaos.saved', 'Saved to Chaos Inbox.'));
      setChaosText('');
      setChaosPreview(null);
      setChaosDumpId(null);
      return;
    }

    toast('warning', t('chaos.saveUnavailable', 'Saving is not available right now.'));
  };

  const handleChaosOrganize = async () => {
    const text = chaosText.trim();
    if (!text || isLoading) return;
    if (!hasApiKey()) {
      toast('warning', t('ai.noApiKey', 'Set up your AI key in settings'));
      onOpenSettings?.();
      return;
    }

    let dumpId = chaosDumpId;
    if (!dumpId && typeof onChaosDumpSaved === 'function') {
      dumpId = await Promise.resolve(
        onChaosDumpSaved({
          text,
          parsed: null,
          status: 'inbox',
        })
      );
      if (dumpId) setChaosDumpId(dumpId);
    }

    setIsLoading(true);
    try {
      const result = await parseChaosDump(text, pipelines, routines, userId);
      setChaosPreview(result);

      const empty =
        !result?.workflows?.length &&
        !result?.routines?.length &&
        !result?.notes?.length;
      if (empty) {
        toast('info', t('chaos.emptyResult', 'No actionable items found. Saved text will stay in your inbox.'));
        if (dumpId && typeof onChaosDumpUpdated === 'function') {
          onChaosDumpUpdated(dumpId, { status: 'inbox', parsed: null });
        }
      } else if (dumpId && typeof onChaosDumpUpdated === 'function') {
        onChaosDumpUpdated(dumpId, { status: 'organized', parsed: result });
      }
    } catch (error) {
      toast('error', `AI Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChaosApply = async () => {
    const text = chaosText.trim();
    if (!chaosPreview) return;

    const hasTargets =
      (chaosPreview.workflows || []).length > 0 ||
      (chaosPreview.routines || []).length > 0;

    if (!hasTargets) {
      toast('info', t('chaos.nothingToApply', 'Nothing to apply.'));
      return;
    }

    if (typeof onChaosDumpApply !== 'function') {
      toast('warning', t('chaos.applyUnavailable', 'Applying is not available right now.'));
      return;
    }

    const result = await Promise.resolve(onChaosDumpApply({ dumpId: chaosDumpId, text, parsed: chaosPreview }));
    if (result === false) return;

    const workflowsApplied = typeof result?.workflowsApplied === 'number' ? result.workflowsApplied : null;
    const routinesApplied = typeof result?.routinesApplied === 'number' ? result.routinesApplied : null;
    const appliedCount = (workflowsApplied ?? 0) + (routinesApplied ?? 0);

    if (workflowsApplied === null || routinesApplied === null) {
      toast('success', t('chaos.applied', 'Applied to your workflows.'));
    } else if (appliedCount > 0) {
      toast('success', t('chaos.applied', 'Applied to your workflows.'));
    } else {
      toast('info', t('chaos.alreadyExists', 'Looks like those items already exist.'));
    }
    setChaosText('');
    setChaosPreview(null);
    setChaosDumpId(null);
  };

  const fetchDailySummary = async () => {
    if (!hasApiKey()) return;
    setIsLoading(true);
    try {
      const result = await getDailySummary(pipelines, routines, userId);
      setDailySummary(result);
    } catch (error) {
      toast('error', `AI Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuickActions = async () => {
    if (!hasApiKey()) return;
    setIsLoading(true);
    try {
      const result = await getQuickActions(pipelines, routines, energy, userId);
      setQuickActions(result);
    } catch (error) {
      toast('error', `AI Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendation = async () => {
    if (!hasApiKey()) {
      toast('warning', t('ai.noApiKey', 'Set up your AI key in settings to get recommendations'));
      return;
    }

    setIsLoading(true);
    try {
      logger.log('Fetching AI recommendation...');
      const result = await getWhatsNext(pipelines, routines, energy, userId);
      logger.log('AI result:', result);
      if (result) {
        setRecommendation(result);
        setTimeLeft(result.estimatedMinutes * 60);
        setTotalTime(result.estimatedMinutes * 60);
        setTrackedRecommendationKey(null);
      } else {
        toast('warning', 'AI returned empty response. Try again.');
      }
    } catch (error) {
      console.error('AI recommendation failed:', error);
      toast('error', `AI Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!timerRunning) return () => clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          toast('success', t('ai.timeUp', 'Time is up! Great focus session.'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerRunning, toast, t]);

  const toggleTimer = () => {
    const nextRunning = !timerRunning;
    if (
      nextRunning &&
      recommendation &&
      typeof onRecommendationUsed === 'function'
    ) {
      const key = `${recommendation.task}|${recommendation.reason}|${recommendation.estimatedMinutes}`;
      if (trackedRecommendationKey !== key) {
        onRecommendationUsed(recommendation);
        setTrackedRecommendationKey(key);
      }
    }
    setTimerRunning(nextRunning);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimeLeft(totalTime);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const EnergyIcon = energy === 'high' ? Zap : energy === 'low' ? BatteryLow : BatteryMedium;

	  return (
	    <div className={`whats-next-card ${recommendation ? 'has-recommendation' : ''}`}>
	      <div className="whats-next-inner">
	        <div className="whats-next-header">
	          <div className="header-title">
	            <Sparkles size={18} className="sparkle-icon" />
	            <h3>{simpleMode ? t('ai.tabChaos', 'Chaos Dump') : t('ai.whatsNext', "What's Next?")}</h3>
	          </div>
	          
	          <div className="header-actions">
	            {!simpleMode && (
	              <div className="energy-selector">
	                {['low', 'medium', 'high'].map(level => (
	                  <button
	                    key={level}
	                    className={`energy-btn ${energy === level ? 'active' : ''}`}
	                    onClick={() => setEnergy(level)}
	                    disabled={!aiEnabled}
	                    title={t(`ai.energy.${level}`, level)}
	                  >
	                    {level === 'high' ? <Zap size={14} /> : 
	                     level === 'low' ? <BatteryLow size={14} /> : 
	                     <BatteryMedium size={14} />}
	                  </button>
	                ))}
	              </div>
	            )}

	            <button
	              type="button"
	              className="mode-toggle"
	              onClick={toggleMode}
	              aria-label={simpleMode ? t('ai.showMore', 'Show more') : t('ai.showLess', 'Show less')}
	            >
	              {simpleMode ? t('ai.showMore', 'More') : t('ai.showLess', 'Less')}
	            </button>
	          </div>
	        </div>

	        {!simpleMode && (
	        <div className="ai-tabs">
	          <button
	            className={`ai-tab ${selectedTab === 'recommend' ? 'active' : ''}`}
	            onClick={() => setActiveTab('recommend')}
	          >
	            <Sparkles size={16} />
	            <span className="tab-label">{t('ai.tabRecommend', 'What Now?')}</span>
	          </button>
	          <button
	            className={`ai-tab ${selectedTab === 'quick' ? 'active' : ''}`}
	            onClick={() => { setActiveTab('quick'); if (!quickActions) fetchQuickActions(); }}
	          >
	            <Zap size={16} />
	            <span className="tab-label">{t('ai.tabQuick', 'Quick Tasks')}</span>
	          </button>
	          <button
	            className={`ai-tab ${selectedTab === 'summary' ? 'active' : ''}`}
	            onClick={() => { setActiveTab('summary'); if (!dailySummary) fetchDailySummary(); }}
	          >
	            <Trophy size={16} />
	            <span className="tab-label">{t('ai.tabSummary', 'Summary')}</span>
	          </button>
	          <button
	            className={`ai-tab ${selectedTab === 'chaos' ? 'active' : ''}`}
	            onClick={() => setActiveTab('chaos')}
	          >
	            <MessageCircle size={16} />
	            <span className="tab-label">{t('ai.tabChaos', 'Chaos Dump')}</span>
	          </button>
	        </div>
	        )}

	        {selectedTab === 'quick' && (
	          <div className="quick-actions-content">
	            {!aiEnabled ? (
	              <div className="ai-setup-inline">
	                <Sparkles size={20} className="sparkle-icon" />
                <p>{t('ai.setupDesc', 'Connect AI to get personalized task recommendations')}</p>
                <button className="setup-btn" onClick={onOpenSettings}>
                  {t('ai.setupButton', 'Set Up AI')}
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : isLoading ? (
              <div className="loading-state">
                <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
              </div>
            ) : quickActions ? (
              <div className="quick-actions-list">
                {quickActions.map((action, idx) => (
                  <div key={idx} className={`quick-action-item ${action.type}`}>
                    <span className="action-emoji">{action.emoji}</span>
                    <div className="action-details">
                      <span className="action-text">{action.action}</span>
                      <span className="action-duration">{action.duration}min</span>
                    </div>
                  </div>
                ))}
                <button className="refresh-btn small" onClick={fetchQuickActions} disabled={isLoading}>
                  <RotateCcw size={12} />
                  {t('ai.refresh', 'Refresh')}
                </button>
              </div>
            ) : (
              <button className="ask-ai-btn small" onClick={fetchQuickActions} disabled={isLoading}>
                <ListTodo size={16} />
                {t('ai.getQuickActions', 'Get Quick Actions')}
              </button>
            )}
          </div>
        )}

	      {selectedTab === 'summary' && (
	        <div className="daily-summary-content">
	          {!aiEnabled ? (
	            <div className="ai-setup-inline">
	              <Sparkles size={20} className="sparkle-icon" />
              <p>{t('ai.setupDesc', 'Connect AI to get personalized task recommendations')}</p>
              <button className="setup-btn" onClick={onOpenSettings}>
                {t('ai.setupButton', 'Set Up AI')}
                <ChevronRight size={16} />
              </button>
            </div>
          ) : isLoading ? (
            <div className="loading-state">
              <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
          ) : dailySummary ? (
            <div className="summary-display">
              <div className={`mood-badge ${dailySummary.mood}`}>
                {dailySummary.mood === 'great' ? '🎉' : dailySummary.mood === 'good' ? '😊' : dailySummary.mood === 'okay' ? '👍' : '💪'}
              </div>
              <p className="celebration">{dailySummary.celebration}</p>
              <div className="summary-stats">
                <div className="stat completed">
                  <span className="stat-num">{dailySummary.completedCount}</span>
                  <span className="stat-label">{t('ai.completed', 'Done')}</span>
                </div>
                <div className="stat pending">
                  <span className="stat-num">{dailySummary.pendingCount}</span>
                  <span className="stat-label">{t('ai.pending', 'Left')}</span>
                </div>
              </div>
              <div className="tomorrow-tip">
                <Sun size={14} />
                <span>{dailySummary.tomorrowTip}</span>
              </div>
              <button className="refresh-btn small" onClick={fetchDailySummary} disabled={isLoading}>
                <RotateCcw size={12} />
                {t('ai.refresh', 'Refresh')}
              </button>
            </div>
          ) : (
            <button className="ask-ai-btn small" onClick={fetchDailySummary} disabled={isLoading}>
              <Trophy size={16} />
              {t('ai.getDailySummary', 'Get Daily Summary')}
            </button>
          )}
        </div>
      )}

	      {selectedTab === 'recommend' && !aiEnabled ? (
	        <div className="ai-setup-inline">
	          <Sparkles size={20} className="sparkle-icon" />
	          <p>{t('ai.setupDesc', 'Connect AI to get personalized task recommendations')}</p>
	          <button className="setup-btn" onClick={onOpenSettings}>
            {t('ai.setupButton', 'Set Up AI')}
            <ChevronRight size={16} />
          </button>
        </div>
	      ) : selectedTab === 'recommend' && recommendation ? (
	        <div className="recommendation-content">
          <div className="task-display">
            <span className="task-name">{recommendation.task}</span>
            <span className="task-reason">{recommendation.reason}</span>
          </div>

          <div className="timer-section">
            <div className="timer-ring">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" className="timer-bg" />
                <circle 
                  cx="50" cy="50" r="45" 
                  className="timer-progress"
                  style={{ 
                    strokeDasharray: `${progress * 2.83} 283`,
                    stroke: progress > 80 ? '#ff3b30' : progress > 50 ? '#ff9500' : '#34c759'
                  }}
                />
              </svg>
              <div className="timer-display">
                <span className="time">{formatTime(timeLeft)}</span>
                <span className="label">{t('ai.remaining', 'remaining')}</span>
              </div>
            </div>

            <div className="timer-controls">
              <button className="timer-btn primary" onClick={toggleTimer}>
                {timerRunning ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button className="timer-btn" onClick={resetTimer}>
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          <div className="encouragement">
            {recommendation.encouragement}
          </div>

          <button className="refresh-btn" onClick={fetchRecommendation} disabled={isLoading}>
            <Sparkles size={14} />
            {t('ai.nextTask', 'Get Next Task')}
          </button>
        </div>
	      ) : selectedTab === 'recommend' ? (
	        <div className="empty-state">
          <button 
            className="ask-ai-btn" 
            onClick={fetchRecommendation}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
            ) : (
              <>
                <Sparkles size={18} />
                {t('ai.askAI', 'Ask AI: What should I do now?')}
              </>
            )}
          </button>
          <p className="hint">{t('ai.hint', 'AI will analyze your tasks and energy level')}</p>
        </div>
	      ) : null}

	        {selectedTab === 'chaos' && (
	          <div className="chaos-dump-content">
              <div className="simple-next-card">
                <div className="simple-next-title">{t('ai.oneNextStep', 'One clear next step')}</div>
                <div className="simple-next-task">{(recommendation?.task || localNext.task) ?? ''}</div>
                <div className="simple-next-reason">{(recommendation?.reason || localNext.reason) ?? ''}</div>
                {aiEnabled && !recommendation && (
                  <button className="simple-next-btn" onClick={fetchRecommendation} disabled={isLoading}>
                    <Sparkles size={14} />
                    {t('ai.useAISuggestion', 'Get AI suggestion')}
                  </button>
                )}
              </div>

	            <textarea
	              className="chaos-textarea"
	              value={chaosText}
	              onChange={(e) => {
                setChaosText(e.target.value);
                if (chaosDumpId) setChaosDumpId(null);
                if (chaosPreview) setChaosPreview(null);
              }}
              placeholder={t('chaos.placeholder', 'Dump everything here. We will organize it safely.')}
              disabled={isLoading}
              rows={4}
            />

            <div className="chaos-actions">
              <button
                className="chaos-btn secondary"
                onClick={handleChaosSave}
                disabled={isLoading || !chaosText.trim()}
              >
                {t('chaos.save', 'Save to Inbox')}
              </button>
              <button
                className="chaos-btn primary"
                onClick={handleChaosOrganize}
                disabled={isLoading || !chaosText.trim() || !aiEnabled}
                title={!aiEnabled ? t('ai.noApiKey', 'Set up your AI key in settings') : undefined}
              >
                <Sparkles size={16} />
                {t('chaos.organize', 'Organize with AI')}
              </button>
            </div>

            {!aiEnabled && (
              <div className="chaos-locked-hint">
                <p>{t('chaos.aiHint', 'You can save anytime. Connect AI to auto-organize.')}</p>
                <button className="setup-btn" onClick={onOpenSettings}>
                  {t('ai.setupButton', 'Set Up AI')}
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {chaosPreview && (
              <div className="chaos-preview">
                <div className="chaos-preview-header">
                  <div className="chaos-preview-title">{t('chaos.preview', 'Preview')}</div>
                  <button
                    className="chaos-btn primary"
                    onClick={handleChaosApply}
                    disabled={isLoading}
                  >
                    {t('chaos.apply', 'Apply')}
                  </button>
                </div>

                {(chaosPreview.workflows || []).length > 0 && (
                  <div className="chaos-preview-section">
                    <div className="chaos-preview-section-title">{t('chaos.workflows', 'Workflows')}</div>
                    <div className="chaos-preview-list">
                      {chaosPreview.workflows.map((wf, idx) => (
                        <div key={`${wf.title}-${idx}`} className="chaos-preview-item">
                          <div className="chaos-preview-item-title">{wf.title}</div>
                          {wf.subtitle ? (
                            <div className="chaos-preview-item-subtitle">{wf.subtitle}</div>
                          ) : null}
                          {(wf.steps || []).length > 0 && (
                            <div className="chaos-preview-steps">
                              {(wf.steps || []).map((step, sIdx) => (
                                <div key={`${wf.title}-s-${sIdx}`} className="chaos-preview-step">• {step}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(chaosPreview.routines || []).length > 0 && (
                  <div className="chaos-preview-section">
                    <div className="chaos-preview-section-title">{t('chaos.routines', 'Routines')}</div>
                    <div className="chaos-preview-list">
                      {chaosPreview.routines.map((r, idx) => (
                        <div key={`${r.title}-${idx}`} className="chaos-preview-item">
                          <div className="chaos-preview-item-title">{r.title}</div>
                          <div className="chaos-preview-item-subtitle">{r.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(chaosPreview.notes || []).length > 0 && (
                  <div className="chaos-preview-section">
                    <div className="chaos-preview-section-title">{t('chaos.notes', 'Notes')}</div>
                    <div className="chaos-preview-list">
                      {chaosPreview.notes.map((note, idx) => (
                        <div key={`${idx}`} className="chaos-preview-note">• {note}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
	        )}

	        {aiEnabled && !simpleMode && (
	          <div className="ai-chat-section">
	            <form onSubmit={handleChatSubmit} className="chat-form">
	              <input
	                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t('ai.chatPlaceholder', 'AI에게 말하기...')}
                className="chat-input"
                disabled={isLoading}
              />
              <button type="submit" className="chat-send" disabled={isLoading || !chatInput.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsNext;
