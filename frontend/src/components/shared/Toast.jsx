import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 5000),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning', 4000),
  }, [addToast]);

  const bgMap = {
    success: '#16a34a',
    error: '#ef4444',
    info: '#2563eb',
    warning: '#eab308',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: bgMap[t.type] || '#16a34a', color: 'white',
            padding: '10px 16px', borderRadius: 8, fontSize: 13,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'slideIn 0.25s ease',
            cursor: 'pointer'
          }} onClick={() => removeToast(t.id)}>
            <span style={{ flex: 1 }}>{t.message}</span>
            <span style={{ fontSize: 14, opacity: 0.7 }}>✕</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
