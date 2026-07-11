import { type ReactNode } from 'react';
import { LayoutDashboard, Cpu, Bell, TrendingUp, Radio, FileClock, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMonitoring } from '../contexts/MonitoringContext';

export type NavItem = 'dashboard' | 'machines' | 'alerts' | 'analytics' | 'communication' | 'export_history';

interface AppLayoutProps {
  children: ReactNode;
  activeNav: NavItem;
  onNavigate: (item: NavItem) => void;
  onOpenNotifications: () => void;
}

const NAV_ITEMS: { item: NavItem; label: string; icon: typeof LayoutDashboard }[] = [
  { item: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { item: 'machines', label: 'Machines', icon: Cpu },
  { item: 'alerts', label: 'Alerts', icon: Bell },
  { item: 'analytics', label: 'Analytics', icon: TrendingUp },
  { item: 'communication', label: 'Communication', icon: Radio },
  { item: 'export_history', label: 'Export History', icon: FileClock },
];

/**
 * AppLayout — top-level layout with a horizontal top nav bar (44px).
 * Left: VELTRIX logo + title. Center: 6 nav buttons. Right: notifications + logout.
 */
export function AppLayout({ children, activeNav, onNavigate, onOpenNotifications }: AppLayoutProps) {
  const { signOut } = useAuth();
  const { unreadCount } = useMonitoring();

  return (
    <div className="dashboard-root">
      {/* Title bar */}
      <div className="title-bar">
        <span className="title-bar-title">VELTRIX SCADA — Condition Monitoring System</span>
      </div>

      {/* Top navigation bar (44px) */}
      <div className="flex items-center px-3 gap-3" style={{ height: 44, background: 'linear-gradient(180deg,#0d1525 0%,#0b1220 100%)', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
        {/* Left: Logo + title */}
        <div className="flex items-center gap-2" style={{ minWidth: 150 }}>
          <img src="/assets/veltrix-logo.svg" alt="VELTRIX" width={24} height={24} style={{ display: 'block' }} />
          <div className="flex flex-col leading-none">
            <span className="font-bold tracking-wide" style={{ fontSize: 14, color: '#e2e8f0' }}>VELTRIX</span>
            <span className="text-[8px] tracking-[2px] font-semibold" style={{ color: '#3b82f6' }}>SCADA</span>
          </div>
        </div>

        {/* Center: Nav buttons */}
        <div className="flex items-center gap-1 mx-auto">
          {NAV_ITEMS.map(({ item, label, icon: Icon }) => {
            const active = activeNav === item;
            return (
              <button
                key={item}
                onClick={() => onNavigate(item)}
                className="flex items-center gap-1.5 transition-all"
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '0.3px',
                  cursor: 'pointer',
                  background: active ? 'linear-gradient(180deg,#1a3a6e 0%,#0f2547 100%)' : 'transparent',
                  border: active ? '1px solid #3b82f6' : '1px solid transparent',
                  color: active ? '#60a5fa' : '#94a3b8',
                  borderRadius: 3,
                  position: 'relative',
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = '#c8d6ea'; e.currentTarget.style.background = '#111827'; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; } }}
              >
                <Icon size={13} />
                <span>{label}</span>
                {item === 'alerts' && unreadCount > 0 && (
                  <span className="flex items-center justify-center font-bold"
                    style={{
                      minWidth: 15, height: 15, padding: '0 4px', fontSize: 9,
                      color: '#fff', background: '#ef4444', borderRadius: 8, marginLeft: 2,
                    }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Notifications + Logout */}
        <div className="flex items-center gap-2" style={{ minWidth: 150, justifyContent: 'flex-end' }}>
          <button
            onClick={onOpenNotifications}
            className="flex items-center justify-center relative"
            style={{ width: 30, height: 30, background: '#111827', border: '1px solid #1e2d45', borderRadius: 3, cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e2d45'; e.currentTarget.style.color = '#94a3b8'; }}
            title="Notifications"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="flex items-center justify-center font-bold"
                style={{
                  position: 'absolute', top: -4, right: -4, minWidth: 15, height: 15, padding: '0 4px',
                  fontSize: 9, color: '#fff', background: '#ef4444', borderRadius: 8, border: '1px solid #0d1525',
                }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => void signOut()}
            className="btn-danger flex items-center gap-1.5"
            title="Sign out"
          >
            <LogOut size={12} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="main-layout">{children}</div>
    </div>
  );
}
