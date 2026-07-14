import { Plus, Trash2, Cpu } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
interface SidebarProps { onAddMachine: () => void; }
export function Sidebar({ onAddMachine }: SidebarProps) {
  const { machines, selectedMachine, selectMachine, removeMachine } = useMonitoring();
  return (
    <div style={{ width: 200, flexShrink: 0, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Machines</span>
        <button className="btn-icon" onClick={onAddMachine} title="Add Machine" style={{ width: 24, height: 24 }}><Plus size={14} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        {machines.length === 0 ? (
          <div style={{ padding: '20px 14px', textAlign: 'center' }}>
            <Cpu size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No machines yet</p>
            <button className="btn btn-primary" onClick={onAddMachine} style={{ marginTop: 8, fontSize: 11 }}><Plus size={12} /> Add Machine</button>
          </div>
        ) : machines.map(m => (
          <div key={m.id} onClick={() => selectMachine(m)} style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, background: selectedMachine?.id === m.id ? 'var(--bg-elevated)' : 'transparent', border: '1px solid', borderColor: selectedMachine?.id === m.id ? 'var(--border-secondary)' : 'transparent', transition: 'all 0.15s', position: 'relative' }} onMouseEnter={(e) => { if (selectedMachine?.id !== m.id) e.currentTarget.style.background = 'var(--bg-panel-hover)'; }} onMouseLeave={(e) => { if (selectedMachine?.id !== m.id) e.currentTarget.style.background = 'transparent'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`status-dot status-${m.status}`} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              <button onClick={(e) => { e.stopPropagation(); removeMachine(m.id); }} style={{ opacity: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' } as React.CSSProperties} onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}><Trash2 size={12} /></button>
            </div>
            {m.location && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 16, marginTop: 2 }}>{m.location}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
