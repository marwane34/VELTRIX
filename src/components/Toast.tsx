import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setItems((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle size={14} className="text-green-400 shrink-0" />,
    error: <XCircle size={14} className="text-red-400 shrink-0" />,
    warning: <AlertTriangle size={14} className="text-yellow-400 shrink-0" />,
    info: <Info size={14} className="text-blue-400 shrink-0" />,
  };

  const colors: Record<ToastType, string> = {
    success: '#14532d',
    error: '#7f1d1d',
    warning: '#854d0e',
    info: '#1e3a5f',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2" style={{ pointerEvents: 'none' }}>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 px-3 py-2.5 shadow-lg"
            style={{
              background: '#0e1726',
              border: `1px solid ${colors[item.type]}`,
              borderLeft: `3px solid ${colors[item.type]}`,
              pointerEvents: 'auto',
              animation: 'toast-slide-in 0.2s ease-out',
              minWidth: 240,
              maxWidth: 360,
            }}
          >
            {icons[item.type]}
            <span className="text-xs text-slate-200 flex-1">{item.message}</span>
            <button onClick={() => dismiss(item.id)} className="text-slate-600 hover:text-slate-400 shrink-0">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
