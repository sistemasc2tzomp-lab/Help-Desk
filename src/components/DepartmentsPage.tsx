import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Department } from '../types';

const PRESET_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#DC2626',
  '#D97706', '#0891B2', '#DB2777', '#65A30D',
  '#9333EA', '#EA580C', '#0284C7', '#16A34A',
];

interface DeptFormData {
  name: string;
  description: string;
  color: string;
  jefe: string;
}

const defaultForm: DeptFormData = { name: '', description: '', color: '#7C3AED', jefe: '' };

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5 flex flex-col gap-1">
      <span className="text-slate-400 text-xs uppercase tracking-widest">{label}</span>
      <span className="text-3xl font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export default function DepartmentsPage() {
  const { currentUser, departments, addDepartment, updateDepartment, deleteDepartment, tickets, users } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeptFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Acceso Restringido</h2>
          <p className="text-slate-400">Solo los administradores pueden gestionar departamentos.</p>
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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Departamentos</h1>
          <p className="text-slate-400 text-sm mt-1">Gestiona los departamentos de soporte técnico</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Departamento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Departamentos" value={departments.length} color="#7C3AED" />
        <StatCard label="Total Tickets" value={totalTickets} color="#2563EB" />
        <StatCard label="Tickets Asignados" value={assigned} color="#059669" />
        <StatCard label="Sin Departamento" value={unassigned} color="#D97706" />
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          type="text"
          placeholder="Buscar departamentos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Department Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">
            {search ? 'Sin resultados' : 'Sin departamentos'}
          </h3>
          <p className="text-slate-400 text-sm">
            {search ? 'Intenta con otro término.' : 'Crea tu primer departamento con el botón "Nuevo Departamento".'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(dept => {
            const deptTickets = getTicketsForDept(dept.id);
            const deptUsers = getUsersForDept(dept.id);
            const open = deptTickets.filter(t => t.status === 'Abierto').length;
            const inProgress = deptTickets.filter(t => t.status === 'En Progreso').length;
            const resolved = deptTickets.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
            const total = deptTickets.length;

            return (
              <div key={dept.id} className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all">
                {/* Color bar */}
                <div className="h-1.5 w-full" style={{ backgroundColor: dept.color }} />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: dept.color + '30', color: dept.color }}>
                        {dept.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{dept.name}</h3>
                        {dept.jefe && (
                          <p className="text-xs text-slate-400">👤 {dept.jefe}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(dept)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(dept.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {dept.description && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{dept.description}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-amber-500/10 rounded-lg p-2 text-center">
                      <div className="text-amber-400 font-bold text-lg">{open}</div>
                      <div className="text-slate-500 text-xs">Abiertos</div>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                      <div className="text-blue-400 font-bold text-lg">{inProgress}</div>
                      <div className="text-slate-500 text-xs">En Prog.</div>
                    </div>
                    <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                      <div className="text-emerald-400 font-bold text-lg">{resolved}</div>
                      <div className="text-slate-500 text-xs">Resueltos</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{total} tickets total</span>
                        <span>{Math.round((resolved / total) * 100)}% resuelto</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                        <div className="bg-amber-500 h-full" style={{ width: `${(open / total) * 100}%` }} />
                        <div className="bg-blue-500 h-full" style={{ width: `${(inProgress / total) * 100}%` }} />
                        <div className="bg-emerald-500 h-full" style={{ width: `${(resolved / total) * 100}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      {deptUsers.length} miembro{deptUsers.length !== 1 ? 's' : ''}
                    </div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-white font-bold text-lg">
                {editingId ? 'Editar Departamento' : 'Nuevo Departamento'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nombre del Departamento *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Soporte Técnico"
                  required
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe las funciones de este departamento..."
                  rows={3}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Jefe */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Responsable / Jefe
                </label>
                <input
                  type="text"
                  value={form.jefe}
                  onChange={e => setForm(f => ({ ...f, jefe: e.target.value }))}
                  placeholder="Nombre del responsable"
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-all border-2"
                      style={{
                        backgroundColor: c,
                        borderColor: form.color === c ? 'white' : 'transparent',
                        transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: form.color }} />
                    <span className="text-slate-300 text-sm font-mono">{form.color}</span>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-[#0f1117] rounded-xl p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-2">Vista previa:</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: form.color + '30', color: form.color }}>
                    {(form.name || 'DP').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{form.name || 'Nombre del Departamento'}</p>
                    {form.jefe && <p className="text-slate-400 text-xs">👤 {form.jefe}</p>}
                  </div>
                  <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: form.color }} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 rounded-xl text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Departamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h3 className="text-white font-bold text-center mb-2">¿Eliminar departamento?</h3>
            <p className="text-slate-400 text-sm text-center mb-6">
              Esta acción no se puede deshacer. Los tickets asignados quedarán sin departamento.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-white/10 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
