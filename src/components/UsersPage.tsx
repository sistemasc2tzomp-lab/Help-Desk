import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../types';

const roleColors: Record<string, string> = {
  'Admin': 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  'Agente': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Cliente': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
};

const roleIcons: Record<string, string> = {
  'Admin': '🛡️',
  'Agente': '🎧',
  'Cliente': '👤',
};

export default function UsersPage() {
  const { users, tickets, departments, refreshData, loading, currentUser } = useApp();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<User['role']>('Cliente');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

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
      // Use "perfiles" table with "rol" column (real Supabase schema)
      const { error } = await sb
        .from('perfiles')
        .update({ rol: newRole })
        .eq('id', editingUser.id);
      if (error) {
        setSaveMsg('❌ Error: ' + error.message);
      } else {
        setSaveMsg('✅ Rol actualizado correctamente');
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

  const adminCount = users.filter(u => u.role === 'Admin').length;
  const agenteCount = users.filter(u => u.role === 'Agente').length;
  const clienteCount = users.filter(u => u.role === 'Cliente').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} usuarios registrados en el sistema</p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center gap-2 bg-[#1a1d2e] border border-white/10 hover:border-white/20 text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium transition"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Total</div>
          <div className="text-3xl font-bold text-white">{users.length}</div>
        </div>
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Admins</div>
          <div className="text-3xl font-bold text-indigo-400">{adminCount}</div>
        </div>
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Agentes</div>
          <div className="text-3xl font-bold text-blue-400">{agenteCount}</div>
        </div>
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Clientes</div>
          <div className="text-3xl font-bold text-emerald-400">{clienteCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">Todos los roles</option>
          <option value="Admin">Admin</option>
          <option value="Agente">Agente</option>
          <option value="Cliente">Cliente</option>
        </select>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>No se encontraron usuarios</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(user => {
            const stats = getUserStats(user.id);
            const dept = getDept(user.id);
            const isCurrentUser = user.id === currentUser?.id;

            return (
              <div key={user.id} className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: user.avatarColor }}
                    >
                      {user.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm">{user.name}</p>
                        {isCurrentUser && (
                          <span className="text-xs bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">Tú</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  {isAdmin && !isCurrentUser && (
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                      title="Cambiar rol"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Role badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                    <span>{roleIcons[user.role]}</span>
                    {user.role}
                  </span>
                  {dept && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-400 border border-white/5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                      {dept.name}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/3 rounded-lg p-2 text-center border border-white/5">
                    <div className="text-white font-bold text-sm">{stats.created}</div>
                    <div className="text-slate-500 text-xs">Creados</div>
                  </div>
                  <div className="bg-white/3 rounded-lg p-2 text-center border border-white/5">
                    <div className="text-blue-400 font-bold text-sm">{stats.assigned}</div>
                    <div className="text-slate-500 text-xs">Asignados</div>
                  </div>
                  <div className="bg-white/3 rounded-lg p-2 text-center border border-white/5">
                    <div className="text-emerald-400 font-bold text-sm">{stats.resolved}</div>
                    <div className="text-slate-500 text-xs">Resueltos</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">Cambiar Rol</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white transition">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-white/3 rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: editingUser.avatarColor }}>
                {editingUser.initials}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{editingUser.name}</p>
                <p className="text-slate-400 text-xs">{editingUser.email}</p>
              </div>
            </div>

            {/* Role options */}
            <div className="space-y-2 mb-6">
              {(['Admin', 'Agente', 'Cliente'] as User['role'][]).map(role => (
                <button
                  key={role}
                  onClick={() => setNewRole(role)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                    newRole === role
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/5 bg-white/3 hover:border-white/10'
                  }`}
                >
                  <span className="text-xl">{roleIcons[role]}</span>
                  <div>
                    <p className="text-white font-medium text-sm">{role}</p>
                    <p className="text-slate-400 text-xs">
                      {role === 'Admin' && 'Acceso completo al sistema'}
                      {role === 'Agente' && 'Gestiona y responde tickets'}
                      {role === 'Cliente' && 'Crea y sigue sus tickets'}
                    </p>
                  </div>
                  {newRole === role && (
                    <svg className="w-4 h-4 text-indigo-400 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
              ))}
            </div>

            {saveMsg && (
              <div className={`mb-4 p-3 rounded-lg text-sm text-center ${saveMsg.includes('❌') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {saveMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 py-2.5 border border-white/10 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveRole}
                disabled={saving || newRole === editingUser.role}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
