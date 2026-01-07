import React, { useState, useEffect } from 'react';
import { X, Command, Keyboard } from 'lucide-react';
import './KeyboardShortcuts.css';

const shortcuts = [
  { keys: ['Cmd/Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Cmd/Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Cmd/Ctrl', 'Y'], description: 'Redo (alt)' },
  { keys: ['Esc'], description: 'Close modal / Exit focus mode' },
];

export const KeyboardShortcutsHint = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button 
        className="shortcuts-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (Cmd+?)"
      >
        <Keyboard size={16} />
      </button>

      {isOpen && (
        <div className="shortcuts-overlay" onClick={() => setIsOpen(false)}>
          <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
            <div className="shortcuts-header">
              <h3>Keyboard Shortcuts</h3>
              <button className="shortcuts-close" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="shortcuts-list">
              {shortcuts.map((shortcut, idx) => (
                <div key={idx} className="shortcut-item">
                  <div className="shortcut-keys">
                    {shortcut.keys.map((key, keyIdx) => (
                      <React.Fragment key={keyIdx}>
                        <kbd>{key}</kbd>
                        {keyIdx < shortcut.keys.length - 1 && <span>+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="shortcut-desc">{shortcut.description}</span>
                </div>
              ))}
            </div>
            <div className="shortcuts-footer">
              <span>Press <kbd>Cmd/Ctrl</kbd> + <kbd>?</kbd> to toggle</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcutsHint;
