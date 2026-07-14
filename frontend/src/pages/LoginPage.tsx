import { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-primary)',
          borderRadius: 12,
          padding: 36,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <img
            src="../assets/veltrix-logo.svg"
            alt="VELTRIX"
            style={{ width: 56, height: 48, objectFit: 'contain', marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent-blue)' }}>
            VELTRIX
          </h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em', marginTop: 2 }}>
            SCADA DIAGNOSTIC SYSTEM
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: 12,
                color: 'var(--accent-red)',
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: 14 }}
          >
            {loading ? <div className="loading-spinner" style={{ width: 16, height: 16 }} /> : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Don't have an account? </span>
          <button
            onClick={onNavigateRegister}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
