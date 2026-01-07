import React from 'react';
import AppleCommandCenter from './components/AppleCommandCenter';
import ToastContainer from './components/Toast';
import KeyboardShortcutsHint from './components/KeyboardShortcuts';
import './App.css'; 

function App() {
  return (
    <div className="app-container">
       <AppleCommandCenter />
       <ToastContainer />
       <KeyboardShortcutsHint />
    </div>
  );
}

export default App;
