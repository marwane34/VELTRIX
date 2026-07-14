import { AuthProvider, useAuth } from './context/AuthContext';
import { configStatus } from './lib/supabase';

function ConfigError() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
      <h1 style={{ color: 'var(--accent-red)', fontSize: '1.5rem', marginBottom: '1rem' }}>
        Supabase Configuration Error
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        The application cannot connect to Supabase. The following errors were detected:
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {configStatus.errors.map((e, i) => (
          <li key={i} style={{ color: 'var(--accent-red)', padding: '0.5rem 0', borderBottom: '1px solid var(--border-primary)' }}>
            {e}
          </li>
        ))}
      </ul>
      <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.875rem' }}>
        Fix frontend/.env with valid Supabase credentials and restart the application.
      </p>
    </div>
  );
}

function AppContent() {
  const { loading } = useAuth();
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }
  return <div style={{ padding: '2rem' }}>VELTRIX SCADA</div>;
}

export default function App() {
  if (!configStatus.valid) {
    return <ConfigError />;
  }
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
