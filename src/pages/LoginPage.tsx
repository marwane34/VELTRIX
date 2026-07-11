import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onNavigateRegister: () => void;
}

export function LoginPage({ onNavigateRegister }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
  }

  const iStyle: React.CSSProperties = {
    background: '#060b14', border: '1px solid #1e2d45', color: '#e2e8f0',
    width: '100%', padding: '10px 14px', fontSize: 13, outline: 'none',
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060b14' }}>
      <div className="w-full max-w-sm" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}>
        {/* Logo header */}
        <div className="flex flex-col items-center py-8" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#111827 0%,#0b0f1a 100%)' }}>
          <img src="/assets/veltrix-logo.svg" alt="VELTRIX" style={{ width: 64, height: 58, objectFit: 'contain' }} />
          <h1 className="text-lg font-bold text-slate-200 mt-3 tracking-widest">VELTRIX</h1>
          <p className="text-xs text-slate-500 mt-1">Predictive Maintenance System</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input type="email" style={iStyle} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }} onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input type="password" style={iStyle} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }} onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }} />
          </div>

          {error && <div className="text-xs px-3 py-2" style={{ background: '#1a0808', border: '1px solid #7f1d1d', color: '#fca5a5' }}>{error}</div>}

          <button type="submit" disabled={loading} className="btn-monitor w-full py-2.5">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center">
            <button type="button" onClick={onNavigateRegister} className="text-xs text-slate-500 hover:text-blue-400 transition-colors">
              Don't have an account? Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
