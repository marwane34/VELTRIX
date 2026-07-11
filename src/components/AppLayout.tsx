import { ReactNode, useState } from 'react';
import { LayoutDashboard, Cpu, Bell, TrendingUp, Radio, LogOut, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMonitoring } from '../contexts/MonitoringContext';

export type NavItem = 'dashboard' | 'machines' | 'alerts' | 'analytics' | 'communication';

interface AppLayoutProps {
  children: ReactNode;
  activeNav: NavItem;
  onNavigate: (item: NavItem) => void;
  onOpenNotifications: () => void;
}

const NAV_ITEMS: { id: NavItem; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'machines', label: 'Machines', icon: Cpu },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'communication', label: 'Communication', icon: Radio },
];

export function AppLayout({ children, activeNav, onNavigate, onOpenNotifications }: AppLayoutProps) {
  const { signOut } = useAuth();
  const { unreadCount } = useMonitoring();
  const [hovered, setHovered] = useState<NavItem | null>(null);

  return (
    <div className="dashboard-root">
      {/* Top nav strip */}
      <div style={{
        height: 44,
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        background: 'linear-gradient(180deg, #0d1525 0%, #080d14 100%)',
        borderBottom: '1px solid #1e2d45',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: '2px',
            background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            VELTRIX
          </span>
          <span style={{ fontSize: 8, color: '#64748b', letterSpacing: '1px', marginTop: 4 }}>
            SCADA
          </span>
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.id;
            const isHovered = hovered === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  background: active ? '#3b82f615' : 'transparent',
                  border: '1px solid',
                  borderColor: active ? '#3b82f6' : 'transparent',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: active ? '#60a5fa' : isHovered ? '#94a3b8' : '#64748b',
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                <Icon size={13} />
                {item.label}
                {item.id === 'alerts' && unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: '#ef4444', color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side: notifications + logout */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={onOpenNotifications}
            style={{
              position: 'relative',
              width: 30, height: 30,
              background: '#1a2540', border: '1px solid #1e2d45',
              borderRadius: 4, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8',
            }}
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 14, height: 14, borderRadius: 7,
                background: '#ef4444', color: '#fff',
                fontSize: 8, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={signOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              background: '#1a2540', border: '1px solid #1e2d45',
              borderRadius: 4, cursor: 'pointer',
              color: '#94a3b8', fontSize: 11, fontWeight: 600,
            }}
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
