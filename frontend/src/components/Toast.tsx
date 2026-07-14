import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { CircleCheck as CheckCircle, Circle as XCircle, Info, TriangleAlert as AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastItem { id: number; type: ToastType; message: string; }
interface ToastContextValue {
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  showInfo: (msg: string) => void;
  showWarning: (msg: string) => void;
}
const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const remove = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const add = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);
  const ctx: ToastContextValue = {
    showSuccess: useCallback((msg: string) => add('success', msg), [add]),
    showError: useCallback((msg: string) => add('error', msg), [add]),
    showInfo: useCallback((msg: string) => add('info', msg), [add]),
    showWarning: useCallback((msg: string) => add('warning', msg), [add]),
  };
  const icons = { success: CheckCircle, error: XCircle, info: Info, warning: AlertTriangle };
  const colors: Record<ToastType, string> = { success: 'var(--accent-green)', error: 'var(--accent-red)', info: 'var(--accent-blue)', warning: 'var(--accent-yellow)' };
  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`toast toast-${t.type}`} onClick={() => remove(t.id)}>
              <Icon size={16} color={colors[t.type]} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
