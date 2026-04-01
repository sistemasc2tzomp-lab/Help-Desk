import React from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, TicketStatus } from '../types';
import { formatDistanceToNow } from '../utils/date';

const statusColors: Record<TicketStatus, string> = {
  'Abierto': 'bg-white/10 text-white border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]',
  'En Progreso': 'bg-white/5 text-gray-300 border border-white/10 shadow-[0_0_10px_rgba(200,200,200,0.05)]',
  'Resuelto': 'bg-white/20 text-white border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.15)]',
  'Cerrado': 'bg-white/2 text-gray-500 border border-white/5',
};

const priorityColors: Record<string, string> = {
  'Urgente': 'text-white font-black',
  'Alta': 'text-gray-200 font-bold',
  'Media': 'text-gray-400 font-semibold',
  'Baja': 'text-gray-600',
};

const StatCard = ({ label, value, icon, gradient, sub }: {
  label: string; value: number; icon: React.ReactNode; gradient: string; sub?: string
}) => (
  <div className="glass-panel rounded-3xl p-5 sm:p-6 flex items-center gap-5 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transform group-hover:rotate-6 transition-transform duration-500 bg-gradient-to-br ${gradient}`}>
      <span className="text-white drop-shadow-md">{icon}</span>
    </div>
    <div className="relative z-10">
      <div className="text-2xl sm:text-3xl font-black text-white font-orbitron tracking-tighter">{value}</div>
      <div className="text-[#8888aa] text-[10px] sm:text-xs font-bold uppercase tracking-[2px] font-rajdhani">{label}</div>
      {sub && <div className="text-[#ffffff]/40 text-[9px] font-mono mt-1">{sub}</div>}
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

  const byStatus = [
    { label: 'Abiertos', count: stats.open, color: '#ffffff' },
    { label: 'En Progreso', count: stats.inProgress, color: '#bbbbbb' },
    { label: 'Resueltos', count: stats.resolved, color: '#aaaaaa' },
  ];
  const maxCount = Math.max(...byStatus.map(s => s.count), 1);

  const deptMap: Record<string, string> = {};
  departments.forEach(d => { deptMap[d.id] = d.name; });

  return (
    <div className="p-6 sm:p-10 space-y-10 max-w-7xl mx-auto min-h-screen bg-[#050505]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-orbitron tracking-tighter mb-2">
            MÓDULO <span className="text-gradient">OPERATIVO</span>
          </h1>
          <p className="text-[#8888aa] text-sm font-rajdhani font-semibold tracking-[4px] uppercase flex items-center gap-2">
            CONEXIÓN ESTABLECIDA // <span className="text-[#ffffff] animate-pulse">AGENTE: {currentUser?.name?.toUpperCase()}</span>
          </p>
        </div>
        <button
          onClick={() => setPage('new-ticket')}
          className="btn-futuristic flex items-center gap-3 px-6 py-4 text-xs tracking-[2px] group"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform duration-500">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          REGISTRAR REQUERIMIENTO
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          label="Total Unidades" 
          value={stats.total} 
          gradient="from-white/10 to-white/20"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>}
          sub="DATA_SYNC: 100%"
        />
        <StatCard 
          label="Soporte Activo" 
          value={stats.open} 
          gradient="from-white/5 to-white/15"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          sub="URGENCY: HIGH"
        />
        <StatCard 
          label="En Ejecución" 
          value={stats.inProgress} 
          gradient="from-white/10 to-white/5"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
          sub="PROCESS_THROTTLE: 0%"
        />
        <StatCard 
          label="Finalizados" 
          value={stats.resolved} 
          gradient="from-white/20 to-white/5"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
          sub="STATUS: OPTIMAL"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Panel: Recent Tickets */}
        <div className="lg:col-span-2 glass-panel rounded-3xl overflow-hidden border border-white/5">
          <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/2">
            <div>
              <h3 className="text-white font-bold font-orbitron tracking-tighter uppercase text-sm">LOG DE OPERACIONES</h3>
              <p className="text-[#8888aa] text-[10px] font-mono">ID_STREAM: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            </div>
            <button
              onClick={() => setPage('tickets')}
              className="text-[#ffffff] hover:text-[#cccccc] text-[10px] font-bold tracking-[2px] transition uppercase group"
            >
              ACCEDER AL ARCHIVO <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-x-auto">
            {recentTickets.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-5xl mb-6 grayscale opacity-20">🎫</div>
                <p className="text-[#8888aa] text-xs font-bold tracking-[3px] uppercase">No se detectan transmisiones activas</p>
                <button onClick={() => setPage('new-ticket')} className="mt-4 text-[#ffffff] text-[10px] font-bold hover:underline uppercase tracking-[2px]">
                  + INICIAR NUEVA SECUENCIA
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[10px] text-[#8888aa] font-black px-4 py-4 uppercase tracking-[3px]">REQUERIMIENTO</th>
                    <th className="text-left text-[10px] text-[#8888aa] font-black px-4 py-4 uppercase tracking-[3px]">ESTADO</th>
                    <th className="text-left text-[10px] text-[#8888aa] font-black px-4 py-4 uppercase tracking-[3px]">PRIORIDAD</th>
                    <th className="text-left text-[10px] text-[#8888aa] font-black px-4 py-4 uppercase tracking-[3px] hidden sm:table-cell">CONTACTO / DEPARTAMENTO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentTickets.map(ticket => (
                    <tr
                      key={ticket.id}
                      onClick={() => handleTicketClick(ticket)}
                      className="hover:bg-[#ffffff]/5 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-5">
                        <div className="text-white text-sm font-bold truncate max-w-[200px] font-rajdhani">{ticket.title}</div>
                        <div className="text-[#8888aa] text-[10px] mt-1 font-mono">{ticket.category} — {formatDistanceToNow(ticket.updatedAt)}</div>
                      </td>
                      <td className="px-4 py-5">
                        <span className={`inline-flex items-center text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter ${statusColors[ticket.status]}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${priorityColors[ticket.priority]}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-5 hidden sm:table-cell">
                        <div className="text-white text-[10px] font-black uppercase tracking-tight mb-1 font-orbitron">
                          USUARIO: <span className="text-[#cccccc]">{ticket.createdByName || 'DESCONOCIDO'}</span>
                        </div>
                        <div className="text-[#8888aa] text-[9px] font-bold uppercase tracking-tight bg-white/5 inline-block px-2 py-0.5 rounded border border-white/10">
                          DEPTO: {ticket.departmentId ? deptMap[ticket.departmentId] || 'GENÉRICO' : 'GENÉRICO'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Side Panel: Analysis */}
        <div className="glass-panel rounded-3xl p-8 border border-white/5 flex flex-col">
          <h3 className="text-white font-bold font-orbitron tracking-tighter uppercase text-sm mb-8 border-b border-white/5 pb-4">MÉTRICAS DE RED</h3>
          
          <div className="space-y-8 flex-1">
            {byStatus.map(s => (
              <div key={s.label} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[#8888aa] text-[10px] font-bold uppercase tracking-[2px]">{s.label}</span>
                  <span className="text-white font-black font-orbitron text-lg leading-none">{s.count}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden neon-border">
                  <div
                    className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_currentColor]"
                    style={{ 
                      width: `${(s.count / maxCount) * 100}%`, 
                      backgroundColor: s.color,
                      color: s.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">IA_PREDICTION</div>
              <div className="text-white font-bold text-sm leading-tight">Optimización de carga sugerida para el turno B.</div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/5 blur-2xl rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
