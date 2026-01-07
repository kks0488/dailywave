import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Pause, RotateCcw, ChevronRight, Zap, Battery, BatteryLow, BatteryMedium } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getWhatsNext, hasApiKey } from '../lib/gemini';
import { useToastStore } from '../store/useToastStore';
import './WhatsNext.css';

const WhatsNext = ({ pipelines, routines, onOpenSettings }) => {
  const { t } = useTranslation();
  const toast = useToastStore(state => state.addToast);
  
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [energy, setEnergy] = useState('medium');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef(null);

  const fetchRecommendation = async () => {
    if (!hasApiKey()) {
      toast('warning', t('ai.noApiKey', 'Set up your AI key in settings to get recommendations'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await getWhatsNext(pipelines, routines, energy);
      if (result) {
        setRecommendation(result);
        setTimeLeft(result.estimatedMinutes * 60);
        setTotalTime(result.estimatedMinutes * 60);
      }
    } catch (error) {
      console.error('AI recommendation failed:', error);
      toast('error', t('ai.error', 'Failed to get AI recommendation'));
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

      {recommendation ? (
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
      ) : (
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
      )}
    </div>
  );
};

export default WhatsNext;
