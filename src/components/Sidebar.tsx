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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    id: 'new-ticket',
    label: 'Nuevo Ticket',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    ),
  },
];

const Logo = () => (
  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)] shrink-0 border border-white/20">
    <img src="img/logo_tzompantepec.png" alt="TZ" className="w-8 h-8 rounded-full object-contain grayscale" />
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 relative group overflow-hidden ${
        isActive(item.id)
          ? 'text-[#ffffff] shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] border border-[#ffffff]/20'
          : 'text-[#8888aa] hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      {isActive(item.id) && (
        <div className="absolute left-0 top-0 w-1 h-full bg-[#ffffff] shadow-[0_0_15px_#ffffff]" />
      )}
      <span className={`${isActive(item.id) ? 'text-[#ffffff]' : 'group-hover:text-[#ffffff]'} transition-colors`}>
        {item.icon}
      </span>
      <span className="flex-1 text-left uppercase font-rajdhani">{item.label}</span>
      {item.id === 'tickets' && openCount > 0 && (
        <span className="bg-white text-[#050505] text-[10px] font-black px-2 py-0.5 rounded-full min-w-[22px] text-center border border-white/20">
          {openCount}
        </span>
      )}
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#050505]/80 backdrop-blur-xl border-r border-white/5">
      {/* Brand */}
      <div className="flex items-center gap-4 px-6 py-8 border-b border-white/5 relative overflow-hidden group">
        <div className="absolute -left-10 -top-10 w-20 h-20 bg-[#ffffff]/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <Logo />
        <div className="min-w-0">
          <span className="text-white font-black text-lg font-orbitron leading-none block tracking-tighter">TZOMP</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-white/60 text-[9px] font-bold tracking-[3px] uppercase">HELP DESK</div>
            <div className="bg-white/10 text-white text-[7px] font-black px-1.5 py-0.5 rounded border border-white/20 uppercase">v2.0</div>
          </div>
        </div>
      </div>

      {/* Nav Section */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map(item => <NavButton key={item.id} item={item} />)}

        {isAdmin && (
          <>
            <div className="pt-8 pb-3 px-4">
              <div className="flex items-center gap-3">
                <span className="text-[#8888aa] text-[9px] font-black uppercase tracking-[4px]">Núcleo Admin</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
            </div>
            {adminNavItems.map(item => <NavButton key={item.id} item={item} />)}
          </>
        )}
      </nav>

      {/* Profile Section */}
      <div className="px-4 py-6 border-t border-white/5 bg-gradient-to-b from-transparent to-black/20">
        <div className="flex items-center gap-3 p-3 rounded-2xl glass-panel border border-white/5 group">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg transform group-hover:scale-105 transition-transform"
            style={{ 
              background: `linear-gradient(135deg, ${currentUser?.avatarColor || '#cccccc'}, #000000)`,
              border: `1px solid ${currentUser?.avatarColor || '#cccccc'}44`
            }}
          >
            {currentUser?.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-bold truncate uppercase tracking-tighter">{currentUser?.name}</div>
            <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
              <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${
                currentUser?.role === 'Admin' ? 'text-white bg-white' :
                currentUser?.role === 'Agente' ? 'text-gray-300 bg-gray-400' : 'text-[#8888aa] bg-gray-600'
              }`} />
              <span className="text-[#8888aa] text-[10px] font-bold uppercase tracking-widest">{currentUser?.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-[#8888aa] hover:text-gray-400 transition-all hover:scale-110 p-2"
            title="Cerrar sesión"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <span className="text-white font-black text-sm font-orbitron tracking-tighter">TZOMP</span>
            <div className="text-[#ffffff] text-[8px] font-bold tracking-[2px]">HELP DESK</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 flex items-center justify-center text-[#8888aa] hover:text-white transition rounded-xl bg-white/5 border border-white/10"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-[#050505]/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside className={`lg:hidden fixed top-0 left-0 z-[70] h-full w-[280px] transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </aside>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col h-screen sticky top-0 z-40">
        <SidebarContent />
      </aside>
    </>
  );
}
