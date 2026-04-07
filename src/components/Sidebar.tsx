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
    label: 'HISTORICO SOLICITUDES',
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
    label: 'Nueva Solicitud',
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

const getRoleDeptIcon = (role?: string, deptName?: string, size = 18) => {
  if (role === 'Admin') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  
  const d = (deptName || '').toLowerCase();
  if (d.includes('segub') || d.includes('segur')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/></svg>;
  if (d.includes('dif')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
  if (d.includes('teso')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
  if (d.includes('obras')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
  if (d.includes('salud')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
  
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
};

import { logoBase64 } from '../utils/logoBase64';

const Logo = () => (
  <div className="w-12 h-12 rounded-2xl p-[2px] shadow-[0_0_30px_rgba(59,130,246,0.2)] shrink-0 group transform hover:rotate-6 transition-all duration-500" style={{background:'var(--gradient-brand)'}}>
    <div className="w-full h-full bg-[#030014] rounded-[inherit] flex items-center justify-center overflow-hidden">
      <img src={logoBase64} alt="TZ" className="w-8 h-8 object-contain" />
    </div>
  </div>
);

export default function Sidebar() {
  const { currentUser, page, setPage, logout, tickets, departments } = useApp();
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
            ? 'text-blue-400 border border-blue-500/20' 
            : 'text-[#5a6487] hover:text-white hover:bg-white/5 border border-transparent'
        }`}
        style={isActive ? {background:'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.06))', boxShadow:'inset 0 0 20px rgba(59,130,246,0.05)'} : {}}
      >
        {isActive && (
          <div className="absolute left-0 top-0 w-1 h-full" style={{background:'var(--gradient-brand)'}} />
        )}
        <div className={`shrink-0 transition-transform duration-500 group-hover:scale-110 ${isActive ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`}>
          {item.icon}
        </div>
        <span style={{fontFamily:'var(--font-body)'}} className="text-[10px] font-bold uppercase tracking-[2.5px] truncate">{item.label}</span>
        {item.id === 'tickets' && stats.open > 0 && (
          <span className="ml-auto w-5 h-5 rounded-full text-white text-[9px] font-black flex items-center justify-center animate-pulse" style={{background:'var(--accent)',boxShadow:'0 0 15px var(--accent-glow)'}}>
            {stats.open}
          </span>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full border-r overflow-y-auto" style={{background:'var(--bg-dark)',borderColor:'var(--glass-border)'}}>
      {/* Brand */}
      <div className="p-8 pb-12 flex items-center gap-4">
        <Logo />
        <div>
          <div style={{fontFamily:'var(--font-display)'}} className="text-white font-black text-sm tracking-tighter leading-none">C2 SYSTEM</div>
          <div style={{fontFamily:'var(--font-body)',color:'var(--primary-light)'}} className="text-[8px] font-semibold tracking-[3px] uppercase mt-1">TZOMPANTEPEC</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        <div style={{fontFamily:'var(--font-body)',color:'var(--text-muted)'}} className="text-[9px] font-bold tracking-[4px] uppercase px-5 mb-4 opacity-60">OPERACIONES</div>
        {navItems.map(item => (
          <NavButton key={item.id} item={item} />
        ))}

        {isAdmin && (
          <>
            <div style={{fontFamily:'var(--font-body)',color:'var(--text-muted)'}} className="text-[9px] font-bold tracking-[4px] uppercase px-5 mb-4 mt-12 opacity-60">ADMINISTRACIÓN</div>
            {adminNavItems.map(item => (
              <NavButton key={item.id} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* User info & Logout */}
      <div className="p-4 mt-auto">
        <div className="glass-panel rounded-2xl p-4 relative overflow-hidden group" style={{border:'1px solid rgba(99,102,241,0.12)'}}>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border transition-transform duration-500 group-hover:scale-110" style={{background:'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.15))',color:'var(--primary-light)',borderColor:'rgba(59,130,246,0.25)',boxShadow:'0 0 15px rgba(59,130,246,0.1)'}}>
              {getRoleDeptIcon(currentUser?.role, departments.find(d => d.id === currentUser?.departmentId)?.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div style={{fontFamily:'var(--font-body)'}} className="text-white text-[10px] font-bold uppercase tracking-tight truncate">{currentUser?.name}</div>
              <div style={{fontFamily:'var(--font-body)',color:'var(--primary-light)'}} className="text-[8px] font-semibold uppercase tracking-widest">{currentUser?.role}</div>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full mt-4 py-2 text-[9px] font-bold text-red-400/70 hover:text-red-400 uppercase tracking-[3px] border border-red-500/10 hover:bg-red-500/5 rounded-lg transition-all duration-300"
            style={{fontFamily:'var(--font-body)'}}
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 backdrop-blur-xl border-b z-50 px-6 flex items-center justify-between" style={{background:'rgba(4,6,15,0.88)',borderColor:'var(--glass-border)'}}>
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div style={{fontFamily:'var(--font-display)'}} className="text-white font-black text-xs tracking-tighter uppercase">C2 SYSTEM</div>
            <div style={{fontFamily:'var(--font-body)',color:'var(--primary-light)'}} className="text-[7px] font-semibold tracking-[2px] uppercase opacity-80">TZOMPANTEPEC</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 rounded-xl border flex items-center justify-center active:scale-95 transition-transform" style={{background:'rgba(99,102,241,0.08)',color:'var(--primary-light)',borderColor:'rgba(99,102,241,0.2)'}}
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
