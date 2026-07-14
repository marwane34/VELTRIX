import { TriangleAlert as AlertTriangle, Activity } from 'lucide-react';
import type { Anomaly } from '../types';
interface AnomalyPanelProps { anomalies: Anomaly[]; }
export default function AnomalyPanel({ anomalies }: AnomalyPanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} color="var(--accent-yellow)" />
          <span className="panel-title">Anomalies</span>
          {anomalies.length > 0 && <span className="badge badge-critical">{anomalies.length}</span>}
        </div>
      </div>
      <div style={{ padding: '8px', maxHeight: 200, overflowY: 'auto' }}>
        {anomalies.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Activity size={24} color="var(--accent-green)" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>All systems normal</p>
          </div>
        ) : anomalies.map(a => (
          <div key={a.id} style={{ padding: '10px 12px', borderRadius: 6, marginBottom: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className={`badge badge-${a.severity === 'critical' ? 'critical' : 'warning'}`}>{a.severity}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.type}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-primary)' }}>{a.message}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Value: {a.value.toFixed(3)} / Threshold: {a.threshold.toFixed(3)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
