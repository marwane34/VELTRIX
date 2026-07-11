import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CircleCheck as CheckCircle, Circle as XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const COLORS: Record<ToastType, { border: string; icon: string; glow: string }> = {
  success: { border: '#22c55e', icon: '#22c55e', glow: 'rgba(34,197,94,0.25)' },
  error: { border: '#ef4444', icon: '#ef4444', glow: 'rgba(239,68,68,0.25)' },
  info: { border: '#3b82f6', icon: '#3b82f6', glow: 'rgba(59,130,246,0.25)' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 3000);
  }, [remove]);

  const success = useCallback((m: string) => show(m, 'success'), [show]);
  const error = useCallback((m: string) => show(m, 'error'), [show]);
  const info = useCallback((m: string) => show(m, 'info'), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed',
        top: '12px',
        right: '12px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          const c = COLORS[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: '280px',
                maxWidth: '380px',
                padding: '10px 14px',
                background: '#0e1726',
                border: `1px solid ${c.border}`,
                borderRadius: '6px',
                boxShadow: `0 4px 20px ${c.glow}, 0 0 1px ${c.border}`,
                color: '#e2e8f0',
                fontSize: '13px',
                fontWeight: 500,
                pointerEvents: 'auto',
                animation: 'toast-slide-in 0.25s ease-out',
              }}
            >
              <Icon size={18} color={c.icon} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => remove(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
