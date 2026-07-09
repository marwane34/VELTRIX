import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Eye, EyeOff, Cpu, Shield } from 'lucide-react';

interface Props {
  onNavigateRegister: () => void;
}

export function LoginPage({ onNavigateRegister }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 30% 40%, #0d1f3c 0%, #060b14 60%, #02040a 100%)' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(30,60,100,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(30,60,100,0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div
              className="w-16 h-16 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0d3060 0%, #061830 100%)',
                border: '2px solid #1e4080',
                boxShadow: '0 0 20px rgba(59,130,246,0.2)',
              }}
            >
              <Activity size={28} className="text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-wider">PREDICTIVE MAINTENANCE</h1>
          <p className="text-xs text-slate-500 mt-1 tracking-widest">INDUSTRIAL AI MONITORING SYSTEM</p>
        </div>

        {/* Card */}
        <div
          className="p-6"
          style={{
            background: 'linear-gradient(180deg, #0e1726 0%, #080d14 100%)',
            border: '1px solid #1e2d45',
            boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <div
            className="flex items-center gap-2 mb-5 pb-3"
            style={{ borderBottom: '1px solid #1e2d45' }}
          >
            <Shield size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-300 tracking-widest">SECURE LOGIN</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">EMAIL ADDRESS</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-200 outline-none transition-all"
                style={{
                  background: '#060b14',
                  border: '1px solid #1e2d45',
                  color: '#e2e8f0',
                }}
                placeholder="operator@plant.com"
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 text-sm outline-none transition-all"
                  style={{
                    background: '#060b14',
                    border: '1px solid #1e2d45',
                    color: '#e2e8f0',
                  }}
                  placeholder="••••••••"
                  onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-3 h-3"
                style={{ accentColor: '#3b82f6' }}
              />
              <label htmlFor="remember" className="text-xs text-slate-400 cursor-pointer">Remember this device</label>
            </div>

            {error && (
              <div
                className="text-xs px-3 py-2"
                style={{ background: '#1a0808', border: '1px solid #7f1d1d', color: '#fca5a5' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold tracking-widest transition-all disabled:opacity-50"
              style={{
                background: loading ? '#0d1f3c' : 'linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%)',
                border: '1px solid #3b82f6',
                color: '#e0f2fe',
                letterSpacing: '0.1em',
                boxShadow: loading ? 'none' : '0 0 12px rgba(59,130,246,0.25)',
              }}
            >
              {loading ? 'AUTHENTICATING...' : 'LOGIN'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-xs text-slate-500">No account? </span>
            <button
              onClick={onNavigateRegister}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Register here
            </button>
          </div>
        </div>

        {/* System indicators */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 4px #22c55e' }} />
            <span className="text-xs text-slate-500">System Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu size={10} className="text-slate-600" />
            <span className="text-xs text-slate-500">AI Engine Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
