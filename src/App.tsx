import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TicketList from './components/TicketList';
import TicketDetail from './components/TicketDetail';
import NewTicket from './components/NewTicket';
import UsersPage from './pages/UsersPage';
import ReportsRepository from './pages/ReportsRepository';
import DepartmentsPage from './pages/DepartmentsPage';
import SettingsPage from './pages/SettingsPage';
import SetupPage from './pages/SetupPage';
import { isSupabaseConfigured } from './lib/supabase';

function AppContent() {
  const { currentUser, page, loading, theme } = useApp();
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
      case 'reports':       return <ReportsRepository />;
      case 'settings':      return <SettingsPage />;
      default:              return <Dashboard />;
    }
  };

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'bg-[#030014]' : 'bg-[#f4f7f6]'}`} data-theme={theme || 'dark'}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative pt-16 lg:pt-0">
        {loading && (
          <div className="fixed top-20 lg:top-6 right-6 z-[100] animate-fade-in">
            <div className="flex items-center gap-3 bg-[#00f0ff]/10 backdrop-blur-md border border-[#00f0ff]/30 rounded-2xl px-5 py-2.5 shadow-[0_0_30px_rgba(0,240,255,0.05)]">
              <div className="relative w-4 h-4">
                <svg className="animate-spin w-4 h-4 text-[#00f0ff]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <div className="absolute inset-0 bg-[#00f0ff] blur-lg opacity-10 animate-pulse" />
              </div>
              <span className="text-[#00f0ff] text-[10px] font-black uppercase tracking-[3px]">Sincronizando_Nexo...</span>
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
