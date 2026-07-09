import { ReactNode } from 'react';
import { LayoutDashboard, Cpu, Bell, TrendingUp, LogOut, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMonitoring } from '../contexts/MonitoringContext';

type Page = 'dashboard' | 'machines' | 'alerts' | 'analytics';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

const NAV_ITEMS = [
  { id: 'dashboard' as Page, icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'machines' as Page, icon: Cpu, label: 'Machines' },
  { id: 'alerts' as Page, icon: Bell, label: 'Alerts' },
  { id: 'analytics' as Page, icon: TrendingUp, label: 'Analytics' },
];

export function AppLayout({ currentPage, onNavigate, children }: Props) {
  const { signOut } = useAuth();
  const { unreadCount } = useMonitoring();

  return (
    <div className="flex h-screen" style={{ background: '#0b0f1a', overflow: 'hidden' }}>
      {/* Thin vertical nav strip */}
      <div
        className="flex flex-col items-center py-2 gap-1 shrink-0"
        style={{ width: 44, background: '#07090f', borderRight: '1px solid #1e2d45' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center w-8 h-8 mb-2"
          style={{ background: 'linear-gradient(135deg,#0d3060 0%,#061830 100%)', border: '1px solid #1e4080' }}>
          <Activity size={14} className="text-blue-400" />
        </div>

        {/* Nav buttons */}
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={label}
              className="relative w-8 h-8 flex items-center justify-center transition-all"
              style={{
                background: isActive ? 'linear-gradient(180deg,#1a3a6a 0%,#0f2040 100%)' : 'transparent',
                border: `1px solid ${isActive ? '#3b82f6' : 'transparent'}`,
                color: isActive ? '#60a5fa' : '#4a5f7a',
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = '#4a5f7a'; e.currentTarget.style.background = 'transparent'; } }}
            >
              <Icon size={14} />
              {id === 'alerts' && unreadCount > 0 && (
                <span
                  className="absolute top-0 right-0 flex items-center justify-center"
                  style={{ width: 12, height: 12, background: '#ef4444', borderRadius: '50%', fontSize: 7, color: '#fff', fontWeight: 'bold' }}
                >
                  {unreadCount > 9 ? '9' : unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Logout */}
        <button
          onClick={signOut}
          title="Sign Out"
          className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors"
        >
          <LogOut size={13} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
