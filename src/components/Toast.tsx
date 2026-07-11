import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; message: string; type: ToastType; }

const ToastContext = createContext<{ toast: (msg: string, type?: ToastType) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => {
          const Icon = t.type === 'success' ? CheckCircle : t.type === 'error' ? AlertCircle : Info;
          const color = t.type === 'success' ? '#22c55e' : t.type === 'error' ? '#ef4444' : '#3b82f6';
          return (
            <div key={t.id} className="flex items-center gap-2 px-3 py-2" style={{ background: '#0e1726', border: `1px solid ${color}40`, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', animation: 'toast-slide-in 0.3s ease' }}>
              <Icon size={14} style={{ color }} />
              <span className="text-xs text-slate-200">{t.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-slate-500 hover:text-slate-300 ml-2"><X size={12} /></button>
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
