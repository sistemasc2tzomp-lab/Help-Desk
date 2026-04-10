import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Plus, Search, Edit3, Trash2, Users, FileText, CheckCircle2 } from 'lucide-react';
import { Department } from '../types';

export default function DepartmentsPage() {
  const { departments, addDepartment, updateDepartment, deleteDepartment, users, loading } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description,
      color: dept.color
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept) {
      await updateDepartment(editingDept.id, formData);
    } else {
      await addDepartment(formData);
    }
    setShowAddModal(false);
    setEditingDept(null);
    setFormData({ name: '', description: '', color: '#3b82f6' });
  };

  const filteredDepts = departments.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-10 fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-white tracking-tighter font-orbitron uppercase">DEPARTAMENTOS</h2>
          <p className="text-zinc-500 font-medium mt-1 uppercase text-xs tracking-widest">Gestión de unidades administrativas y nodos de red.</p>
        </div>
        <button 
          onClick={() => { setEditingDept(null); setShowAddModal(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-[3px] flex items-center gap-3 transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 border border-indigo-400/30"
        >
          <Plus size={18} />
          Nuevo Departamento
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Unidades Activas', value: departments.length, icon: Building2, color: 'text-indigo-400' },
          { label: 'Flujo Total', value: '---', icon: Users, color: 'text-cyan-400' },
          { label: 'Recorridos_OK', value: '100%', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Sin_Alocación', value: '0', icon: FileText, color: 'text-zinc-500' }
        ].map((kpi, i) => (
          <div key={i} className="glass-panel p-6 rounded-[2.5rem] border-white/5 bg-white/2 space-y-2">
             <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{kpi.label}</span>
                <kpi.icon size={14} className={kpi.color} />
             </div>
             <div className="text-3xl font-black text-white font-orbitron">{kpi.value}</div>
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
          placeholder="ESCANEAR_DEPARTAMENTOS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/2 border border-white/5 rounded-[2.5rem] pl-16 pr-8 py-6 text-white text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-white/20 transition-all placeholder-zinc-700"
        />
      </div>

      {/* Dept Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xxl:grid-cols-3 gap-8 text-white">
        {filteredDepts.map((dept) => {
          const deptUsers = users.filter(u => u.departmentId === dept.id);
          return (
            <div key={dept.id} className="glass-panel rounded-[3rem] border-white/5 overflow-hidden group hover:bg-white/5 transition-all duration-500 flex flex-col">
              <div className="p-8 space-y-6 flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black shadow-2xl" style={{ backgroundColor: `${dept.color}20`, color: dept.color, border: `1px solid ${dept.color}40` }}>
                      {dept.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter leading-tight max-w-[180px]">{dept.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">ONLINE_ACTIVO</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenEdit(dept)}
                      className="p-3 bg-white/5 rounded-2xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => { if(confirm('¿ELIMINAR DEPARTAMENTO? Esta acción es irreversible.')) deleteDepartment(dept.id); }}
                      className="p-3 bg-red-500/10 rounded-2xl border border-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-zinc-500 text-xs font-medium leading-relaxed uppercase tracking-tight italic">
                   {dept.description || 'Sin descripción detallada asignada.'}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-4">
                  {[
                    { l: 'ABIERTOS', v: '0', icon: Plus },
                    { l: 'EN_CURSO', v: '0', icon: Search },
                    { l: 'AUDITADOS', v: '0', icon: CheckCircle2 }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white/2 rounded-2xl p-3 border border-white/5 text-center space-y-1">
                      <div className="text-white font-black text-lg">{stat.v}</div>
                      <div className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">{stat.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/2 p-6 flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-[#030014] bg-zinc-800" />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{deptUsers.length} OPERADORES</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
           <div className="glass-panel border-white/10 p-10 rounded-[3rem] w-full max-w-lg relative z-10 space-y-8 shadow-2xl">
              <h3 className="text-2xl font-black font-orbitron text-white tracking-[3px] uppercase">
                {editingDept ? 'EDITAR NODO' : 'NUEVO NODO'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre del Departamento</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Escriba nombre..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-white/30 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Descripción Operativa</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Descripción de funciones..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-white/30 transition-all font-bold resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Color de Identidad</label>
                  <div className="flex gap-3">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'].map(c => (
                      <button 
                        key={c}
                        type="button" 
                        onClick={() => setFormData({...formData, color: c})}
                        className={`w-10 h-10 rounded-xl transition-all ${formData.color === c ? 'scale-125 ring-2 ring-white border-2 border-transparent' : 'opacity-40 hover:opacity-100'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[3px] hover:text-white transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 bg-white text-black px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[3px] hover:bg-zinc-200 transition-all">
                    {editingDept ? 'GUARDAR_CAMBIOS' : 'INSTALAR_NODO'}
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
