import React from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, TicketStatus } from '../types';
import { formatDistanceToNow } from '../utils/date';

const statusColors: Record<TicketStatus, string> = {
  'Abierto': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'En Progreso': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  'Resuelto': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  'Cerrado': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const priorityColors: Record<string, string> = {
  'Urgente': 'text-red-400',
  'Alta': 'text-orange-400',
  'Media': 'text-yellow-400',
  'Baja': 'text-slate-400',
};

const StatCard = ({ label, value, icon, color, sub }: {
  label: string; value: number; icon: React.ReactNode; color: string; sub?: string
}) => (
  <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <div className="text-xl sm:text-2xl font-bold text-white">{value}</div>
      <div className="text-slate-400 text-xs sm:text-sm">{label}</div>
      {sub && <div className="text-slate-600 text-xs">{sub}</div>}
    </div>
  </div>
);

export default function Dashboard() {
  const { tickets, currentUser, setPage, setSelectedTicketId, departments } = useApp();

  const filteredTickets = currentUser?.role === 'Cliente'
    ? tickets.filter(t => t.createdById === currentUser.id)
    : tickets;

  const stats = {
    total: filteredTickets.length,
    open: filteredTickets.filter(t => t.status === 'Abierto').length,
    inProgress: filteredTickets.filter(t => t.status === 'En Progreso').length,
    resolved: filteredTickets.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length,
  };

  const recentTickets = [...filteredTickets]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
    setPage('ticket-detail');
  };

  // Chart data
  const byStatus = [
    { label: 'Abiertos', count: stats.open, color: '#3b82f6' },
    { label: 'En Progreso', count: stats.inProgress, color: '#eab308' },
    { label: 'Resueltos', count: stats.resolved, color: '#10b981' },
  ];
  const maxCount = Math.max(...byStatus.map(s => s.count), 1);

  const byPriority = [
    { label: 'Urgente', count: filteredTickets.filter(t => t.priority === 'Urgente').length, color: '#ef4444' },
    { label: 'Alta', count: filteredTickets.filter(t => t.priority === 'Alta').length, color: '#f97316' },
    { label: 'Media', count: filteredTickets.filter(t => t.priority === 'Media').length, color: '#eab308' },
    { label: 'Baja', count: filteredTickets.filter(t => t.priority === 'Baja').length, color: '#64748b' },
  ];
  const maxPriority = Math.max(...byPriority.map(p => p.count), 1);

  const deptMap: Record<string, string> = {};
  departments.forEach(d => { deptMap[d.id] = d.name; });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Bienvenido, <span className="text-indigo-400 font-medium">{currentUser?.name}</span>
          </p>
        </div>
        <button
          onClick={() => setPage('new-ticket')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition self-start sm:self-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total" value={stats.total} color="bg-indigo-500/20"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>}
        />
        <StatCard label="Abiertos" value={stats.open} color="bg-blue-500/20"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
        <StatCard label="En Progreso" value={stats.inProgress} color="bg-yellow-500/20"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
        />
        <StatCard label="Resueltos" value={stats.resolved} color="bg-emerald-500/20"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Status */}
        <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-4 sm:p-5">
          <h3 className="text-white font-semibold mb-4 text-sm sm:text-base">Distribución por Estado</h3>
          <div className="space-y-3">
            {byStatus.map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="text-white font-medium">{s.count}</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(s.count / maxCount) * 100}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-4 sm:p-5">
          <h3 className="text-white font-semibold mb-4 text-sm sm:text-base">Distribución por Prioridad</h3>
          <div className="space-y-3">
            {byPriority.map(p => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{p.label}</span>
                  <span className="text-white font-medium">{p.count}</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(p.count / maxPriority) * 100}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-[#1a1d27] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm sm:text-base">Tickets Recientes</h3>
          <button
            onClick={() => setPage('tickets')}
            className="text-indigo-400 hover:text-indigo-300 text-xs sm:text-sm font-medium transition"
          >
            Ver todos →
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🎫</div>
            <p className="text-slate-400 text-sm">No hay tickets aún</p>
            <button onClick={() => setPage('new-ticket')} className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition">
              Crear primer ticket →
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs text-slate-500 font-medium px-6 py-3 uppercase tracking-wider">Título</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 uppercase tracking-wider">Estado</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 uppercase tracking-wider">Prioridad</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 uppercase tracking-wider hidden lg:table-cell">Departamento</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 uppercase tracking-wider">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentTickets.map(ticket => (
                    <tr
                      key={ticket.id}
                      onClick={() => handleTicketClick(ticket)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="text-white text-sm font-medium truncate max-w-[250px]">{ticket.title}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{ticket.category}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-lg font-medium ${statusColors[ticket.status]}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-medium ${priorityColors[ticket.priority]}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-slate-400 text-xs">
                          {ticket.departmentId ? deptMap[ticket.departmentId] || '—' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-500 text-xs">{formatDistanceToNow(ticket.updatedAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-white/5">
              {recentTickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => handleTicketClick(ticket)}
                  className="w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-white text-sm font-medium line-clamp-2 flex-1">{ticket.title}</span>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-lg font-medium shrink-0 ${statusColors[ticket.status]}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-medium ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500">{ticket.category}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500">{formatDistanceToNow(ticket.updatedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
