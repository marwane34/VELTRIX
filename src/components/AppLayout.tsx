import { ReactNode } from 'react';
import { LayoutDashboard, Cpu, Bell, TrendingUp, Radio, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMonitoring } from '../contexts/MonitoringContext';

export type NavItem = 'dashboard' | 'machines' | 'alerts' | 'analytics' | 'communication';

interface Props {
  children: ReactNode;
  activeNav: NavItem;
  onNavigate: (item: NavItem) => void;
  onOpenNotifications: () => void;
}

const navItems: { key: NavItem; label: string; Icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'machines', label: 'Machines', Icon: Cpu },
  { key: 'alerts', label: 'Alerts', Icon: Bell },
  { key: 'analytics', label: 'Analytics', Icon: TrendingUp },
  { key: 'communication', label: 'Communication', Icon: Radio },
];

/**
 * Top-level application shell with a horizontal top navigation bar. Renders the
 * VELTRIX brand, the five primary nav buttons (with an unread-alert badge on
 * the Alerts item), a notification bell and a logout control.
 */
export function AppLayout({ children, activeNav, onNavigate, onOpenNotifications }: Props) {
  const { signOut } = useAuth();
  const { unreadCount } = useMonitoring();

  return (
    <div className="dashboard-root">
      {/* Top navigation bar */}
      <div
        className="flex items-center justify-between px-3 flex-shrink-0"
        style={{
          height: 44,
          background: 'linear-gradient(180deg,#0d1525 0%,#080d14 100%)',
          borderBottom: '1px solid #1e2d45',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2">
          <img src="/assets/veltrix-logo.svg" alt="VELTRIX" width={24} height={24} />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-slate-100 tracking-wide">VELTRIX</span>
            <span className="text-[8px] text-slate-500 tracking-[2px]">SCADA</span>
          </div>
        </div>

        {/* Nav buttons */}
        <div className="flex items-center gap-1">
          {navItems.map(({ key, label, Icon }) => {
            const active = activeNav === key;
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className="flex items-center gap-1.5 px-3 transition-all"
                style={{
                  height: 30,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                  background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                  border: active ? '1px solid #3b82f6' : '1px solid transparent',
                  color: active ? '#60a5fa' : '#94a3b8',
                }}
              >
                <Icon size={13} />
                <span>{label}</span>
                {key === 'alerts' && unreadCount > 0 && (
                  <span
                    className="flex items-center justify-center text-[9px] font-bold text-white"
                    style={{
                      minWidth: 15,
                      height: 15,
                      padding: '0 4px',
                      background: '#ef4444',
                      border: '1px solid #7f1d1d',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNotifications}
            className="relative flex items-center justify-center toolbar-icon-btn"
            style={{ width: 32, height: 30 }}
            title="Notifications"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span
                className="absolute flex items-center justify-center text-[8px] font-bold text-white"
                style={{
                  top: -4, right: -4,
                  minWidth: 14, height: 14, padding: '0 3px',
                  background: '#ef4444', border: '1px solid #0d1525',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 btn-danger"
            style={{ height: 30 }}
            title="Logout"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
