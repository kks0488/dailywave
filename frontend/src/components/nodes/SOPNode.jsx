import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ExternalLink } from 'lucide-react';

const SOPNode = ({ data, selected }) => {
  const borderColor = data.color || 'var(--accent-primary)';
  
  return (
    <div 
      className={`sop-node ${selected ? 'selected' : ''}`}
      style={{
          width: '280px',
          background: 'var(--bg-tertiary)', /* White in light mode */
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          borderLeft: `4px solid ${borderColor}`,
          padding: '0',
          overflow: 'hidden',
          boxShadow: selected ? `0 0 0 2px ${borderColor}` : 'var(--shadow-sm)',
          transition: 'all 0.2s ease'
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#8e8e93' }} />
      
      {/* Header */}
      <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)', // Crisp separator
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-subtle)' // Slight contrast for header
      }}>
        <div style={{
            fontWeight: '600', 
            color: 'var(--text-primary)', 
            fontSize: '13px', 
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            {/* Dot Indicator */}
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: borderColor
            }}/>
            {data.label}
        </div>
        {data.frequency && (
             <span style={{
                 fontSize: '10px', 
                 fontWeight: '500',
                 color: 'var(--text-secondary)',
                 background: 'white',
                 border: '1px solid var(--border-strong)',
                 padding: '2px 6px',
                 borderRadius: '4px'
             }}>
                 {data.frequency}
             </span>
        )}
      </div>

      {/* Body */}
      <div style={{padding: '12px'}}>
         {data.description && (
             <div style={{
                 fontSize: '12px', 
                 color: 'var(--text-secondary)', 
                 marginBottom: '12px',
                 lineHeight: '1.4',
                 whiteSpace: 'pre-line' // Allow newlines
             }}>
                 {data.description}
             </div>
         )}
         
         <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
             {data.link && (
                 <a 
                     href={data.link} 
                     target="_blank" 
                     rel="noreferrer"
                     style={{
                         flex: 1,
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         gap: '6px',
                         padding: '8px',
                         background: 'white',
                         border: '1px solid var(--border-strong)',
                         color: 'var(--text-primary)',
                         borderRadius: '6px',
                         textDecoration: 'none',
                         fontSize: '12px',
                         fontWeight: '500',
                         transition: 'all 0.1s'
                     }}
                     onClick={(e) => e.stopPropagation()} 
                     onMouseEnter={(e) => {
                         e.currentTarget.style.borderColor = 'var(--text-tertiary)';
                         e.currentTarget.style.background = 'var(--bg-subtle)';
                     }}
                     onMouseLeave={(e) => {
                         e.currentTarget.style.borderColor = 'var(--border-strong)';
                         e.currentTarget.style.background = 'white';
                     }}
                 >
                     <ExternalLink size={14} color="var(--text-secondary)" /> 
                     <span style={{color: 'var(--text-primary)'}}>Open Tool</span>
                 </a>
             )}
         </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--text-secondary)' }} />
    </div>
  );
};

export default memo(SOPNode);
