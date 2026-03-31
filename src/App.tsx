import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TicketList from './components/TicketList';
import TicketDetail from './components/TicketDetail';
import NewTicket from './components/NewTicket';
import UsersPage from './components/UsersPage';
import ReportsPage from './components/ReportsPage';
import DepartmentsPage from './components/DepartmentsPage';
import SettingsPage from './components/SettingsPage';
import SetupPage from './components/SetupPage';
import { isSupabaseConfigured } from './lib/supabase';

function AppContent() {
  const { currentUser, page, loading } = useApp();
  const [configured, setConfigured] = useState(isSupabaseConfigured());

  if (!configured) {
    return (
      <SetupPage
        onConfigured={() => {
          setConfigured(true);
          const recheck = (window as unknown as Record<string, unknown>).__sbRecheck;
          if (typeof recheck === 'function') recheck();
        }}
      />
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard />;
      case 'tickets':       return <TicketList />;
      case 'ticket-detail': return <TicketDetail />;
      case 'new-ticket':    return <NewTicket />;
      case 'users':         return <UsersPage />;
      case 'departments':   return <DepartmentsPage />;
      case 'reports':       return <ReportsPage />;
      case 'settings':      return <SettingsPage />;
      default:              return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative pt-14 lg:pt-0">
        {loading && (
          <div className="absolute top-16 lg:top-3 right-4 z-50">
            <div className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl px-3 py-1.5">
              <svg className="animate-spin w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-indigo-400 text-xs">Actualizando...</span>
            </div>
          </div>
        )}
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app/*" element={<AppContent />} />
          {/* Re-route any unknown to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}
