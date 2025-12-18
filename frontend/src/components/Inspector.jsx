import React from 'react';
import { useWorkflowStore } from '../store/useWorkflowStore';

export default function Inspector() {
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <aside className="inspector">
        <div className="section-title" style={{marginBottom: '16px'}}>Properties</div>
        <div style={{color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic'}}>
            Select a node to configure properties.
        </div>
      </aside>
    );
  }

  const handleChange = (e) => {
      updateNodeData(selectedNode.id, { [e.target.name]: e.target.value });
  };

  return (
    <aside className="inspector">
      <div className="section-title" style={{marginBottom: '16px'}}>Properties</div>
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
        
        {/* Label */}
        <div>
            <label style={{display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)'}}>
                Task Name
            </label>
            <input 
                type="text"
                name="label" 
                value={selectedNode.data.label} 
                onChange={handleChange}
                className="inspector-input"
                style={{
                    width: '100%', 
                    padding: '8px', 
                    background: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)',
                    borderRadius: '4px'
                }}
            />
        </div>

        {/* Frequency */}
        <div>
            <label style={{display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)'}}>
                Frequency
            </label>
            <select
                name="frequency"
                value={selectedNode.data.frequency || 'Daily'}
                onChange={handleChange}
                style={{
                    width: '100%', 
                    padding: '8px', 
                    background: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)',
                    borderRadius: '4px'
                }}
            >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Ad-hoc">Ad-hoc (When needed)</option>
            </select>
        </div>

        {/* Description */}
        <div>
            <label style={{display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)'}}>
                Instructions (SOP)
            </label>
            <textarea 
                name="description" 
                value={selectedNode.data.description || ''} 
                onChange={handleChange}
                rows={5}
                style={{
                    width: '100%', 
                    padding: '8px', 
                    background: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                }}
            />
        </div>

        {/* Tool Link */}
        <div>
            <label style={{display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)'}}>
                Tool URL
            </label>
            <input 
                type="text"
                name="link" 
                placeholder="http://localhost:XXXX"
                value={selectedNode.data.link || ''} 
                onChange={handleChange}
                style={{
                    width: '100%', 
                    padding: '8px', 
                    background: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)',
                    borderRadius: '4px'
                }}
            />
            <div style={{fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px'}}>
                Example: http://localhost:8500
            </div>
        </div>

      </div>
    </aside>
  );
}
