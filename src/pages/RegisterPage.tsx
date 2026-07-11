import { useState, FormEvent } from 'react';
import { Loader2, UserPlus, Lock, Mail, ArrowLeft, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onNavigateLogin: () => void;
}

/**
 * Registration screen. Renders the VELTRIX brand, an email/password sign-up
 * form wired to `useAuth().signUp`, and a link back to the login page.
 * Mirrors the LoginPage dark SCADA styling.
 */
export function RegisterPage({ onNavigateLogin }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: signUpError } = await signUp(email.trim(), password);
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    setDone(true);
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
            <span className="text-[9px] text-slate-500 tracking-[4px]">CREATE ACCOUNT</span>
          </div>
        </div>

        {/* Form / success */}
        <div className="p-6 flex flex-col gap-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div
                className="flex items-center justify-center"
                style={{ width: 48, height: 48, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)' }}
              >
                <Activity size={22} className="text-green-400" />
              </div>
              <span className="text-xs text-slate-200 text-center">
                Registration successful.<br />
                <span className="text-slate-400">Check your email to confirm your account, then sign in.</span>
              </span>
              <button className="btn-monitor flex items-center gap-2" onClick={onNavigateLogin} style={{ height: 34 }}>
                <ArrowLeft size={13} /> Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <UserPlus size={14} className="text-blue-400" />
                <span className="text-xs font-semibold text-slate-200 tracking-wide">REGISTER</span>
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
                    placeholder="At least 6 characters"
                    style={inputStyle}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] text-slate-400 tracking-wide">CONFIRM PASSWORD</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    style={inputStyle}
                    autoComplete="new-password"
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
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {submitting ? 'Creating account…' : 'Create Account'}
              </button>

              <div className="flex items-center justify-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500">Already registered?</span>
                <button
                  type="button"
                  onClick={onNavigateLogin}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ArrowLeft size={11} /> Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
