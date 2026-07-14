import { BrainCircuit, TrendingUp, Activity, Thermometer, Zap, Waves } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { Sidebar } from '../components/Sidebar';
import VibrationChart from '../components/VibrationChart';
import FrequencyChart from '../components/FrequencyChart';
import TemperatureChart from '../components/TemperatureChart';
import CurrentChart from '../components/CurrentChart';

export function AnalyticsPage() {
  const { selectedMachine, readings, frequencyData, aiPrediction, healthTrend } = useMonitoring();

  // Compute health score from failureRisk (AIPrediction has no healthScore field)
  const healthScore = aiPrediction
    ? Math.max(0, Math.min(100, 100 - aiPrediction.failureRisk))
    : 0;

  // Health Score Trend SVG chart
  const healthData = healthTrend.map((h) => h.health);
  const trendWidth = 600;
  const trendHeight = 200;
  const trendPadding = 30;

  const renderTrendChart = () => {
    if (healthData.length === 0) {
      return (
        <div style={{ height: trendHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          No health trend data available
        </div>
      );
    }
    const max = 100;
    const min = 0;
    const range = max - min || 1;
    const pts = healthData
      .map((v, i) => {
        const x = trendPadding + (i / Math.max(healthData.length - 1, 1)) * (trendWidth - trendPadding * 2);
        const y = trendHeight - trendPadding - ((v - min) / range) * (trendHeight - trendPadding * 2 - 10);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width="100%" height={trendHeight} viewBox={`0 0 ${trendWidth} ${trendHeight}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <text x="10" y="14" fill="var(--text-muted)" fontSize="10" fontFamily="sans-serif">Health Score (%)</text>
        {/* Grid lines */}
        <line x1={trendPadding} y1={trendHeight - trendPadding} x2={trendWidth - trendPadding} y2={trendHeight - trendPadding} stroke="var(--border-primary)" strokeWidth="1" />
        <line x1={trendPadding} y1={trendPadding} x2={trendPadding} y2={trendHeight - trendPadding} stroke="var(--border-primary)" strokeWidth="1" />
        {/* Y-axis labels */}
        <text x={trendPadding - 6} y={trendPadding + 4} fill="var(--text-muted)" fontSize="9" fontFamily="sans-serif" textAnchor="end">100</text>
        <text x={trendPadding - 6} y={trendHeight / 2 + 4} fill="var(--text-muted)" fontSize="9" fontFamily="sans-serif" textAnchor="end">50</text>
        <text x={trendPadding - 6} y={trendHeight - trendPadding + 4} fill="var(--text-muted)" fontSize="9" fontFamily="sans-serif" textAnchor="end">0</text>
        {/* 50% reference line */}
        <line x1={trendPadding} y1={trendHeight / 2} x2={trendWidth - trendPadding} y2={trendHeight / 2} stroke="var(--border-primary)" strokeWidth="0.5" strokeDasharray="4 4" />
        {/* Data line */}
        <polyline points={pts} fill="none" stroke="var(--accent-green)" strokeWidth="2" />
        {/* Data points */}
        {healthData.map((v, i) => {
          const x = trendPadding + (i / Math.max(healthData.length - 1, 1)) * (trendWidth - trendPadding * 2);
          const y = trendHeight - trendPadding - ((v - min) / range) * (trendHeight - trendPadding * 2 - 10);
          return <circle key={i} cx={x} cy={y} r="2" fill="var(--accent-green)" />;
        })}
      </svg>
    );
  };

  if (!selectedMachine) {
    return (
      <div style={{ display: 'flex', height: '100%' }}>
        <Sidebar onAddMachine={() => {}} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <Activity size={40} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14 }}>No machine selected. Please select a machine to view analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  // AI prediction details table rows
  const aiRows = aiPrediction
    ? [
        { label: 'Health Score', value: `${healthScore.toFixed(1)}%`, color: healthScore > 70 ? 'var(--accent-green)' : healthScore > 40 ? 'var(--accent-yellow)' : 'var(--accent-red)' },
        { label: 'Bearing Wear', value: `${(aiPrediction.bearingWear * 100).toFixed(1)}%`, color: aiPrediction.bearingWear > 0.7 ? 'var(--accent-red)' : aiPrediction.bearingWear > 0.4 ? 'var(--accent-yellow)' : 'var(--accent-green)' },
        { label: 'Overheat Risk', value: `${(aiPrediction.overheatRisk * 100).toFixed(1)}%`, color: aiPrediction.overheatRisk > 0.7 ? 'var(--accent-red)' : aiPrediction.overheatRisk > 0.4 ? 'var(--accent-yellow)' : 'var(--accent-green)' },
        { label: 'Failure Risk', value: `${(aiPrediction.failureRisk * 100).toFixed(1)}%`, color: aiPrediction.failureRisk > 0.7 ? 'var(--accent-red)' : aiPrediction.failureRisk > 0.4 ? 'var(--accent-yellow)' : 'var(--accent-green)' },
        { label: 'Remaining Useful Life', value: `${aiPrediction.rulHours.toFixed(0)} hours`, color: 'var(--accent-blue)' },
        { label: 'Confidence', value: `${(aiPrediction.confidence * 100).toFixed(1)}%`, color: 'var(--text-secondary)' },
      ]
    : [];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar onAddMachine={() => {}} />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Analytics — {selectedMachine.name}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            In-depth sensor analytics and AI prediction breakdown
          </p>
        </div>

        {/* Full-size charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="panel">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Waves size={14} color="var(--accent-blue)" />
                <span className="panel-title">Vibration Analysis</span>
              </div>
            </div>
            <div style={{ padding: 12 }}>
              <VibrationChart data={readings.map((r) => r.vibration)} height={220} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={14} color="var(--accent-cyan)" />
                <span className="panel-title">Frequency Spectrum Analysis</span>
              </div>
            </div>
            <div style={{ padding: 12 }}>
              <FrequencyChart data={frequencyData} height={220} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Thermometer size={14} color="var(--accent-orange)" />
                <span className="panel-title">Temperature Analysis</span>
              </div>
            </div>
            <div style={{ padding: 12 }}>
              <TemperatureChart data={readings.map((r) => r.temperature)} height={220} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} color="var(--accent-yellow)" />
                <span className="panel-title">Current Analysis</span>
              </div>
            </div>
            <div style={{ padding: 12 }}>
              <CurrentChart data={readings.map((r) => r.current)} height={220} />
            </div>
          </div>
        </div>

        {/* AI Prediction Details Table */}
        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BrainCircuit size={14} color="var(--accent-purple)" />
              <span className="panel-title">AI Prediction Details</span>
            </div>
            {aiPrediction && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Trend: <span style={{ color: aiPrediction.trend === 'improving' ? 'var(--accent-green)' : aiPrediction.trend === 'degrading' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{aiPrediction.trend}</span>
              </span>
            )}
          </div>
          <div style={{ padding: 14 }}>
            {aiPrediction ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aiRows.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 6,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                No AI prediction data available.
              </p>
            )}
          </div>
        </div>

        {/* Health Score Trend Chart */}
        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={14} color="var(--accent-green)" />
              <span className="panel-title">Health Score Trend</span>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {renderTrendChart()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
