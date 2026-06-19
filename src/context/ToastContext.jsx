import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Toast from '../components/ui/Toast';
import { friendlyError } from '../utils/userMessages';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const clearToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((payload) => {
    if (!payload) return;
    if (typeof payload === 'string') {
      setToast({ tone: 'success', message: payload });
      return;
    }
    setToast(payload);
  }, []);

  const showSuccess = useCallback(
    (message, title = 'Success') => {
      showToast({ tone: 'success', title, message });
    },
    [showToast],
  );

  const showError = useCallback(
    (err, fallback) => {
      const friendly = friendlyError(err, fallback);
      setToast({
        tone: 'error',
        title: err?.title ?? friendly.title,
        message: friendly.message,
        hint: err?.hint ?? friendly.hint,
      });
    },
    [showToast],
  );

  const value = useMemo(
    () => ({ showToast, showSuccess, showError, clearToast }),
    [showToast, showSuccess, showError, clearToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Toast
          title={toast.title}
          message={toast.message}
          hint={toast.hint}
          tone={toast.tone}
          onDone={clearToast}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      showSuccess: () => {},
      showError: () => {},
      clearToast: () => {},
    };
  }
  return ctx;
}
