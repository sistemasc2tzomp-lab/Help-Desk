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
    label: 'Panel',
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
];

const Logo = () => (
  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#7b2fff] p-[2px] shadow-[0_0_30px_rgba(0,240,255,0.2)] shrink-0 group transform hover:rotate-6 transition-all duration-500">
    <div className="w-full h-full bg-[#030014] rounded-[inherit] flex items-center justify-center overflow-hidden">
      <img src="img/logo_tzompantepec.png" alt="TZ" className="w-8 h-8 object-contain" />
    </div>
  </div>
);

export default function Sidebar() {
  const { currentUser, page, setPage, logout, tickets } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const stats = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'Abierto').length,
    inProgress: tickets.filter(t => t.status === 'En Progreso').length,
  };

  const isAdmin = currentUser?.role === 'Admin';

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = page === item.id || (item.id === 'tickets' && page === 'ticket-detail');
    return (
      <button
        key={item.id}
        onClick={() => {
          setPage(item.id);
          setMobileOpen(false);
        }}
        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden ${
          isActive 
            ? 'bg-gradient-to-r from-[#00f0ff]/10 to-[#7b2fff]/5 text-[#00f0ff] shadow-[inset_0_0_20px_rgba(0,240,255,0.05)] border border-[#00f0ff]/20' 
            : 'text-[#8888aa] hover:text-white hover:bg-white/5 border border-transparent'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-[#00f0ff] to-[#7b2fff]" />
        )}
        <div className={`shrink-0 transition-transform duration-500 group-hover:scale-110 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]' : ''}`}>
          {item.icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[3px] font-orbitron truncate">{item.label}</span>
        {item.id === 'tickets' && stats.open > 0 && (
          <span className="ml-auto w-5 h-5 rounded-full bg-[#ff2d95] text-white text-[9px] font-black flex items-center justify-center shadow-[0_0_15px_rgba(255,45,149,0.5)] animate-pulse">
            {stats.open}
          </span>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#030014] border-r border-white/5 overflow-y-auto custom-scrollbar">
      {/* Brand */}
      <div className="p-8 pb-12 flex items-center gap-4">
        <Logo />
        <div>
          <div className="text-white font-black text-sm tracking-tighter font-orbitron leading-none">C2 SYSTEM</div>
          <div className="text-[#00f0ff] text-[8px] font-bold tracking-[3px] uppercase mt-1">TZOMPANTEPEC</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        <div className="text-[#8888aa] text-[9px] font-black tracking-[4px] uppercase px-5 mb-4 opacity-50">OPERACIONES</div>
        {navItems.map(item => (
          <NavButton key={item.id} item={item} />
        ))}

        {isAdmin && (
          <>
            <div className="text-[#8888aa] text-[9px] font-black tracking-[4px] uppercase px-5 mb-4 mt-12 opacity-50">ADMINISTRACIÓN</div>
            {adminNavItems.map(item => (
              <NavButton key={item.id} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* User info & Logout */}
      <div className="p-4 mt-auto">
        <div className="glass-panel rounded-2xl p-4 border border-white/5 relative overflow-hidden group">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff]/20 to-[#7b2fff]/20 flex items-center justify-center text-[#00f0ff] font-black border border-[#00f0ff]/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              {currentUser?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[10px] font-black uppercase tracking-tight truncate font-orbitron">{currentUser?.name}</div>
              <div className="text-[#00f0ff] text-[8px] font-bold uppercase tracking-widest">{currentUser?.role}</div>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full mt-4 py-2 text-[9px] font-black text-red-400/70 hover:text-red-400 uppercase tracking-[3px] border border-red-500/10 hover:bg-red-500/5 rounded-lg transition-all duration-300 font-orbitron"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#030014]/80 backdrop-blur-xl border-b border-white/5 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="text-white font-black text-xs tracking-tighter font-orbitron uppercase">C2 SYSTEM</div>
            <div className="text-[#00f0ff] text-[7px] font-bold tracking-[2px] uppercase opacity-80">TZOMPANTEPEC</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-[#00f0ff] active:scale-95 transition-transform"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[#030014]/90 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 w-72 h-full shadow-2xl animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
