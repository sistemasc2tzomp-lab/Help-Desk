import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Department } from '../types';

const PRESET_COLORS = [
  '#ffffff', '#eeeeee', '#cccccc', '#bbbbbb',
  '#aaaaaa', '#999999', '#777777', '#555555',
  '#444444', '#333333', '#222222', '#111111',
];

interface DeptFormData {
  name: string;
  description: string;
  color: string;
  jefe: string;
}

const defaultForm: DeptFormData = { name: '', description: '', color: '#ffffff', jefe: '' };

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className="glass-panel border border-white/5 rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-current transition-all duration-500 opacity-20" style={{ color }} />
      <div className="flex items-center justify-between">
        <span className="text-[#8888aa] text-[9px] font-black uppercase tracking-[3px] font-rajdhani">{label}</span>
        <div className="opacity-40 group-hover:opacity-100 transition-opacity" style={{ color }}>{icon}</div>
      </div>
      <span className="text-3xl font-black font-orbitron tracking-tighter" style={{ color }}>{value}</span>
    </div>
  );
}

export default function DepartmentsPage() {
  const { currentUser, departments, addDepartment, updateDepartment, deleteDepartment, tickets, users, userActivity } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeptFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[70vh] text-center space-y-8 bg-[#030014]">
        <div className="w-24 h-24 rounded-[32px] bg-gray-600/10 border-2 border-gray-600/30 flex items-center justify-center animate-pulse">
           <svg className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div>
          <h2 className="text-white text-3xl font-black font-orbitron tracking-widest mb-4">ACCESO DENEGADO</h2>
          <p className="text-[#8888aa] text-sm font-bold tracking-[3px] uppercase">Solo administradores pueden gestionar departamentos</p>
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (dept: Department) => {
    setForm({ name: dept.name, description: dept.description, color: dept.color, jefe: dept.jefe || '' });
    setEditingId(dept.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDepartment(editingId, { name: form.name, description: form.description, color: form.color, jefe: form.jefe });
      } else {
        await addDepartment({ name: form.name, description: form.description, color: form.color, jefe: form.jefe });
      }
      setShowForm(false);
      setForm(defaultForm);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDepartment(id);
    setConfirmDelete(null);
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const getTicketsForDept = (deptId: string) => tickets.filter(t => t.departmentId === deptId);
  const getUsersForDept = (deptId: string) => users.filter(u => u.departmentId === deptId);

  const totalTickets = tickets.length;
  const assigned = tickets.filter(t => t.departmentId).length;
  const unassigned = totalTickets - assigned;

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-10 min-h-screen bg-[#030014]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-orbitron tracking-tighter mb-2 uppercase">
            REPOSITORIO <span className="text-white">DEPARTAMENTAL</span>
          </h1>
          <p className="text-[#8888aa] text-sm font-rajdhani font-semibold tracking-[4px] uppercase">INVENTARIO OPERATIVO Y CONEXIÓN DE NODOS</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-futuristic flex items-center gap-3 px-8 py-4 text-[10px] tracking-[3px] group shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-all"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          NUEVO DEPARTAMENTO
        </button>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard label="DEPARTAMENTOS_ACTIVOS" value={departments.length} color="#ffffff" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} />
        <StatCard label="FLUJO_TOTAL" value={totalTickets} color="#cccccc" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} />
        <StatCard label="RECORRIDOS_OK" value={assigned} color="#aaaaaa" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
        <StatCard label="SIN_ALOCACIÓN" value={unassigned} color="#999999" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
      </div>

      {/* Control Unit */}
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full group">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ffffff]/40 group-focus-within:text-[#ffffff] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="ESCANEAR_DEPARTAMENTOS..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0f0a28]/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-700 text-sm font-mono focus:outline-none focus:border-[#ffffff]/50 transition-all"
          />
        </div>
      </div>

      {/* Grid of Sectors */}
      {filtered.length === 0 ? (
        <div className="glass-panel border-dashed border-2 border-white/5 rounded-[40px] py-32 text-center">
          <div className="text-6xl mb-8 opacity-20 filter grayscale">🏢</div>
          <h3 className="text-white font-black font-orbitron tracking-widest uppercase text-lg mb-2">Departamentos no localizados</h3>
          <p className="text-[#8888aa] text-[10px] font-bold tracking-[3px] uppercase">Inicia la instalación de un nuevo departamento operativo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(dept => {
            const deptTickets = getTicketsForDept(dept.id);
            const deptUsers = getUsersForDept(dept.id);
            const open = deptTickets.filter(t => t.status === 'Abierto').length;
            const inProgress = deptTickets.filter(t => t.status === 'En Progreso').length;
            const resolved = deptTickets.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
            const total = deptTickets.length;
            const onlineCount = deptUsers.filter(u => userActivity[u.id] && (Date.now() - new Date(userActivity[u.id]).getTime() < 300000)).length;

            return (
              <div key={dept.id} className="glass-panel border border-white/5 rounded-[40px] overflow-hidden group hover:border-[#ffffff]/20 transition-all duration-500 shadow-2xl relative">
                {/* Glow Background */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: dept.color }} />
                
                <div className="h-2 w-full transition-all duration-500 group-hover:h-3" style={{ backgroundColor: dept.color }} />

                <div className="p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-3xl flex items-center justify-center text-white font-black font-orbitron text-lg shadow-2xl"
                        style={{ background: `linear-gradient(135deg, ${dept.color}, #000)`, border: `2px solid ${dept.color}44` }}>
                        {dept.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-black font-orbitron tracking-tight text-xl uppercase group-hover:text-[#ffffff] transition-colors">{dept.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                           <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${onlineCount > 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-gray-600'}`} />
                              <span className="text-[#8888aa] text-[9px] font-black uppercase tracking-[1px]">{onlineCount} ONLINE</span>
                           </div>
                           <span className="text-white/10">|</span>
                           <span className="text-[#ffffff]/60 text-[10px] font-bold font-rajdhani uppercase tracking-tighter truncate max-w-[100px]">{dept.jefe || 'SIN_JEFE'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => openEdit(dept)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-2xl text-[#8888aa] hover:text-[#ffffff] transition-all border border-white/5 group/btn">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover/btn:rotate-12 transition-transform"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                       </button>
                       <button onClick={() => setConfirmDelete(dept.id)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-2xl text-[#8888aa] hover:text-[#999999] transition-all border border-white/5 group/btn">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover/btn:scale-110 transition-transform"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                       </button>
                    </div>
                  </div>

                  {dept.description && (
                    <p className="text-[#8888aa] text-sm font-rajdhani font-semibold mb-8 line-clamp-2 leading-relaxed italic border-l-2 border-white/5 pl-4">{dept.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { l: 'Abiertos', v: open, c: 'text-white', b: 'bg-white/10 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]' },
                      { l: 'En_Curso', v: inProgress, c: 'text-gray-300', b: 'bg-white/5 border-white/10 shadow-[0_0_10px_rgba(200,200,200,0.02)]' },
                      { l: 'Auditados', v: resolved, c: 'text-gray-500', b: 'bg-white/2 border-white/5' },
                    ].map((s, idx) => (
                      <div key={idx} className={`p-3 rounded-2xl border ${s.b} text-center flex flex-col items-center justify-center transition-all hover:scale-105`}>
                        <div className={`text-xl font-black font-orbitron tracking-tighter ${s.c}`}>{s.v}</div>
                        <div className="text-[#8888aa] text-[8px] font-black uppercase tracking-[2px]">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {total > 0 && (
                    <div className="mb-8 space-y-2">
                       <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[3px]">
                        <span className="text-[#8888aa]">{total} CLIENTES TOTAL</span>
                        <span className="text-[#ffffff]">{Math.round((resolved / total) * 100)}% COMPLETADO</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                        <div className="bg-gray-400 h-full transition-all duration-700" style={{ width: `${(open / total) * 100}%` }} />
                        <div className="bg-gray-500 h-full transition-all duration-700" style={{ width: `${(inProgress / total) * 100}%` }} />
                        <div className="bg-gray-600 h-full transition-all duration-700" style={{ width: `${(resolved / total) * 100}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3">
                       <div className="flex -space-x-2">
                         {deptUsers.slice(0, 3).map((u, i) => (
                           <div key={i} className="w-7 h-7 rounded-lg border-2 border-[#030014] flex items-center justify-center text-white text-[8px] font-black" style={{ backgroundColor: u.avatarColor }}>{u.initials}</div>
                         ))}
                         {deptUsers.length > 3 && <div className="w-7 h-7 rounded-lg border-2 border-[#030014] bg-white/5 flex items-center justify-center text-[#8888aa] text-[8px] font-black">+{deptUsers.length - 3}</div>}
                       </div>
                       <span className="text-[#8888aa] text-[10px] font-bold uppercase tracking-widest">{deptUsers.length} OPERADORES</span>
                    </div>
                    <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: dept.color, color: dept.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border-white/10 rounded-[40px] w-full max-w-lg p-10 shadow-[0_0_60px_rgba(255,255,255,0.05)] relative overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
              <div>
                <h3 className="text-white font-black font-orbitron tracking-tighter uppercase text-2xl">
                  {editingId ? 'ACTUALIZAR' : 'REGISTRAR'} <span className="text-white">DEPARTAMENTO</span>
                </h3>
                <p className="text-[#8888aa] text-[10px] font-bold tracking-[3px] uppercase mt-2">Protocolo de Configuración v4.2</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-[#8888aa] hover:text-[#999999] transition-all border border-white/5 group">
                <svg className="w-6 h-6 group-hover:rotate-90 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Nombre del Departamento</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ID_DEPT_NAME"
                  required
                  className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-6 py-5 text-white font-orbitron tracking-tight focus:outline-none focus:border-[#ffffff]/50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Bitácora Operativa (Descripción)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detalla las responsabilidades y el alcance de este departamento..."
                  rows={3}
                  className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-3xl px-6 py-6 text-[#8888aa] font-rajdhani font-semibold focus:outline-none focus:border-[#ffffff]/50 transition-all resize-none"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Encargado del Departamento</label>
                <input
                  type="text"
                  value={form.jefe}
                  onChange={e => setForm(f => ({ ...f, jefe: e.target.value }))}
                  placeholder="COMMAND_HEAD_ID"
                  className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-6 py-5 text-white font-rajdhani font-bold focus:outline-none focus:border-[#ffffff]/50 transition-all"
                />
              </div>

              <div className="space-y-5">
                <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Código de Color de Red</label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-10 h-10 rounded-xl transition-all border-2 flex items-center justify-center ${form.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    >
                       {form.color === c && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]" />}
                    </button>
                  ))}
                  <div className="w-10 h-10 rounded-xl border-2 border-white/5 bg-white/5 relative flex items-center justify-center group/color overflow-hidden">
                     <input
                      type="color"
                      value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="absolute inset-0 opacity-0 cursor-pointer scale-x-150 scale-y-150"
                    />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8888aa" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-5 border border-white/5 text-[#8888aa] hover:text-white rounded-2xl text-[10px] font-black transition-all uppercase tracking-[3px] bg-white/2 hover:bg-white/5"
                >
                  ABORTAR
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="flex-1 py-5 btn-futuristic text-[10px] font-black uppercase tracking-[3px] shadow-2xl"
                >
                  {saving ? 'SINCRONIZANDO...' : editingId ? 'REESCRÍBIR' : 'INSTALAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="glass-panel border-gray-600/20 rounded-[40px] w-full max-w-sm p-10 shadow-[0_0_100px_rgba(255,45,149,0.1)] relative overflow-hidden text-center">
            <div className="w-20 h-20 bg-gray-600/10 border-2 border-gray-600/30 rounded-[28px] flex items-center justify-center mx-auto mb-8 animate-pulse text-red-500">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <h3 className="text-white font-black font-orbitron tracking-widest uppercase text-xl mb-4">¿ELIMINAR DEPARTAMENTO?</h3>
            <p className="text-[#8888aa] text-sm font-rajdhani font-semibold mb-10 leading-relaxed uppercase tracking-tighter">
              Esta acción desvinculará todos los usuarios y solicitudes asignados. Perderás la integridad estructural de esta unidad.
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="w-full py-5 bg-red-600 hover:bg-gray-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[4px] transition-all"
              >
                CONFIRMAR PURGA
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="w-full py-5 border border-white/5 text-[#8888aa] hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[4px] bg-white/2"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
