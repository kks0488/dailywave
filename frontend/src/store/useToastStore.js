import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export const toast = {
  success: (msg, duration) => useToastStore.getState().addToast(msg, 'success', duration),
  error: (msg, duration) => useToastStore.getState().addToast(msg, 'error', duration),
  warning: (msg, duration) => useToastStore.getState().addToast(msg, 'warning', duration),
  info: (msg, duration) => useToastStore.getState().addToast(msg, 'info', duration),
};
