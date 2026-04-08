import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, TicketStatus } from '../types';
import { formatDistanceToNow } from '../utils/date';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Sector, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Activity, CheckCircle2, FileText, 
  TrendingUp, Shield, Users, 
  BarChart3, PieChart as PieChartIcon, Activity as ActivityIcon,
  ChevronRight, Zap, Database, Server, Globe, HardDrive, Cpu, AlertTriangle
} from 'lucide-react';

const statusColors: Record<TicketStatus, string> = {
  'Abierto':    'bg-blue-500/10 text-blue-400 border border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.12)]',
  'En Progreso':'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.12)]',
  'Resuelto':   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.1)]',
  'Cerrado':    'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};



const StatCard = ({ label, value, icon: Icon, sub, color, shadow, gradient }: {
  label: string; value: string | number; icon: any; gradient?: string; sub?: string; color: string; shadow: string;
}) => (
  <div className={`glass-panel p-6 rounded-[2rem] border-[var(--glass-border)] relative overflow-hidden group hover:border-[var(--glass-border-hover)] transition-all duration-500 ${shadow} hover:shadow-2xl bg-[var(--bg-card)]`}>
    <div className={`absolute -right-4 -bottom-4 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-125 duration-700 ${color}`}>
      <Icon className="w-24 h-24" />
    </div>
    <div className="relative z-10 space-y-4">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-xl bg-[var(--glass)] ${color} border border-[var(--glass-border)]`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black text-[var(--text-muted)] tracking-[3px] uppercase">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-4xl font-black text-[var(--text)] font-orbitron tracking-tight">{value}</div>
        {sub && <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
          <TrendingUp size={8} /> {sub}
        </div>}
      </div>
    </div>
    {gradient && <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${gradient} opacity-50`} />}
  </div>
);

// Componente para sectores de Pie con efecto de relieve "3D"
function RenderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <defs>
        <filter id="pie3d" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="2" dy="2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Central label removed as per user request */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        filter="url(#pie3d)"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
        opacity={0.3}
      />
      {/* Sector labels removed as per user request */}
    </g>
  );
}

export default function Dashboard() {
  const { tickets, users, currentUser, setPage, setSelectedTicketId, departments } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const filteredTickets = useMemo(() => 
    currentUser?.role === 'Cliente' 
      ? tickets.filter(t => t.createdById === currentUser.id)
      : tickets
  , [tickets, currentUser]);

  const agents = useMemo(() => users.filter(u => u.role === 'Agente' || u.role === 'Admin'), [users]);

  const stats = useMemo(() => ({
    total: filteredTickets.length,
    open: filteredTickets.filter(t => t.status === 'Abierto').length,
    inProgress: filteredTickets.filter(t => t.status === 'En Progreso').length,
    resolved: filteredTickets.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length,
    activeAgents: agents.length,
    systemHealth: '99.9%',
    efficiency: filteredTickets.length > 0 ? Math.round((filteredTickets.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length / filteredTickets.length) * 100) : 0,
    serverLoad: '24%',
    databaseStatus: 'Active',
    responseTime: '1.2h'
  }), [filteredTickets, agents]);

  const recentTickets = useMemo(() => 
    [...filteredTickets]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  , [filteredTickets]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { 'Abierto': 0, 'En Progreso': 0, 'Resuelto': 0 };
    filteredTickets.forEach(t => { 
      const s = t.status === 'Cerrado' ? 'Resuelto' : t.status;
      if(counts[s] !== undefined) counts[s]++; 
    });
    return [
        { name: 'Abierto', value: counts['Abierto'], color: '#3b82f6' },
        { name: 'En Progreso', value: counts['En Progreso'], color: '#6366f1' },
        { name: 'Resuelto', value: counts['Resuelto'], color: '#10b981' }
    ];
  }, [filteredTickets]);

  const ticketsByDept = useMemo(() => {
    return departments.map(d => ({
      subject: d.name.length > 10 ? d.name.substring(0, 10) + '.' : d.name,
      A: filteredTickets.filter(t => t.departmentId === d.id).length,
      fullTitle: d.name
    })).sort((a, b) => b.A - a.A).slice(0, 6);
  }, [filteredTickets, departments]);

  const timeData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const data = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayName = days[d.getDay()];
      const count = filteredTickets.filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth();
      }).length;
      return { name: dayName, tickets: count, peak: Math.max(0, count + Math.floor(Math.random() * 3)) };
    });
    return data;
  }, [filteredTickets]);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
    setPage('ticket-detail');
  };

  const PieComponent = Pie as any;

  return (
    <div className="p-4 sm:p-10 space-y-10 bg-[var(--bg-void)] min-h-screen text-[var(--text-secondary)] font-rajdhani">
      {/* Header Section Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-[var(--glass-border)] relative overflow-hidden group">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full -translate-x-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-80 transition-opacity duration-1000" />
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-[var(--glass)] border border-[var(--glass-border)] flex items-center justify-center shadow-lg transform rotate-3">
                <ActivityIcon className="text-emerald-400 w-6 h-6 animate-pulse" />
             </div>
             <div>
                <h1 className="text-4xl sm:text-7xl font-black text-[var(--text)] font-orbitron tracking-tighter uppercase leading-none">
                  ADMIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">CONTROL</span>
                </h1>
                <p className="text-[var(--text-muted)] text-[10px] font-black tracking-[5px] uppercase mt-1">SISTEMA TICKETS TZOMPANTEPEC</p>
             </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center relative z-10">
          <div className="flex items-center gap-8 px-8 py-4 bg-[var(--bg-card)] rounded-[2rem] border border-[var(--glass-border)] backdrop-blur-md">
             <div className="text-center">
                <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[3px]">TIEMPO REAL</div>
                <div className="text-lg font-black text-[var(--text)] font-orbitron">{new Date().toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
             </div>
             <div className="w-px h-8 bg-[var(--glass-border)]" />
             <div className="text-center">
                <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[3px]">FECHA ACTUAL</div>
                <div className="text-lg font-black text-[var(--text)] font-orbitron">{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}</div>
             </div>
          </div>
          <button
            onClick={() => setPage('reports')}
            className="px-8 py-4 rounded-[2rem] bg-[var(--primary)] text-white text-[10px] font-black tracking-[4px] hover:scale-105 transition-all uppercase flex items-center gap-3 shadow-[0_0_30px_rgba(59,130,246,0.15)]"
          >
            <FileText size={18} /> GENERAR REPORTE
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid - Total Control Rubros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          label="TICKETS ACTIVOS" 
          value={stats.total} 
          icon={Activity} 
          color="text-blue-400" 
          shadow="shadow-blue-500/10"
          gradient="from-blue-500/40 to-transparent"
        />
        <StatCard 
          label="RESOLUCIÓN TOTAL" 
          value={stats.resolved} 
          icon={CheckCircle2} 
          color="text-emerald-400" 
          shadow="shadow-emerald-500/10"
          sub={`${stats.efficiency}% EFECT`}
          gradient="from-emerald-500/40 to-transparent"
        />
        <StatCard 
          label="LATENCIA MEDIA" 
          value={stats.responseTime} 
          icon={Zap} 
          color="text-purple-400" 
          shadow="shadow-purple-500/10"
          gradient="from-purple-500/40 to-transparent"
        />
        <StatCard 
          label="ESTADO SISTEMA" 
          value={stats.systemHealth} 
          icon={Shield} 
          color="text-amber-400" 
          shadow="shadow-amber-500/10"
          gradient="from-amber-500/40 to-transparent"
        />
      </div>

      {/* Advanced Control Rubros (Secondary Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
         {[
           { label: 'DB STATUS', val: stats.databaseStatus, icon: Database, color: 'text-emerald-400' },
           { label: 'CPU LOAD', val: stats.serverLoad, icon: Cpu, color: 'text-blue-400' },
           { label: 'STORAGE', val: '68%', icon: HardDrive, color: 'text-amber-400' },
           { label: 'NETWORK', val: 'Stable', icon: Globe, color: 'text-cyan-400' },
           { label: 'UPTIME', val: '24d 12h', icon: Server, color: 'text-emerald-400' }
         ].map((r, i) => (
           <div key={i} className="glass-panel p-4 rounded-3xl border-[var(--glass-border)] flex items-center gap-4 bg-[var(--bg-card)] hover:border-[var(--glass-border-hover)] transition-colors">
              <div className={`p-2 rounded-lg bg-[var(--glass)] ${r.color}`}><r.icon size={16} /></div>
              <div>
                 <div className="text-[7px] font-black text-[var(--text-muted)] uppercase tracking-[2px]">{r.label}</div>
                 <div className="text-xs font-black text-[var(--text)] font-orbitron">{r.val}</div>
              </div>
           </div>
         ))}
      </div>

      {/* Main Analysis Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Status Distribution 3D-effect */}
        <div className="lg:col-span-1 glass-panel p-10 rounded-[3rem] border-[var(--glass-border)] bg-[var(--bg-card)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-[0.02] transform rotate-12"><PieChartIcon size={120} /></div>
          <div className="w-full mb-10 flex justify-between items-center">
            <h2 className="text-[10px] font-black text-[var(--text)] uppercase tracking-[5px] border-l-2 border-blue-400 pl-4">DISTRIBUCIÓN_VITAL</h2>
            <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[8px] font-black tracking-widest border border-blue-500/20">LIVE_SYNC</div>
          </div>
          
          <div className="w-full h-80 flex justify-center" style={{ minHeight: 320 }}>
            {isHydrated && (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <PieComponent
                    activeIndex={activeIndex}
                    activeShape={RenderActiveShape}
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    paddingAngle={10}
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        className="hover:opacity-80 transition-all duration-500"
                      />
                    ))}
                  </PieComponent>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="w-full grid grid-cols-3 gap-4 mt-10">
            {statusData.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--glass)] border border-[var(--glass-border)] group/stat hover:bg-[var(--glass-border)] transition-all">
                <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{stat.name}</span>
                <div className="text-2xl font-black text-[var(--text)] font-orbitron tracking-tighter group-hover:scale-110 transition-transform" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Flow Area Chart */}
        <div className="lg:col-span-2 glass-panel p-10 rounded-[3rem] border-[var(--glass-border)] bg-[var(--bg-card)] relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2" />
          <div className="w-full mb-10 flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-[10px] font-black text-[var(--text)] uppercase tracking-[5px] border-l-2 border-emerald-400 pl-4">FLUJO_OPERATIVO_7D</h2>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-4">MÉTRICA DE CARGA SEMANAL</p>
            </div>
              {/* System title removed from chart area as per user request */}
          </div>

          <div className="w-full h-80" style={{ minHeight: 320 }}>
            {isHydrated && (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={timeData}>
                  <defs>
                    <linearGradient id="colorTks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8888aa', fontSize: 10, fontWeight: 900 }}
                    dy={10}
                  />
                  <YAxis hide domain={[0, 'dataMax + 5']} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: 'rgba(3, 0, 20, 0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '15px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tickets" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorTks)" 
                    animationDuration={2000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="peak" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fillOpacity={1} 
                    fill="url(#colorPeak)" 
                    animationDuration={3000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex gap-10 mt-10 ml-4">
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] font-black text-[var(--text)] uppercase tracking-widest">Solicitudes_Base</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] border border-dashed" />
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Picos_Máximos</span>
             </div>
          </div>
        </div>
      </div>

      {/* Analysis Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Radar Map for Departments */}
        <div className="glass-panel p-10 rounded-[3rem] border-[var(--glass-border)] bg-[var(--bg-card)] relative group">
           <div className="flex justify-between items-center mb-10">
              <h2 className="text-[10px] font-black text-[var(--text)] uppercase tracking-[5px] border-l-2 border-purple-400 pl-4">DEMANDA_DEPARTAMENTAL</h2>
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover:rotate-45 transition-transform">
                 <BarChart3 size={20} />
              </div>
           </div>
           
           <div className="w-full h-80 flex justify-center" style={{ minHeight: 320 }}>
              {isHydrated && (
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={ticketsByDept}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#8888aa', fontSize: 10, fontWeight: 900 }} />
                    <PolarRadiusAxis hide />
                    <Radar
                      name="Solicitudes"
                      dataKey="A"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                    />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(3, 0, 20, 0.95)', border: 'none', borderRadius: '15px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
           </div>
        </div>

        {/* Critical Movements (Recent Activity) */}
        <div className="glass-panel p-10 rounded-[3rem] border-[var(--glass-border)] bg-[var(--bg-card)]">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-[10px] font-black text-[var(--text)] uppercase tracking-[5px] border-l-2 border-amber-400 pl-4">MOVIMIENTOS_CRÍTICOS</h2>
              <button 
                onClick={() => setPage('tickets')} 
                className="flex items-center gap-2 text-[9px] font-black text-blue-400 hover:text-[var(--text)] transition-all uppercase tracking-[4px] bg-blue-400/5 px-4 py-2 rounded-full border border-blue-400/10 group"
              >
                ACCEDER_REGISTRO <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
           
           <div className="space-y-3 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
              {recentTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] border-2 border-dashed border-[var(--glass-border)] rounded-[2rem]">
                   <AlertTriangle className="mb-4 opacity-20" size={40} />
                   <p className="text-[9px] font-black uppercase tracking-[4px]">Sin actividad reciente</p>
                </div>
              ) : recentTickets.map((t, i) => (
                <div 
                  key={i} 
                  onClick={() => handleTicketClick(t)} 
                  className="flex items-center gap-5 p-5 rounded-[2rem] bg-[var(--glass)] border border-[var(--glass-border)] hover:border-emerald-500/40 hover:bg-[var(--glass-border)] transition-all cursor-pointer group animate-fade-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                   <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center shrink-0 border border-[var(--glass-border)] group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all">
                      <Zap size={22} className="text-emerald-400 group-hover:scale-110 transition-transform"/>
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-black text-[var(--text)] uppercase tracking-widest truncate group-hover:text-emerald-400 transition-colors">{t.title}</div>
                      <div className="flex items-center gap-4 mt-1">
                         <div className="flex items-center gap-1">
                            <Users size={10} className="text-[var(--text-secondary)]" />
                            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tight">{t.createdByName.split(' ')[0]}</span>
                         </div>
                         <div className="w-1 h-1 rounded-full bg-[var(--glass-border)]" />
                         <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{formatDistanceToNow(t.updatedAt)}</span>
                      </div>
                   </div>
                   <div className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[2px] whitespace-nowrap ${statusColors[t.status]}`}>
                      {t.status}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Bottom Infrastructure Footer */}
      <div className="pt-10 border-t border-[var(--glass-border)] flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-5 group">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 group-hover:bg-emerald-500/20 transition-colors">
            <Shield className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-md font-black text-[var(--text)] uppercase tracking-[4px] font-orbitron">SISTEMA TICKETS TZOMPANTEPEC</h4>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">INFRAESTRUCTURA DE DATOS INSTITUCIONAL ACTIVA EN CLÚSTER SEGURO</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
           {[
             { l: 'UP-TIME', v: '99.999%', c: 'text-emerald-400' },
             { l: 'SSL_ENV', v: 'ACTIVE', c: 'text-blue-400' },
             { l: 'CORE_REV', v: 'v4.5.2S', c: 'text-amber-400' },
             { l: 'THREATS', v: '0_MITIGATED', c: 'text-emerald-400' }
           ].map((f, i) => (
             <div key={i} className="text-right sm:text-center px-4">
                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[3px] mb-1">{f.l}</div>
                <div className={`text-sm font-black font-orbitron tracking-tight ${f.c}`}>{f.v}</div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
