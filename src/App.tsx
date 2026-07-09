import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MonitoringProvider } from './contexts/MonitoringContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Dashboard } from './pages/Dashboard';
import { MachinesPage } from './pages/MachinesPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AppLayout } from './components/AppLayout';

type AuthPage = 'login' | 'register';
type AppPage = 'dashboard' | 'machines' | 'alerts' | 'analytics';

function AppContent() {
  const { user, loading } = useAuth();
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [appPage, setAppPage] = useState<AppPage>('dashboard');

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center flex-col gap-3"
        style={{ background: '#060b14' }}
      >
        <div
          style={{
            width: 32, height: 32,
            border: '2px solid #1e2d45',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 11, color: '#4a5f7a', letterSpacing: '0.1em' }}>INITIALIZING SYSTEM...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    if (authPage === 'register') {
      return <RegisterPage onNavigateLogin={() => setAuthPage('login')} />;
    }
    return <LoginPage onNavigateRegister={() => setAuthPage('register')} />;
  }

  return (
    <MonitoringProvider>
      {appPage === 'dashboard' ? (
        // Dashboard takes full screen (includes its own TitleBar + Sidebar)
        <Dashboard onNavigate={(p) => setAppPage(p as AppPage)} />
      ) : (
        <AppLayout currentPage={appPage} onNavigate={setAppPage}>
          {appPage === 'machines' && <MachinesPage />}
          {appPage === 'alerts' && <AlertsPage />}
          {appPage === 'analytics' && <AnalyticsPage />}
        </AppLayout>
      )}
    </MonitoringProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
