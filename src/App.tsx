import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MonitoringProvider } from './contexts/MonitoringContext';
import { CommunicationProvider } from './contexts/CommunicationContext';
import { ToastProvider } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import MachinesPage from './pages/MachinesPage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CommunicationPage from './pages/CommunicationPage';
import { AppLayout, NavItem } from './components/AppLayout';

type AuthPage = 'login' | 'register';

function AppContent() {
  const { user, loading } = useAuth();
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [appPage, setAppPage] = useState<NavItem>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3" style={{ background: '#060b14' }}>
        <img src="/assets/veltrix-logo.svg" alt="VELTRIX" style={{ width: 48, height: 44, objectFit: 'contain' }} />
        <div style={{ width: 32, height: 32, border: '2px solid #1e2d45', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 11, color: '#4a5f7a', letterSpacing: '0.1em' }}>INITIALIZING SYSTEM...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    if (authPage === 'register') return <RegisterPage onNavigateLogin={() => setAuthPage('login')} />;
    return <LoginPage onNavigateRegister={() => setAuthPage('register')} />;
  }

  return (
    <MonitoringProvider>
      <CommunicationProvider>
        <ToastProvider>
          {appPage === 'dashboard' ? (
            <Dashboard onNavigate={(p) => setAppPage(p as NavItem)} />
          ) : (
            <AppLayout activeNav={appPage} onNavigate={setAppPage} onOpenNotifications={() => setShowNotifications(true)}>
              {appPage === 'machines' && <MachinesPage />}
              {appPage === 'alerts' && <AlertsPage />}
              {appPage === 'analytics' && <AnalyticsPage />}
              {appPage === 'communication' && <CommunicationPage />}
            </AppLayout>
          )}
        </ToastProvider>
      </CommunicationProvider>
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
