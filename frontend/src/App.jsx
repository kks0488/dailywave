import React from 'react';
import AppleCommandCenter from './components/AppleCommandCenter';
import ToastContainer from './components/Toast';
import KeyboardShortcutsHint from './components/KeyboardShortcuts';
import AuthCallback from './components/AuthCallback';
import './App.css'; 

function App() {
  if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  return (
    <div className="app-container">
       <AppleCommandCenter />
       <ToastContainer />
       <KeyboardShortcutsHint />
    </div>
  );
}

export default App;
