import { useState, type FormEvent } from 'react';
import { Loader2, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onNavigateRegister: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a1220',
  border: '1px solid #1e2d45',
  color: '#e2e8f0',
  fontSize: 13,
  padding: '10px 12px 10px 36px',
  outline: 'none',
  transition: 'border-color 0.15s',
};

/**
 * LoginPage — VELTRIX SCADA authentication screen.
 * Dark-themed login card with logo, email/password fields, and link to register.
 */
export function LoginPage({ onNavigateRegister }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    }
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#060b14',
        padding: 20,
      }}
    >
      <div
        className="flex flex-col items-center"
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#0e1726',
          border: '1px solid #1e2d45',
          borderRadius: 8,
          padding: '40px 36px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Logo */}
        <img
          src="/assets/veltrix-logo.svg"
          alt="VELTRIX"
          width={64}
          height={58}
          style={{ display: 'block', marginBottom: 16 }}
        />

        {/* Title */}
        <h1
          className="font-bold tracking-wide"
          style={{ fontSize: 22, color: '#e2e8f0', margin: 0 }}
        >
          VELTRIX
        </h1>
        <p
          className="text-center"
          style={{
            fontSize: 10,
            color: '#3b82f6',
            letterSpacing: '3px',
            fontWeight: 600,
            margin: '4px 0 28px',
          }}
        >
          PREDICTIVE MAINTENANCE SCADA
        </p>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 w-full"
            style={{
              padding: '8px 12px',
              marginBottom: 16,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 4,
            }}
          >
            <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[10px] font-semibold tracking-wider"
              style={{ color: '#94a3b8' }}
            >
              EMAIL
            </label>
            <div className="relative">
              <Mail
                size={15}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@veltrix.io"
                autoFocus
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[10px] font-semibold tracking-wider"
              style={{ color: '#94a3b8' }}
            >
              PASSWORD
            </label>
            <div className="relative">
              <Lock
                size={15}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-monitor flex items-center justify-center gap-2 w-full"
            style={{
              marginTop: 8,
              padding: '10px 16px',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Lock size={15} />
            )}
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Register link */}
        <div className="flex items-center gap-1.5" style={{ marginTop: 28 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Don't have an account?
          </span>
          <button
            onClick={onNavigateRegister}
            style={{
              fontSize: 12,
              color: '#60a5fa',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#93c5fd')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
