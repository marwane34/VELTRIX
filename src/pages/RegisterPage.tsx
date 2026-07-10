import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

interface Props {
  onNavigateLogin: () => void;
}

export function RegisterPage({ onNavigateLogin }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error: err } = await signUp(email, password);
    setLoading(false);
    if (err) setError(err);
    else setSuccess(true);
  }

  const inputStyle = {
    background: '#060b14',
    border: '1px solid #1e2d45',
    color: '#e2e8f0',
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060b14' }}>
        <div className="text-center p-8" style={{ border: '1px solid #1a4a1a', background: '#060f06' }}>
          <div className="text-green-400 text-sm font-semibold mb-3">Account Created Successfully</div>
          <p className="text-slate-400 text-xs mb-4">You can now log in with your credentials.</p>
          <button onClick={onNavigateLogin} className="btn-monitor px-6">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 30% 40%, #0d1f3c 0%, #060b14 60%, #02040a 100%)' }}
    >
      <div className="relative z-10 w-full max-w-md px-4">
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
              <img
                src="/assets/veltrix-logo.jpeg"
                alt="VELTRIX"
                style={{ width: 48, height: 48, objectFit: 'contain' }}
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-wider">CREATE ACCOUNT</h1>
          <p className="text-xs text-slate-500 mt-1 tracking-widest">PREDICTIVE MAINTENANCE SYSTEM</p>
        </div>

        <div
          className="p-6"
          style={{
            background: 'linear-gradient(180deg, #0e1726 0%, #080d14 100%)',
            border: '1px solid #1e2d45',
            boxShadow: '0 0 40px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center gap-2 mb-5 pb-3" style={{ borderBottom: '1px solid #1e2d45' }}>
            <UserPlus size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-300 tracking-widest">NEW OPERATOR ACCOUNT</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">EMAIL ADDRESS</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none transition-all"
                style={inputStyle} placeholder="operator@plant.com"
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 text-sm outline-none transition-all"
                  style={inputStyle} placeholder="Min. 6 characters"
                  onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">CONFIRM PASSWORD</label>
              <input
                type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none transition-all"
                style={inputStyle} placeholder="Re-enter password"
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }}
              />
            </div>

            {error && (
              <div className="text-xs px-3 py-2" style={{ background: '#1a0808', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 text-sm font-semibold tracking-widest transition-all disabled:opacity-50"
              style={{
                background: loading ? '#0d1f3c' : 'linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%)',
                border: '1px solid #3b82f6',
                color: '#e0f2fe',
                letterSpacing: '0.1em',
                boxShadow: '0 0 12px rgba(59,130,246,0.25)',
              }}
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-xs text-slate-500">Already have an account? </span>
            <button onClick={onNavigateLogin} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
