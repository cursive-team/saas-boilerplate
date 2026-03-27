'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              animate-in slide-in-from-right fade-in duration-200
              rounded-lg px-4 py-3 text-sm font-medium shadow-lg
              ${t.type === 'error' ? 'bg-red-600 text-white' : ''}
              ${t.type === 'success' ? 'bg-green-600 text-white' : ''}
              ${t.type === 'info' ? 'bg-gray-800 text-white' : ''}
            `}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
