import { X, Bell, TriangleAlert as AlertTriangle } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
interface NotificationPanelProps { onClose: () => void; }
export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { anomalies, recommendations } = useMonitoring();
  return (
    <div style={{ position: 'fixed', top: 32, right: 0, bottom: 0, width: 360, background: 'var(--bg-panel)', borderLeft: '1px solid var(--border-secondary)', zIndex: 500, display: 'flex', flexDirection: 'column', animation: 'slide-up 0.2s ease-out' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Bell size={16} color="var(--accent-blue)" /><span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</span></div>
        <button className="btn-icon" onClick={onClose}><X size={18} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {anomalies.length === 0 && recommendations.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}><Bell size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No notifications</p></div>
        ) : (
          <>
            {anomalies.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', padding: '0 8px' }}>ANOMALIES</span>
                {anomalies.map(a => (
                  <div key={a.id} style={{ padding: '10px 12px', borderRadius: 6, marginBottom: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><AlertTriangle size={14} color={a.severity === 'critical' ? 'var(--accent-red)' : 'var(--accent-yellow)'} /><span className={`badge badge-${a.severity === 'critical' ? 'critical' : 'warning'}`}>{a.severity}</span></div>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)' }}>{a.message}</p>
                  </div>
                ))}
              </div>
            )}
            {recommendations.length > 0 && (
              <div>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', padding: '0 8px' }}>RECOMMENDATIONS</span>
                {recommendations.map(r => (
                  <div key={r.id} style={{ padding: '10px 12px', borderRadius: 6, marginBottom: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                    <span className={`badge badge-${r.priority === 'high' ? 'critical' : r.priority === 'medium' ? 'warning' : 'info'}`} style={{ marginBottom: 4 }}>{r.priority}</span>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 4 }}>{r.action}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
