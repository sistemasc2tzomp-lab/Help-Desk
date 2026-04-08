import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, TicketStatus } from '../types';
import { formatDistanceToNow } from '../utils/date';

const statusColors: Record<TicketStatus, string> = {
  'Abierto': 'bg-cyan-500/10 text-[#00f0ff] border border-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]',
  'En Progreso': 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(123,47,255,0.1)]',
  'Resuelto': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
  'Cerrado': 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

const priorityColors: Record<string, string> = {
  'Urgente': 'text-pink-400 border-pink-500/30 bg-pink-500/10 shadow-[0_0_10px_rgba(255,45,149,0.1)]',
  'Alta': 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  'Media': 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  'Baja': 'text-slate-400 border-slate-500/30 bg-slate-500/10',
};

export default function TicketList() {
  const { tickets, currentUser, setPage, setSelectedTicketId, departments, loading, refreshData } = useApp();
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
    <div className="p-6 sm:p-10 space-y-10 max-w-7xl mx-auto min-h-screen bg-[var(--bg-void)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-[var(--text)] font-orbitron tracking-tighter mb-2 uppercase">
            HISTORICO <span className="text-[var(--text)]">SOLICITUDES</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm font-rajdhani font-semibold tracking-[4px] uppercase flex items-center gap-2">
            REGISTRO DE SOLICITUDES // {sorted.length} ENTRADAS LOCALIZADAS
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 glass-panel border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] text-[var(--text-muted)] hover:text-[var(--text)] px-5 py-3 rounded-2xl text-[10px] font-bold tracking-[2px] transition uppercase"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Sincronizar
          </button>
          <button
            onClick={() => setPage('new-ticket')}
            className="btn-futuristic flex items-center gap-3 px-6 py-4 text-[10px] tracking-[2px] group"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform duration-500">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            NUEVA SOLICITUD
          </button>
        </div>
      </div>

      {/* Filters Control Unit */}
      <div className="glass-panel rounded-3xl p-6 border border-[var(--glass-border)]">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--text)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="ESCANEAR_BASES_DE_DATOS..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-2xl pl-12 pr-4 py-4 text-[var(--text)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--glass-border-hover)] transition-all font-mono"
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 lg:min-w-[180px] bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-2xl px-5 py-4 text-[var(--text)] text-[10px] font-bold font-rajdhani tracking-[2px] uppercase focus:outline-none focus:border-[var(--glass-border-hover)] cursor-pointer transition-all"
            >
              <option value="all">TODOS LOS ESTADOS</option>
              <option value="Abierto">ABIERTO</option>
              <option value="En Progreso">EN PROGRESO</option>
              <option value="Resuelto">RESUELTO</option>
              <option value="Cerrado">CERRADO</option>
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="flex-1 lg:min-w-[180px] bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-2xl px-5 py-4 text-[var(--text)] text-[10px] font-bold font-rajdhani tracking-[2px] uppercase focus:outline-none focus:border-[var(--glass-border-hover)] cursor-pointer transition-all"
            >
              <option value="all">TODAS LAS PRIORIDADES</option>
              <option value="Urgente">URGENTE</option>
              <option value="Alta">ALTA</option>
              <option value="Media">MEDIA</option>
              <option value="Baja">BAJA</option>
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="px-4 py-4 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-[10px] font-black uppercase tracking-[2px] underline underline-offset-4 decoration-[var(--text-muted)] shrink-0">
                PURGAR_FILTROS
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Stream Grupped by Department */}
      {sorted.length === 0 ? (
        <div className="glass-panel border-dashed border-2 border-[var(--glass-border)] rounded-[40px] py-32 text-center">
          <div className="text-6xl mb-8 opacity-20 filter grayscale">🎫</div>
          <h3 className="text-[var(--text)] font-black font-orbitron tracking-widest uppercase text-lg mb-2">Sin transmisiones activas</h3>
          <p className="text-[var(--text-muted)] text-[10px] font-bold tracking-[3px] uppercase">
            {hasFilters ? 'Reconfigura los parámetros de búsqueda' : 'Registra la primera solicitud en el sistema'}
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(
            sorted.reduce((acc, ticket) => {
              const deptName = ticket.departmentId ? deptMap[ticket.departmentId] || 'GENÉRICO' : 'GENÉRICO';
              if (!acc[deptName]) acc[deptName] = [];
              acc[deptName].push(ticket);
              return acc;
            }, {} as Record<string, Ticket[]>)
          ).map(([deptName, deptTickets]) => (
            <div key={deptName} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px bg-[var(--glass-border)] flex-1"></div>
                <h2 className="text-[var(--text)] font-orbitron font-bold tracking-[4px] uppercase flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.5)]"></span>
                  {deptName} <span className="text-[var(--text-muted)] text-[10px] ml-2 font-mono">[{deptTickets.length}]</span>
                </h2>
                <div className="h-px bg-[var(--glass-border)] flex-1"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {deptTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => handleTicketClick(ticket)}
                    className="glass-panel border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] group relative"
                  >
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="text-[var(--text)] text-lg font-bold font-orbitron tracking-tight flex-1 uppercase group-hover:text-[#00f0ff] transition-colors line-clamp-2">
                        {ticket.title}
                      </div>
                      <span className={`shrink-0 inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${statusColors[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </div>
                    
                    <div className="text-[var(--text-muted)] text-[10px] font-mono flex flex-wrap gap-x-4 gap-y-2 mb-6">
                      <span className="text-[var(--text-secondary)] py-1 px-2 bg-[var(--glass)] rounded border border-[var(--glass-border)] font-bold">FOL: {ticket.folio || ticket.id.slice(0, 8)}</span>
                      <span className={`font-bold tracking-widest uppercase ${priorityColors[ticket.priority].split(' ')[0]}`}>{ticket.priority}</span>
                      <span className="text-[var(--text-muted)] truncate max-w-[150px]">{ticket.category.toUpperCase()}</span>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
                      <div className="flex flex-col gap-1">
                        <span className="text-[var(--text)] font-mono text-[10px] uppercase font-bold">{formatDistanceToNow(ticket.createdAt)}</span>
                        {ticket.assignedToName && (
                           <div className="flex items-center gap-2">
                             <span className="text-[9px] text-[var(--text-muted)] font-bold tracking-widest">OP:</span>
                             <span className="text-[#00f0ff] text-[9px] font-bold uppercase tracking-widest">{ticket.assignedToName}</span>
                           </div>
                        )}
                      </div>
                      {ticket.messages.length > 0 && (
                        <span className="text-[var(--text)] text-[9px] font-black uppercase tracking-[2px] bg-[var(--glass)] px-3 py-2 rounded-lg border border-[var(--glass-border)] group-hover:bg-[var(--glass-border)] transition-colors flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                          {ticket.messages.length}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
