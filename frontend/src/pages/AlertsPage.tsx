import { TriangleAlert as AlertTriangle, Bell, Lightbulb, Cpu } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { Sidebar } from '../components/Sidebar';

export function AlertsPage() {
  const { anomalies, recommendations, machines } = useMonitoring();

  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length;
  const recCount = recommendations.length;

  const summaryCards = [
    { icon: AlertTriangle, label: 'Critical Alerts', value: criticalCount, color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.1)' },
    { icon: Bell, label: 'Warnings', value: warningCount, color: 'var(--accent-yellow)', bg: 'rgba(234, 179, 8, 0.1)' },
    { icon: Lightbulb, label: 'Recommendations', value: recCount, color: 'var(--accent-blue)', bg: 'rgba(59, 130, 246, 0.1)' },
  ];

  const formatTime = (ts: number) => new Date(ts).toLocaleString();

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar onAddMachine={() => {}} />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Alerts & Recommendations</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Real-time anomaly detection and AI-generated maintenance recommendations
          </p>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, flexShrink: 0 }}>
          {summaryCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="panel" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: card.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color={card.color} />
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    {card.label}
                  </span>
                  <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Anomalies List */}
        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} color="var(--accent-yellow)" />
              <span className="panel-title">Anomalies</span>
              {anomalies.length > 0 && <span className="badge badge-critical">{anomalies.length}</span>}
            </div>
          </div>
          <div style={{ padding: '8px 8px 8px 8px' }}>
            {anomalies.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Cpu size={28} color="var(--accent-green)" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No anomalies detected. All systems normal.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {anomalies.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 6,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderLeft: `3px solid ${a.severity === 'critical' ? 'var(--accent-red)' : 'var(--accent-yellow)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge badge-${a.severity === 'critical' ? 'critical' : 'warning'}`}>
                          {a.severity}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          {a.type}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {formatTime(a.timestamp)}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.message}</p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Value: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{a.value.toFixed(3)}</span>
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Threshold: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{a.threshold.toFixed(3)}</span>
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Machine: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{a.machineName}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recommendations List */}
        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={14} color="var(--accent-blue)" />
              <span className="panel-title">Recommendations</span>
              {recommendations.length > 0 && <span className="badge badge-info">{recommendations.length}</span>}
            </div>
          </div>
          <div style={{ padding: 8 }}>
            {recommendations.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Lightbulb size={28} color="var(--accent-green)" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No recommendations at this time.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 6,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderLeft: `3px solid ${rec.priority === 'high' ? 'var(--accent-red)' : rec.priority === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-blue)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge badge-${rec.priority === 'high' ? 'critical' : rec.priority === 'medium' ? 'warning' : 'info'}`}>
                          {rec.priority}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rec.component}</span>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>ETA: {rec.eta}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{rec.action}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{rec.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Machine Status Table */}
        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={14} color="var(--accent-blue)" />
              <span className="panel-title">Machine Status</span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Machine</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {machines.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No machines registered.
                    </td>
                  </tr>
                ) : (
                  machines.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`status-dot status-${m.status}`} />
                          {m.name}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{m.location || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className={`badge badge-${m.status === 'critical' ? 'critical' : m.status === 'warning' ? 'warning' : m.status === 'online' ? 'success' : 'info'}`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertsPage;
