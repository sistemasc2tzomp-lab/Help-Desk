import { useState } from 'react';
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
  'Urgente': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'Alta': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  'Media': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  'Baja': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const priorityDot: Record<string, string> = {
  'Urgente': 'bg-red-400',
  'Alta': 'bg-orange-400',
  'Media': 'bg-yellow-400',
  'Baja': 'bg-slate-400',
};

export default function TicketList() {
  const { tickets, currentUser, setPage, setSelectedTicketId, departments } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const deptMap: Record<string, string> = {};
  departments.forEach(d => { deptMap[d.id] = d.name; });

  const baseTickets = currentUser?.role === 'Cliente'
    ? tickets.filter(t => t.createdById === currentUser.id)
    : tickets;

  const filtered = baseTickets.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
    setPage('ticket-detail');
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const hasFilters = search || statusFilter !== 'all' || priorityFilter !== 'all';

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Tickets</h1>
          <p className="text-slate-400 text-sm mt-1">
            {sorted.length} ticket{sorted.length !== 1 ? 's' : ''}
            {hasFilters ? ' (filtrados)' : ''}
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

      {/* Filters */}
      <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar tickets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#0f1117] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition min-w-[140px]"
          >
            <option value="all">Todos los estados</option>
            <option value="Abierto">Abierto</option>
            <option value="En Progreso">En Progreso</option>
            <option value="Resuelto">Resuelto</option>
            <option value="Cerrado">Cerrado</option>
          </select>
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition min-w-[150px]"
          >
            <option value="all">Todas las prioridades</option>
            <option value="Urgente">Urgente</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-slate-400 hover:text-white text-sm transition px-2 shrink-0">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Ticket List */}
      {sorted.length === 0 ? (
        <div className="bg-[#1a1d27] border border-white/5 rounded-2xl py-16 text-center">
          <div className="text-5xl mb-4">🎫</div>
          <p className="text-white font-medium mb-1">No se encontraron tickets</p>
          <p className="text-slate-400 text-sm mb-4">
            {hasFilters ? 'Intenta cambiar los filtros' : 'Crea tu primer ticket de soporte'}
          </p>
          {!hasFilters && (
            <button
              onClick={() => setPage('new-ticket')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              Nuevo Ticket
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-[#1a1d27] border border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs text-slate-500 font-semibold px-6 py-3 uppercase tracking-wider">Ticket</th>
                    <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3 uppercase tracking-wider">Estado</th>
                    <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3 uppercase tracking-wider">Prioridad</th>
                    <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3 uppercase tracking-wider hidden lg:table-cell">Departamento</th>
                    <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3 uppercase tracking-wider hidden lg:table-cell">Asignado a</th>
                    <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sorted.map(ticket => (
                    <tr
                      key={ticket.id}
                      onClick={() => handleTicketClick(ticket)}
                      className="hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="text-white text-sm font-medium group-hover:text-indigo-300 transition truncate max-w-[260px]">
                          {ticket.title}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-2">
                          <span>{ticket.category}</span>
                          {ticket.messages.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{ticket.messages.length} mensaje{ticket.messages.length !== 1 ? 's' : ''}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex text-xs px-2.5 py-1 rounded-lg font-medium ${statusColors[ticket.status]}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ${priorityColors[ticket.priority]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[ticket.priority]}`} />
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-slate-400 text-xs">
                          {ticket.departmentId ? deptMap[ticket.departmentId] || '—' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {ticket.assignedToName ? (
                          <span className="text-slate-300 text-xs">{ticket.assignedToName}</span>
                        ) : (
                          <span className="text-slate-600 text-xs italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-500 text-xs">{formatDistanceToNow(ticket.createdAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {sorted.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => handleTicketClick(ticket)}
                className="w-full text-left bg-[#1a1d27] border border-white/5 rounded-2xl p-4 hover:border-indigo-500/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-white text-sm font-medium line-clamp-2 flex-1">{ticket.title}</span>
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-lg font-medium shrink-0 ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${priorityColors[ticket.priority]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[ticket.priority]}`} />
                    {ticket.priority}
                  </span>
                  <span className="text-slate-500">{ticket.category}</span>
                  {ticket.departmentId && deptMap[ticket.departmentId] && (
                    <span className="text-slate-500">• {deptMap[ticket.departmentId]}</span>
                  )}
                  <span className="text-slate-600 ml-auto">{formatDistanceToNow(ticket.createdAt)}</span>
                </div>
                {ticket.assignedToName && (
                  <div className="mt-1.5 text-xs text-slate-500">
                    Asignado: <span className="text-slate-400">{ticket.assignedToName}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
