import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Pause, RotateCcw, ChevronRight, Zap, BatteryLow, BatteryMedium, Send, MessageCircle, Sun, Trophy, ListTodo } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getWhatsNext, hasApiKey, parseAICommand, getDailySummary, getQuickActions } from '../lib/gemini';
import { useToastStore } from '../store/useToastStore';
import './WhatsNext.css';

const WhatsNext = ({ pipelines, routines, onOpenSettings, onAddRoutine, onAddStep, onAddWorkflow }) => {
  const { t } = useTranslation();
  const toast = useToastStore(state => state.addToast);
  
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [energy, setEnergy] = useState('medium');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatMode, setChatMode] = useState(false);
  const [dailySummary, setDailySummary] = useState(null);
  const [quickActions, setQuickActions] = useState(null);
  const [activeTab, setActiveTab] = useState('recommend');
  const timerRef = useRef(null);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await parseAICommand(chatInput, pipelines, routines);
      console.log('AI command result:', result);
      
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

  const fetchDailySummary = async () => {
    if (!hasApiKey()) return;
    setIsLoading(true);
    try {
      const result = await getDailySummary(pipelines, routines);
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
      const result = await getQuickActions(pipelines, routines, energy);
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
      console.log('Fetching AI recommendation...');
      const result = await getWhatsNext(pipelines, routines, energy);
      console.log('AI result:', result);
      if (result) {
        setRecommendation(result);
        setTimeLeft(result.estimatedMinutes * 60);
        setTotalTime(result.estimatedMinutes * 60);
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
    if (timerRunning && timeLeft > 0) {
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
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const toggleTimer = () => {
    setTimerRunning(!timerRunning);
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

  if (!hasApiKey()) {
    return (
      <div className="whats-next-card setup-prompt">
        <Sparkles size={24} className="sparkle-icon" />
        <h3>{t('ai.setupTitle', "What's Next?")}</h3>
        <p>{t('ai.setupDesc', 'Connect AI to get personalized task recommendations')}</p>
        <button className="setup-btn" onClick={onOpenSettings}>
          {t('ai.setupButton', 'Set Up AI')}
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={`whats-next-card ${recommendation ? 'has-recommendation' : ''}`}>
      <div className="whats-next-header">
        <div className="header-title">
          <Sparkles size={18} className="sparkle-icon" />
          <h3>{t('ai.whatsNext', "What's Next?")}</h3>
        </div>
        
        <div className="energy-selector">
          {['low', 'medium', 'high'].map(level => (
            <button
              key={level}
              className={`energy-btn ${energy === level ? 'active' : ''}`}
              onClick={() => setEnergy(level)}
              title={t(`ai.energy.${level}`, level)}
            >
              {level === 'high' ? <Zap size={14} /> : 
               level === 'low' ? <BatteryLow size={14} /> : 
               <BatteryMedium size={14} />}
            </button>
          ))}
        </div>
      </div>

      <div className="ai-tabs">
        <button 
          className={`ai-tab ${activeTab === 'recommend' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommend')}
        >
          <Sparkles size={14} />
          {t('ai.tabRecommend', 'Recommend')}
        </button>
        <button 
          className={`ai-tab ${activeTab === 'quick' ? 'active' : ''}`}
          onClick={() => { setActiveTab('quick'); if (!quickActions) fetchQuickActions(); }}
        >
          <ListTodo size={14} />
          {t('ai.tabQuick', 'Quick Actions')}
        </button>
        <button 
          className={`ai-tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => { setActiveTab('summary'); if (!dailySummary) fetchDailySummary(); }}
        >
          <Trophy size={14} />
          {t('ai.tabSummary', 'Daily Summary')}
        </button>
      </div>

      {activeTab === 'quick' && (
        <div className="quick-actions-content">
          {isLoading ? (
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

      {activeTab === 'summary' && (
        <div className="daily-summary-content">
          {isLoading ? (
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

      {activeTab === 'recommend' && recommendation ? (
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
      ) : activeTab === 'recommend' ? (
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

      <div className="ai-chat-section">
        <button 
          className={`chat-toggle ${chatMode ? 'active' : ''}`}
          onClick={() => setChatMode(!chatMode)}
        >
          <MessageCircle size={14} />
          {t('ai.chatToggle', 'AI Command')}
        </button>
        
        {chatMode && (
          <form onSubmit={handleChatSubmit} className="chat-form">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t('ai.chatPlaceholder', 'e.g., "Add exercise to routine at 9am"')}
              className="chat-input"
              disabled={isLoading}
            />
            <button type="submit" className="chat-send" disabled={isLoading || !chatInput.trim()}>
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default WhatsNext;
