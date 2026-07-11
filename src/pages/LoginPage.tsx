import { useState, FormEvent } from 'react';
import { Activity, LogIn, Mail, Lock, CircleAlert as AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onNavigateRegister: () => void;
}

export function LoginPage({ onNavigateRegister }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) setError(signInError);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#060b14',
    border: '1px solid #1e2d45',
    color: '#e2e8f0',
    padding: '10px 12px 10px 36px',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0e1726 0%, #060b14 100%)',
    }}>
      <div style={{
        width: 400, maxWidth: '90vw',
        background: '#0e1726',
        border: '1px solid #1e2d45',
        borderRadius: 12,
        padding: 32,
        boxShadow: '0 8px 60px rgba(0,0,0,0.5), 0 0 1px rgba(59,130,246,0.2)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
            boxShadow: '0 0 30px rgba(59,130,246,0.3)',
          }}>
            <Activity size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, letterSpacing: '4px',
            background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
          }}>
            VELTRIX
          </h1>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '3px', marginTop: 4 }}>
            SCADA DASHBOARD
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, display: 'block', fontWeight: 600 }}>
              Email
            </label>
            <Mail size={15} color="#64748b" style={{ position: 'absolute', left: 10, top: 37 }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              required
              autoFocus
            />
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, display: 'block', fontWeight: 600 }}>
              Password
            </label>
            <Lock size={15} color="#64748b" style={{ position: 'absolute', left: 10, top: 37 }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              required
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: '#ef444410',
              border: '1px solid #ef444440', borderRadius: 6,
              fontSize: 12, color: '#ef4444',
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px',
              background: 'linear-gradient(180deg, #1a4a1a 0%, #0f2e0f 100%)',
              border: '1px solid #22c55e',
              color: '#22c55e',
              borderRadius: 6,
              fontSize: 13, fontWeight: 700, letterSpacing: '1px',
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <LogIn size={15} />
            {loading ? 'Signing In...' : 'SIGN IN'}
          </button>
        </form>

        {/* Register link */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#64748b' }}>
          Don't have an account?{' '}
          <button
            onClick={onNavigateRegister}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#3b82f6', fontWeight: 600, fontSize: 12,
            }}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
