import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../types';

const roleColors: Record<string, string> = {
  'Admin': 'bg-white/10 text-white border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]',
  'Agente': 'bg-white/5 text-gray-300 border border-white/10 shadow-[0_0_10px_rgba(200,200,200,0.05)]',
  'Cliente': 'bg-white/2 text-gray-500 border border-white/5 shadow-[0_0_10px_rgba(150,150,150,0.02)]',
};

const roleIcons: Record<string, string> = {
  'Admin': '🛡️',
  'Agente': '🎧',
  'Cliente': '👤',
};

export default function UsersPage() {
  const { users, tickets, departments, refreshData, loading, currentUser, createUser } = useApp();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<User['role']>('Cliente');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  
  // Create user state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({ name: '', email: '', role: 'Cliente' as User['role'], departmentId: '' });

  const isAdmin = currentUser?.role === 'Admin';

  const getUserStats = (userId: string) => {
    const created = tickets.filter(t => t.createdById === userId).length;
    const assigned = tickets.filter(t => t.assignedToId === userId).length;
    const resolved = tickets.filter(
      t => t.assignedToId === userId && (t.status === 'Resuelto' || t.status === 'Cerrado')
    ).length;
    return { created, assigned, resolved };
  };

  const getDept = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user?.departmentId) return null;
    return departments.find(d => d.id === user.departmentId);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    const res = await createUser(createData);
    if (res.success) {
      setSaveMsg('✅ Usuario creado en la base de datos central');
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateData({ name: '', email: '', role: 'Cliente', departmentId: '' });
        setSaveMsg('');
      }, 1500);
    } else {
      setSaveMsg('❌ ERROR: ' + (res.error || 'Fallo desconocido'));
    }
    setSaving(false);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setNewRole(user.role);
    setSaveMsg('');
  };

  const saveRole = async () => {
    if (!editingUser || !isSupabaseConfigured()) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const sb = getSupabase();
      const { error } = await sb
        .from('perfiles')
        .update({ rol: newRole })
        .eq('id', editingUser.id);
      if (error) {
        setSaveMsg('❌ ERROR_ID: ' + error.message);
      } else {
        setSaveMsg('✅ ENCRIPTACIÓN DE ROL COMPLETADA');
        await refreshData();
        setTimeout(() => {
          setEditingUser(null);
          setSaveMsg('');
        }, 1200);
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="p-6 sm:p-10 space-y-10 max-w-7xl mx-auto min-h-screen bg-[#030014]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-orbitron tracking-tighter mb-2 uppercase">
            NÚCLEO <span className="text-white">USUARIOS</span>
          </h1>
          <p className="text-[#8888aa] text-sm font-rajdhani font-semibold tracking-[4px] uppercase">
            GESTIÓN DE PERSONAL Y AUTORIZACIONES // {users.length} NODOS DETECTADOS
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 glass-panel border border-white/5 hover:border-[#ffffff]/30 text-[#8888aa] hover:text-[#ffffff] px-5 py-3 rounded-2xl text-[10px] font-bold tracking-[2px] transition uppercase"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Sincronizar
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-futuristic flex items-center gap-2 px-6 py-3 text-[10px] tracking-[2px]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              ALTA INTEGRANTE
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'NODOS_TOTAL', val: users.length, color: 'text-white' },
          { label: 'ADMINS', val: users.filter(u => u.role === 'Admin').length, color: 'text-[#cccccc]' },
          { label: 'AGENTES', val: users.filter(u => u.role === 'Agente').length, color: 'text-[#ffffff]' },
          { label: 'CLIENTES', val: users.filter(u => u.role === 'Cliente').length, color: 'text-[#aaaaaa]' },
        ].map((kpi, idx) => (
          <div key={idx} className="glass-panel rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full bg-current ${kpi.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="text-[#8888aa] text-[9px] font-black uppercase tracking-[3px] mb-1 font-rajdhani">{kpi.label}</div>
            <div className={`text-3xl font-black font-orbitron ${kpi.color}`}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Search & Layout */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ffffff]/40 group-focus-within:text-[#ffffff] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="SCAN_NAME_OR_EMAIL..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#0f0a28]/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-[#ffffff]/50 transition-all font-mono tracking-tighter"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="bg-[#0f0a28]/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-bold font-rajdhani tracking-widest uppercase focus:outline-none focus:border-[#ffffff]/50 transition-all cursor-pointer"
          >
            <option value="">FILTRAR_POR_RANGO</option>
            <option value="Admin">ADMIN</option>
            <option value="Agente">AGENTE</option>
            <option value="Cliente">CLIENTE</option>
          </select>
        </div>

        {/* Users Loop */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-[#ffffff]/20 border-t-[#ffffff] rounded-full animate-spin shadow-[0_0_20px_rgba(255,255,255,0.1)]" />
            <p className="text-[#ffffff] font-mono text-[10px] animate-pulse">CARGANDO_RECURSOS_USUARIOS...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-3xl border-dashed border-2 border-white/5">
            <p className="text-[#8888aa] font-bold tracking-[4px] uppercase text-xs">No se detectaron nodos coincidentes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(user => {
              const stats = getUserStats(user.id);
              const dept = getDept(user.id);
              const isCurrentUser = user.id === currentUser?.id;

              return (
                <div key={user.id} className="glass-panel rounded-3xl p-6 border border-white/5 group hover:border-[#ffffff]/20 transition-all duration-500 shadow-2xl relative overflow-hidden">
                  {/* Background Accents */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#ffffff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />

                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg transform group-hover:rotate-6 transition-transform"
                      style={{ 
                        background: `linear-gradient(135deg, ${user.avatarColor}, #000)`,
                        border: `2px solid ${user.avatarColor}44`
                      }}
                    >
                      {user.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-base font-orbitron tracking-tighter truncate">{user.name}</p>
                        {isCurrentUser && (
                          <span className="text-[9px] bg-[#ffffff]/20 text-[#ffffff] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Self</span>
                        )}
                      </div>
                      <p className="text-[#8888aa] text-xs font-mono truncate lowercase">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${roleColors[user.role]}`}>
                      <span>{roleIcons[user.role]}</span>
                      {user.role}
                    </span>
                    {isAdmin && !isCurrentUser && (
                      <button
                        onClick={() => openEdit(user)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-[#8888aa] hover:text-[#ffffff] hover:bg-[#ffffff]/10 transition-all border border-white/5"
                        title="Modificar Permisos"
                      >
                         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {dept && (
                    <div className="mb-6 flex items-center gap-2 p-2 px-3 rounded-xl bg-white/3 border border-white/5 w-fit">
                      <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: dept.color, color: dept.color }} />
                      <span className="text-[#8888aa] text-[10px] font-bold uppercase tracking-widest">{dept.name}</span>
                    </div>
                  )}

                  {/* Analytics */}
                  <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-6">
                    {[
                      { l: 'INICIO', v: stats.created, c: 'text-white' },
                      { l: 'ASIG', v: stats.assigned, c: 'text-gray-300' },
                      { l: 'SOLV', v: stats.resolved, c: 'text-[#aaaaaa]' },
                    ].map((s, i) => (
                      <div key={i} className="text-center group/stat">
                        <div className={`text-base font-black font-orbitron tracking-tighter ${s.c} group-hover/stat:scale-110 transition-transform`}>{s.v}</div>
                        <div className="text-[#8888aa] text-[8px] font-black uppercase tracking-[2px]">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border-white/10 rounded-3xl w-full max-w-md p-8 shadow-[0_0_60px_rgba(255,255,255,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-white font-black font-orbitron tracking-tighter uppercase text-xl">NUEVO <span className="text-white">OPERADOR</span></h3>
                <p className="text-[#8888aa] text-[10px] font-bold tracking-[3px] uppercase mt-1">Sincronización Supabase V4</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-2xl text-[#8888aa] hover:text-white transition group border border-white/5"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#ffffff] uppercase tracking-[3px] ml-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  placeholder="AGENT_NAME"
                  value={createData.name}
                  onChange={e => setCreateData({...createData, name: e.target.value})}
                  className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-xl px-4 py-4 text-white text-sm focus:outline-none focus:border-[#ffffff]/50 transition-all font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#ffffff] uppercase tracking-[3px] ml-1">Canal de Acceso (Email)</label>
                <input 
                  type="email" 
                  required
                  placeholder="ID@TZOMP.LAB"
                  value={createData.email}
                  onChange={e => setCreateData({...createData, email: e.target.value})}
                  className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-xl px-4 py-4 text-white text-sm focus:outline-none focus:border-[#ffffff]/50 transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#ffffff] uppercase tracking-[3px] ml-1">Rango Operativo</label>
                  <select 
                    value={createData.role}
                    onChange={e => setCreateData({...createData, role: e.target.value as User['role']})}
                    className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-xl px-4 py-4 text-white text-xs font-bold focus:outline-none focus:border-[#ffffff]/50 transition-all cursor-pointer uppercase tracking-widest font-rajdhani"
                  >
                    <option value="Cliente">CLIENTE</option>
                    <option value="Agente">AGENTE</option>
                    <option value="Admin">ADMIN</option>
                  </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-[#ffffff] uppercase tracking-[3px] ml-1">Sector (Opcional)</label>
                   <select 
                    value={createData.departmentId}
                    onChange={e => setCreateData({...createData, departmentId: e.target.value})}
                    className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-xl px-4 py-4 text-white text-xs font-bold focus:outline-none focus:border-[#ffffff]/50 transition-all cursor-pointer uppercase tracking-widest font-rajdhani"
                  >
                    <option value="">Global</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              {saveMsg && (
                <div className={`p-4 rounded-xl text-xs font-bold text-center tracking-widest uppercase ${saveMsg.includes('❌') ? 'bg-gray-600/10 text-gray-400 border border-gray-600/20' : 'bg-gray-400/10 text-gray-300 border border-gray-400/20'}`}>
                  {saveMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full btn-futuristic py-5 text-xs tracking-[3px] font-black group mt-4"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-[#030014]/30 border-t-[#030014] rounded-full animate-spin" />
                    INJECTING_PROFILE...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    CONSOLIDAR REGISTRO 
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border-white/10 rounded-3xl w-full max-w-sm p-8 shadow-2xl relative overflow-hidden">
            <h3 className="text-white font-black font-orbitron tracking-tighter uppercase text-xl mb-8 flex items-center gap-3">
              <span className="w-2 h-8 bg-gradient-to-b from-[#cccccc] to-[#ffffff]" />
              PERMISOS_SISTEMA
            </h3>

            <div className="flex items-center gap-4 mb-8 p-4 bg-white/3 rounded-3xl border border-white/5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black font-orbitron text-base shadow-xl"
                style={{ background: `linear-gradient(135deg, ${editingUser.avatarColor}, #000)` }}>
                {editingUser.initials}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate uppercase tracking-tighter">{editingUser.name}</p>
                <p className="text-[#8888aa] text-[10px] font-mono truncate">{editingUser.email}</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {(['Admin', 'Agente', 'Cliente'] as User['role'][]).map(role => (
                <button
                  key={role}
                  onClick={() => setNewRole(role)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left group ${
                    newRole === role
                      ? 'border-[#ffffff] bg-[#ffffff]/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                      : 'border-white/5 bg-white/2 hover:border-white/10'
                  }`}
                >
                  <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{roleIcons[role]}</span>
                  <div>
                    <p className={`text-sm font-black font-rajdhani tracking-[2px] uppercase ${newRole === role ? 'text-[#ffffff]' : 'text-white'}`}>{role}</p>
                    <p className="text-[#8888aa] text-[9px] font-bold uppercase tracking-wider mt-0.5">
                      {role === 'Admin' && 'NIVEL_ACCESO_MAX'}
                      {role === 'Agente' && 'SOPORTE_OPERATIVO'}
                      {role === 'Cliente' && 'SOLICITANTE_EXTERNO'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {saveMsg && (
              <div className={`mb-6 p-4 rounded-xl text-[10px] font-black uppercase text-center tracking-widest ${saveMsg.includes('❌') ? 'bg-gray-600/10 text-red-500 border border-gray-600/20' : 'bg-gray-400/10 text-gray-400 border border-gray-400/20'}`}>
                {saveMsg}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 py-4 glass-panel border border-white/10 text-[#8888aa] hover:text-white rounded-2xl text-[10px] font-black transition uppercase tracking-[2px]"
              >
                Abortar
              </button>
              <button
                onClick={saveRole}
                disabled={saving || newRole === editingUser.role}
                className="flex-1 py-4 btn-futuristic text-[10px] tracking-[2px] disabled:opacity-30 disabled:hover:scale-100"
              >
                {saving ? 'UPDATING...' : 'EJECUTAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
