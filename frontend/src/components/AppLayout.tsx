import type { ReactNode } from 'react';
import { TitleBar } from './TitleBar';
import type { NavItem } from '../types';
export type { NavItem };
interface AppLayoutProps { children: ReactNode; activeNav: NavItem; onNavigate: (nav: NavItem) => void; onOpenNotifications: () => void; }
const navItems: { id: NavItem; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' }, { id: 'machines', label: 'Machines' }, { id: 'alerts', label: 'Alerts' }, { id: 'analytics', label: 'Analytics' }, { id: 'communication', label: 'Communication' }, { id: 'export_history', label: 'Export History' },
];
export { navItems };
export function AppLayout({ children, activeNav, onNavigate }: AppLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TitleBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 200, flexShrink: 0, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-primary)' }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Navigation</span>
          </div>
          <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => onNavigate(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: activeNav === item.id ? 'var(--bg-elevated)' : 'transparent', color: activeNav === item.id ? 'var(--accent-blue-light)' : 'var(--text-secondary)', transition: 'all 0.15s', textAlign: 'left', width: '100%' }} onMouseEnter={(e) => { if (activeNav !== item.id) e.currentTarget.style.background = 'var(--bg-panel-hover)'; }} onMouseLeave={(e) => { if (activeNav !== item.id) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ width: 4, height: 16, borderRadius: 2, background: activeNav === item.id ? 'var(--accent-blue)' : 'transparent', flexShrink: 0 }} />
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-primary)' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>v1.0.0 — VELTRIX Technologies</span>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>{children}</div>
      </div>
    </div>
  );
}
