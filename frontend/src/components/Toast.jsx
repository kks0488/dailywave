import React, { useEffect, useState } from 'react';
import { useToastStore } from '../store/useToastStore';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import './Toast.css';

const icons = {
  success: <CheckCircle size={20} />,
  error: <AlertCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

const ToastItem = ({ id, message, type, removeToast }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(id), 300); // Match CSS animation duration
  };

  return (
    <div className={`toast-item ${type} ${isExiting ? 'exiting' : ''}`} role="alert">
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={handleDismiss}>
        <X size={16} />
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
