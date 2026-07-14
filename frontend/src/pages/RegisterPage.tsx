import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RegisterPageProps {
  onNavigateLogin: () => void;
}

export function RegisterPage({ onNavigateLogin }: RegisterPageProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!email.trim()) return 'Please enter an email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters long.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await signUp(email.trim(), password);
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
            CREATE NEW ACCOUNT
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
              placeholder="At least 6 characters"
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Confirm Password
            </label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? <div className="loading-spinner" style={{ width: 16, height: 16 }} /> : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Already have an account? </span>
          <button
            onClick={onNavigateLogin}
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
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
