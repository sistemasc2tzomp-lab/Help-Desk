import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { pb } from '../lib/pocketbase';
import { User } from '../types';
import { Edit3, Trash2, Shield, User as UserIcon, Headset, CheckCircle, XCircle, Search, RefreshCcw, Plus } from 'lucide-react';

const roleColors: Record<string, string> = {
  'Admin': 'bg-white/10 text-white border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]',
  'Agente': 'bg-white/5 text-gray-300 border border-white/10 shadow-[0_0_10px_rgba(200,200,200,0.05)]',
  'Cliente': 'bg-white/2 text-gray-500 border border-white/5 shadow-[0_0_10px_rgba(150,150,150,0.02)]',
};

const roleIcons: Record<string, any> = {
  'Admin': Shield,
  'Agente': Headset,
  'Cliente': UserIcon,
};

export default function UsersPage() {
  const { users, tickets, departments, refreshData, loading, currentUser, createUser, updateUser, deleteUser } = useApp();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', role: 'Cliente' as User['role'], departmentId: '' });
  const [createData, setCreateData] = useState({ name: '', email: '', role: 'Cliente' as User['role'], departmentId: '', password: '' });

  const isAdmin = currentUser?.role === 'Admin';

  const getUserStats = (userId: string) => {
    const created = tickets.filter(t => t.createdById === userId).length;
    const assigned = tickets.filter(t => t.assignedToId === userId).length;
    const resolved = tickets.filter(
      t => t.assignedToId === userId && (t.status === 'Resuelto' || t.status === 'Cerrado')
    ).length;
    return { created, assigned, resolved };
  };

  const getDeptName = (deptId?: string) => {
    if (!deptId) return 'GLOBAL';
    return departments.find(d => d.id === deptId)?.name || 'DESCONOCIDO';
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    const res = await createUser(createData);
    if (res.success) {
      setSaveMsg('✅ Usuario creado en sistema central');
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateData({ name: '', email: '', role: 'Cliente', departmentId: '', password: '' });
        setSaveMsg('');
      }, 1500);
    } else {
      setSaveMsg('❌ ERROR: ' + (res.error || 'Fallo de red'));
    }
    setSaving(false);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      role: user.role,
      departmentId: user.departmentId || ''
    });
    setSaveMsg('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await updateUser(editingUser.id, editFormData);
      setSaveMsg('✅ PERFIL ACTUALIZADO CORRECTAMENTE');
      setTimeout(() => {
        setEditingUser(null);
        setSaveMsg('');
      }, 1200);
    } catch (err: any) {
      setSaveMsg('❌ ERROR: ' + err.message);
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
    <div className="p-8 space-y-10 fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter font-orbitron uppercase">GESTIÓN DE USUARIOS</h2>
          <p className="text-zinc-500 font-medium mt-1 uppercase text-xs tracking-[3px]">Control de personal, rangos operativos y autorizaciones de red.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => refreshData(true)}
            className="p-4 bg-white/2 rounded-2xl border border-white/5 text-zinc-500 hover:text-white transition-all"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {isAdmin && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-black px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-[3px] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              <Plus size={18} />
              NUEVO OPERADOR
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Usuarios_Red', val: users.length, icon: UserIcon },
          { label: 'Administradores', val: users.filter(u => u.role === 'Admin').length, icon: Shield },
          { label: 'Agentes_Soporte', val: users.filter(u => u.role === 'Agente').length, icon: Headset },
          { label: 'Clientes_Activos', val: users.filter(u => u.role === 'Cliente').length, icon: UserIcon },
        ].map((kpi, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-[2.5rem] border-white/5 bg-white/2 space-y-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">{kpi.label}</span>
            <div className="text-3xl font-black text-white font-orbitron">{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="text-zinc-600 group-focus-within:text-white transition-colors" size={20} />
        </div>
        <input 
          type="text"
          placeholder="BUSCAR_POR_NOMBRE_O_CORREO..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/2 border border-white/5 rounded-[2.5rem] pl-16 pr-8 py-6 text-white text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-white/20 transition-all placeholder-zinc-700 font-mono"
        />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filtered.map(user => {
          const stats = getUserStats(user.id);
          const Icon = roleIcons[user.role] || UserIcon;
          const isMe = user.id === currentUser?.id;

          return (
            <div key={user.id} className="glass-panel rounded-[3rem] border-white/5 overflow-hidden group hover:bg-white/5 transition-all duration-500 flex flex-col pt-8">
              <div className="px-8 flex-1 space-y-6 pb-6">
                <div className="flex justify-between items-start">
                   <div 
                    className="w-16 h-16 rounded-3xl flex items-center justify-center text-white font-black text-xl shadow-2xl transition-transform group-hover:rotate-6"
                    style={{ background: `linear-gradient(135deg, ${user.avatarColor}, #000)`, border: `2px solid ${user.avatarColor}44` }}
                   >
                     {user.initials}
                   </div>
                   <div className="flex gap-2">
                      {isAdmin && !isMe && (
                        <>
                          <button onClick={() => openEdit(user)} className="p-3 bg-white/5 rounded-2xl border border-white/5 text-zinc-400 hover:text-white transition-all"><Edit3 size={14}/></button>
                          <button onClick={() => { if(confirm('¿Eliminar usuario permanentemente?')) deleteUser(user.id); }} className="p-3 bg-red-500/10 rounded-2xl border border-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"><Trash2 size={14}/></button>
                        </>
                      )}
                      {isMe && <span className="bg-white/10 text-[8px] font-black text-white px-3 py-1 rounded-full uppercase tracking-widest h-fit">MI_PERFIL</span>}
                   </div>
                </div>

                <div>
                   <h3 className="text-lg font-black text-white uppercase tracking-tighter truncate">{user.name}</h3>
                   <p className="text-[10px] font-mono text-zinc-600 truncate">{user.email}</p>
                </div>

                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-xl flex items-center gap-2 ${roleColors[user.role]}`}>
                      <Icon size={12}/>
                      <span className="text-[9px] font-black uppercase tracking-widest font-rajdhani">{user.role}</span>
                   </div>
                   <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{getDeptName(user.departmentId)}</div>
                </div>

                {/* Micro Stats */}
                <div className="grid grid-cols-3 gap-2 pt-4">
                  {[
                    { l: 'SOLICIT', v: stats.created },
                    { l: 'ASIGN', v: stats.assigned },
                    { l: 'SOLV', v: stats.resolved },
                  ].map((s, i) => (
                    <div key={i} className="text-center bg-white/2 rounded-2xl p-2 border border-white/5">
                      <div className="text-white font-black text-sm font-orbitron">{s.v}</div>
                      <div className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="glass-panel border-white/10 p-10 rounded-[3rem] w-full max-w-lg relative z-10 space-y-8 shadow-2xl">
              <h3 className="text-2xl font-black font-orbitron text-white tracking-[3px] uppercase">CONFIG_PERFIL</h3>
              <form onSubmit={handleUpdate} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      required 
                      value={editFormData.name}
                      onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-white/30 transition-all font-bold"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Rango Operativo</label>
                       <select 
                        value={editFormData.role}
                        onChange={e => setEditFormData({...editFormData, role: e.target.value as User['role']})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-xs font-black uppercase tracking-widest focus:outline-none"
                       >
                         <option value="Admin">ADMIN</option>
                         <option value="Agente">AGENTE</option>
                         <option value="Cliente">CLIENTE</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Departamento</label>
                       <select 
                        value={editFormData.departmentId}
                        onChange={e => setEditFormData({...editFormData, departmentId: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-xs font-black uppercase tracking-widest focus:outline-none"
                       >
                         <option value="">GLOBAL</option>
                         {departments.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                       </select>
                    </div>
                 </div>

                 {saveMsg && (
                    <div className={`p-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest ${saveMsg.includes('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                      {saveMsg}
                    </div>
                 )}

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[3px] hover:text-white transition-colors">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex-1 bg-white text-black px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[3px] hover:bg-zinc-200 transition-all">
                      {saving ? 'GUARDANDO...' : 'ACTUALIZAR_DATOS'}
                    </button>
                 </div>
              </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL (NEW OPERATOR) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="glass-panel border-white/10 p-10 rounded-[3rem] w-full max-w-lg relative z-10 space-y-8 shadow-2xl">
              <h3 className="text-2xl font-black font-orbitron text-white tracking-[3px] uppercase">NUEVO_OPERADOR</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre</label>
                    <input type="text" required value={createData.name} onChange={e => setCreateData({...createData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-white text-xs focus:outline-none font-bold" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Acceso</label>
                    <input type="email" required value={createData.email} onChange={e => setCreateData({...createData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-white text-xs focus:outline-none font-bold" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Contraseña Provisoria</label>
                    <input type="password" required value={createData.password} onChange={e => setCreateData({...createData, password: e.target.value})} placeholder="Mín. 8 caracteres" className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-white text-xs focus:outline-none font-bold" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Rango</label>
                       <select value={createData.role} onChange={e => setCreateData({...createData, role: e.target.value as User['role']})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-white text-[10px] font-black uppercase focus:outline-none">
                         <option value="Cliente">CLIENTE</option>
                         <option value="Agente">AGENTE</option>
                         <option value="Admin">ADMIN</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Depto</label>
                       <select value={createData.departmentId} onChange={e => setCreateData({...createData, departmentId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-white text-[10px] font-black uppercase focus:outline-none">
                         <option value="">GLOBAL</option>
                         {departments.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                       </select>
                    </div>
                 </div>
                 <button type="submit" disabled={saving} className="w-full bg-white text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-[3px] mt-4 shadow-xl">
                   {saving ? 'REGISTRANDO...' : 'DAR_DE_ALTA'}
                 </button>
              </form>
          </div>
        </div>
      )}
    </div>
  );
}
