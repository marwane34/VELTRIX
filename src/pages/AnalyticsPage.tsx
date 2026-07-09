import { useEffect, useState } from 'react';
import { TrendingUp, Activity, Thermometer, Zap, Cpu, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { Prediction } from '../types';

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const arc = (score / 100) * circ;
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="#1e2d45" strokeWidth={8} />
      <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s' }} />
      <text x={45} y={42} textAnchor="middle" fontSize={14} fontWeight="bold" fill={color}>{score}</text>
      <text x={45} y={56} textAnchor="middle" fontSize={8} fill="#64748b">HEALTH</text>
    </svg>
  );
}

function RiskBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#1e2d45' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="panel p-3 flex items-center gap-3">
      <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-sm font-bold text-slate-200">{value}</div>
        {sub && <div className="text-xs text-slate-600">{sub}</div>}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { selectedMachine, aiAnalysis, temperature, currentVal, rmsX, rmsY, rpm } = useMonitoring();
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    if (!selectedMachine) return;
    supabase.from('predictions').select('*').eq('machine_id', selectedMachine.id)
      .order('predicted_at', { ascending: false }).limit(20).then(({ data }) => setPredictions(data ?? []));
  }, [selectedMachine]);

  if (!selectedMachine) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No machine selected. Add a machine to see analytics.
      </div>
    );
  }

  const ai = aiAnalysis;
  const healthColor = !ai ? '#64748b' : ai.healthScore >= 70 ? '#22c55e' : ai.healthScore >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#111827 0%,#0b0f1a 100%)' }}>
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide">AI ANALYTICS — {selectedMachine.name}</h2>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">Location: {selectedMachine.location || 'N/A'}</div>
      </div>

      <div className="p-5 space-y-5">
        {/* Health overview */}
        <div className="grid grid-cols-2 gap-4">
          {/* Gauge + status */}
          <div className="panel p-4 flex items-center gap-4">
            <HealthGauge score={ai?.healthScore ?? 100} />
            <div>
              <div className="text-xs text-slate-400 mb-1">Machine Status</div>
              <div className="text-sm font-bold mb-2" style={{ color: healthColor }}>
                {ai?.status.toUpperCase() ?? 'HEALTHY'}
              </div>
              <div className="text-xs text-slate-400">RUL Estimate</div>
              <div className="text-sm font-bold text-slate-200">{ai?.rulHours ?? '—'} hrs</div>
            </div>
          </div>

          {/* Risk breakdown */}
          <div className="panel p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-300 mb-2">RISK BREAKDOWN</div>
            <RiskBar label="Bearing Wear" value={ai?.bearingWear ?? 0} color="#f97316" />
            <RiskBar label="Overheat Risk" value={ai?.overheatRisk ?? 0} color="#ef4444" />
            <RiskBar label="Failure Risk" value={ai?.failureRisk ?? 0} color="#eab308" />
          </div>
        </div>

        {/* Live sensor stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={Thermometer} label="Temperature" value={`${temperature.toFixed(1)}°C`} sub={`Max: ${selectedMachine.temp_max}°C`} color="#ef4444" />
          <StatCard icon={Activity} label="Vibration RMS" value={`${((rmsX + rmsY) / 2).toFixed(2)}g`} sub={`X:${rmsX.toFixed(2)} Y:${rmsY.toFixed(2)}`} color="#3b82f6" />
          <StatCard icon={Zap} label="Current" value={`${currentVal.toFixed(1)}A`} sub={`Max: ${selectedMachine.current_max}A`} color="#eab308" />
          <StatCard icon={Cpu} label="RPM" value={String(rpm)} sub="Target: 1450 RPM" color="#22c55e" />
        </div>

        {/* AI Recommendation */}
        <div className="panel p-4">
          <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <TrendingUp size={11} className="text-blue-400" />
            AI RECOMMENDATION
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{ai?.recommendation ?? 'No data yet.'}</p>
          {ai && ai.anomalies.length > 0 && (
            <div className="mt-3 space-y-1">
              {ai.anomalies.map((anom, i) => (
                <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#facc15' }}>
                  <span style={{ width: 4, height: 4, background: '#eab308', borderRadius: '50%', flexShrink: 0 }} />
                  {anom}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prediction history mini-chart */}
        <div className="panel p-4">
          <div className="text-xs font-semibold text-slate-300 mb-3">HEALTH SCORE HISTORY</div>
          {predictions.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4">No predictions yet — monitoring will generate them automatically</div>
          ) : (
            <div className="flex items-end gap-1 h-20">
              {predictions.slice().reverse().map((p, i) => {
                const c = p.health_score >= 70 ? '#22c55e' : p.health_score >= 40 ? '#eab308' : '#ef4444';
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
                    <div style={{ width: '100%', height: `${p.health_score}%`, maxHeight: 72, background: c, opacity: 0.8, minHeight: 2 }} title={`${p.health_score}%`} />
                  </div>
                );
              })}
            </div>
          )}
          {predictions.length > 0 && (
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-600">Oldest</span>
              <span className="text-xs text-slate-600">Latest</span>
            </div>
          )}
        </div>

        {/* Thresholds */}
        <div className="panel p-4">
          <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
            <Clock size={11} className="text-blue-400" />
            CONFIGURED THRESHOLDS
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-slate-500 mb-1">Vibration RMS</div>
              <div className="val-blue">{selectedMachine.rms_min} – {selectedMachine.rms_max} g</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Temperature</div>
              <div className="val-orange">{selectedMachine.temp_min} – {selectedMachine.temp_max} °C</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Current</div>
              <div className="val-yellow">{selectedMachine.current_min} – {selectedMachine.current_max} A</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
