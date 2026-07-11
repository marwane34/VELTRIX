import { useState, FormEvent } from 'react';
import { Loader2, Lock, Mail, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onNavigateRegister: () => void;
}

/**
 * Authentication entry point. Renders the VELTRIX brand, an email/password
 * sign-in form wired to `useAuth().signIn`, and a link to the register page.
 * Dark SCADA theme throughout.
 */
export function LoginPage({ onNavigateRegister }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#060b14',
    border: '1px solid #1e2d45',
    color: '#e2e8f0',
    fontSize: 13,
    padding: '10px 12px 10px 34px',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: '100vh',
        background: '#060b14',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.08) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(6,182,212,0.06) 0%, transparent 40%)',
      }}
    >
      <div
        className="flex flex-col"
        style={{
          width: 380,
          maxWidth: '92vw',
          background: '#0e1726',
          border: '1px solid #1e2d45',
          boxShadow: '0 0 50px rgba(0,0,0,0.7)',
        }}
      >
        {/* Brand header */}
        <div
          className="flex flex-col items-center gap-2 px-6 pt-8 pb-5"
          style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0e1726 100%)' }}
        >
          <img src="/assets/veltrix-logo.svg" alt="VELTRIX" width={64} height={58} />
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-slate-100 tracking-[3px]">VELTRIX</span>
            <span className="text-[9px] text-slate-500 tracking-[4px]">PREDICTIVE MAINTENANCE</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">SIGN IN</span>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] text-slate-400 tracking-wide">EMAIL</label>
            <div className="relative">
              <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] text-slate-400 tracking-wide">PASSWORD</label>
            <div className="relative">
              <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div
              className="px-3 py-2 text-[11px] text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-monitor flex items-center justify-center gap-2"
            disabled={submitting}
            style={{ opacity: submitting ? 0.7 : 1, height: 38, marginTop: 4 }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-500">No account?</span>
            <button
              type="button"
              onClick={onNavigateRegister}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Register <ArrowRight size={11} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
