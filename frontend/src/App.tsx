import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MonitoringProvider } from './contexts/MonitoringContext';
import { CommunicationProvider } from './contexts/CommunicationContext';
import { ToastProvider } from './components/Toast';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import MachinesPage from './pages/MachinesPage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CommunicationPage from './pages/CommunicationPage';
import ExportHistoryPage from './pages/ExportHistoryPage';
import type { NavItem } from './types';

function AppContent() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  // Loading spinner
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

  // No user — show Login or Register
  if (!user) {
    if (showRegister) {
      return <RegisterPage onNavigateLogin={() => setShowRegister(false)} />;
    }
    return <LoginPage onNavigateRegister={() => setShowRegister(true)} />;
  }

  // Authenticated — render full app with all providers
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
            {renderPage()}
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
