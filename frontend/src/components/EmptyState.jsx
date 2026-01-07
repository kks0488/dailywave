import React from 'react';
import { Plus, Coffee, Wind } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const emptyStateStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px',
  textAlign: 'center',
  color: 'var(--text-secondary)',
  height: '100%',
  width: '100%',
  opacity: 0.8,
};

const iconStyle = {
  marginBottom: '16px',
  opacity: 0.5,
};

const titleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: 'var(--text-primary)',
  marginBottom: '8px',
};

const descStyle = {
  fontSize: '13px',
  maxWidth: '300px',
  marginBottom: '24px',
  lineHeight: '1.5',
};

const buttonStyle = {
  background: 'var(--text-primary)',
  color: 'var(--bg-card)',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '20px',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'transform 0.2s',
};

export const EmptyPipelines = ({ onAction }) => {
  const { t } = useTranslation();
  
  return (
    <div style={emptyStateStyle}>
      <div style={iconStyle}>
        <Wind size={48} strokeWidth={1} />
      </div>
      <h3 style={titleStyle}>{t('empty.pipelinesTitle', 'No Workflows Yet')}</h3>
      <p style={descStyle}>
        {t('empty.pipelinesDesc', 'Create your first workflow to track your daily progress.')}
      </p>
      <button 
        style={buttonStyle} 
        onClick={onAction}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Plus size={16} />
        {t('workflow.create', 'Create Workflow')}
      </button>
    </div>
  );
};

export const EmptyRoutines = ({ type, onAction }) => {
  const { t } = useTranslation();
  const isMorning = type === 'morning';
  
  return (
    <div style={{...emptyStateStyle, padding: '20px', minHeight: '150px'}}>
      <div style={iconStyle}>
        <Coffee size={24} strokeWidth={1.5} />
      </div>
      <p style={{...descStyle, marginBottom: '12px', fontSize: '12px'}}>
        {isMorning 
          ? t('empty.morningDesc', 'No morning routines yet.') 
          : t('empty.afternoonDesc', 'No afternoon routines yet.')}
      </p>
      <button 
        style={{...buttonStyle, padding: '6px 12px', fontSize: '11px'}} 
        onClick={onAction}
      >
        <Plus size={12} />
        {t('common.add', 'Add')}
      </button>
    </div>
  );
};
