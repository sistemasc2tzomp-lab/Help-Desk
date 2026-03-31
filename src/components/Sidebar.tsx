import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <line x1="10" y1="9" x2="8" y2="9"/>
      </svg>
    ),
  },
  {
    id: 'new-ticket',
    label: 'Nuevo Ticket',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
];

const adminNavItems: NavItem[] = [
  {
    id: 'departments',
    label: 'Departamentos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    ),
  },
];

const Logo = () => (
  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shrink-0">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  </div>
);

export default function Sidebar() {
  const { currentUser, page, setPage, logout, tickets } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const openCount = tickets.filter(t => t.status === 'Abierto').length;
  const isAdmin = currentUser?.role === 'Admin';

  const isActive = (id: string) =>
    page === id || (page === 'ticket-detail' && id === 'tickets');

  const handleNav = (id: string) => {
    setPage(id);
    setMobileOpen(false);
  };

  const NavButton = ({ item }: { item: NavItem }) => (
    <button
      key={item.id}
      onClick={() => handleNav(item.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive(item.id)
          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      {item.icon}
      <span className="flex-1 text-left">{item.label}</span>
      {item.id === 'tickets' && openCount > 0 && (
        <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {openCount}
        </span>
      )}
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <Logo />
        <div>
          <span className="text-white font-bold text-sm leading-tight block">Tickets Tzompantepec</span>
          <div className="text-indigo-400 text-xs">Sistema de Tickets</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => <NavButton key={item.id} item={item} />)}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-slate-600 text-xs font-semibold uppercase tracking-widest">Admin</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
            </div>
            {adminNavItems.map(item => <NavButton key={item.id} item={item} />)}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: currentUser?.avatarColor }}
          >
            {currentUser?.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{currentUser?.name}</div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                currentUser?.role === 'Admin' ? 'bg-purple-400' :
                currentUser?.role === 'Agente' ? 'bg-blue-400' : 'bg-emerald-400'
              }`} />
              <span className="text-slate-500 text-xs">{currentUser?.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-red-400 transition p-1"
            title="Cerrar sesión"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#13151f] border-b border-white/5 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <span className="text-white font-bold text-sm leading-tight block">Tickets Tzompantepec</span>
            <div className="text-indigo-400 text-xs">Sistema de Tickets</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-400 hover:text-white transition p-2"
          aria-label="Abrir menú"
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={`lg:hidden fixed top-0 left-0 z-40 h-full w-72 bg-[#13151f] border-r border-white/5 transform transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-60 bg-[#13151f] border-r border-white/5 flex-col h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
}
