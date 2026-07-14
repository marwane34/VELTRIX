import { useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MonitoringProvider } from './contexts/MonitoringContext';
import { CommunicationProvider } from './contexts/CommunicationContext';
import { ToastProvider } from './components/Toast';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import type { NavItem } from './types';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const MachinesPage = lazy(() => import('./pages/MachinesPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const CommunicationPage = lazy(() => import('./pages/CommunicationPage'));
const ExportHistoryPage = lazy(() => import('./pages/ExportHistoryPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner" />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="loading-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!user) {
    if (showRegister) {
      return <RegisterPage onNavigateLogin={() => setShowRegister(false)} />;
    }
    return <LoginPage onNavigateRegister={() => setShowRegister(true)} />;
  }

  const handleNavigate = (nav: NavItem) => {
    setActiveNav(nav);
    setShowNotifications(false);
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const renderPage = () => {
    switch (activeNav) {
      case 'dashboard':
        return <Dashboard />;
      case 'machines':
        return <MachinesPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'communication':
        return <CommunicationPage />;
      case 'export_history':
        return <ExportHistoryPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <MonitoringProvider>
      <CommunicationProvider>
        <ToastProvider>
          <AppLayout
            activeNav={activeNav}
            onNavigate={handleNavigate}
            onOpenNotifications={handleOpenNotifications}
          >
            <Suspense fallback={<PageLoader />}>
              {renderPage()}
            </Suspense>
          </AppLayout>
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
