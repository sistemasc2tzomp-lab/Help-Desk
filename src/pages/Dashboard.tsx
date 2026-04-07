import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, TicketStatus } from '../types';
import { formatDistanceToNow } from '../utils/date';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Sector
} from 'recharts';
import { 
  Activity, CheckCircle2, FileText, 
  TrendingUp, Shield, Users, Calendar, 
  BarChart3, PieChart as PieChartIcon, Activity as ActivityIcon,
  ChevronRight, Zap
} from 'lucide-react';

const statusColors: Record<TicketStatus, string> = {
  'Abierto':    'bg-blue-500/10 text-blue-400 border border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.12)]',
  'En Progreso':'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.12)]',
  'Resuelto':   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.1)]',
  'Cerrado':    'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

const CHART_COLORS = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ label, value, icon: Icon, sub, color, shadow }: {
  label: string; value: string | number; icon: any; gradient: string; sub?: string; color: string; shadow: string;
}) => (
  <div className={`glass-panel p-6 rounded-[2rem] border-white/5 relative overflow-hidden group hover:border-white/20 transition-all duration-500 ${shadow} hover:shadow-2xl bg-[#0a0520]/40`}>
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon className="w-16 h-16" />
    </div>
    <div className="relative z-10 space-y-4">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black text-[#8888aa] tracking-[3px] uppercase">{label}</span>
      </div>
      <div className="text-4xl font-black text-white font-orbitron tracking-tight">{value}</div>
      {sub && <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-1 flex items-center gap-1">
        <TrendingUp size={10} /> {sub}
      </div>}
    </div>
  </div>
);

// Componente para sectores de Pie con efecto de relieve "3D"
function RenderActiveShape(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Orbitron' }}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#94a3b8" fontSize={12} fontWeight="bold">{`${value} tks`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#4ade80" fontSize={10} fontWeight="bold">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
}

export default function Dashboard() {
  const { tickets, users, currentUser, setPage, setSelectedTicketId, departments } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);

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
    resolved: filteredTickets.filter(t => t.status === 'Resuelto').length,
    activeAgents: agents.length,
    systemHealth: '100%',
    efficiency: filteredTickets.length > 0 ? Math.round((filteredTickets.filter(t => t.status === 'Resuelto').length / filteredTickets.length) * 100) : 0
  }), [filteredTickets, agents]);

  const recentTickets = useMemo(() => 
    [...filteredTickets]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
  , [filteredTickets]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { 'Abierto': 0, 'En Progreso': 0, 'Resuelto': 0 };
    filteredTickets.forEach(t => { if(counts[t.status] !== undefined) counts[t.status]++; });
    return [
        { name: 'Abierto', value: counts['Abierto'], color: '#3b82f6' },
        { name: 'En Progreso', value: counts['En Progreso'], color: '#6366f1' },
        { name: 'Resuelto', value: counts['Resuelto'], color: '#10b981' }
    ];
  }, [filteredTickets]);

  const ticketsByDept = useMemo(() => {
    return departments.map(d => ({
      name: d.name,
      tickets: filteredTickets.filter(t => t.departmentId === d.id).length
    })).sort((a, b) => b.tickets - a.tickets).slice(0, 5);
  }, [filteredTickets, departments]);

  const timeData = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return days.map(d => ({ name: d, tickets: Math.floor(Math.random() * 15) + 5 }));
  }, []);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
    setPage('ticket-detail');
  };

  const PieComponent = Pie as any;

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#030014] min-h-screen text-slate-300 font-rajdhani">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="space-y-2 relative z-10">
          <h1 className="text-4xl sm:text-6xl font-black text-white font-orbitron tracking-tighter uppercase leading-none">
            CENTRO DE <span className="text-emerald-400">CONTROL</span>
          </h1>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shadow-[0_0_10px_#10b981]" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[4px]">SISTEMA OPERATIVO</span>
             </div>
             <span className="text-white/10">|</span>
             <p className="text-[#8888aa] text-[9px] font-bold tracking-[3px] uppercase">MONITOREO INTEGRAL DE SERVICIOS</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center relative z-10">
          <button
            onClick={() => setPage('reports')}
            className="px-6 py-3 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black tracking-[3px] hover:bg-white/10 transition-all uppercase flex items-center gap-3"
          >
            <FileText size={16} className="text-blue-400" /> Reportes
          </button>
          <div className="glass-panel px-6 py-3 border-white/10 rounded-2xl flex items-center gap-3">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="TICKETS ACTIVOS" 
          value={stats.total} 
          icon={Activity} 
          color="text-blue-400" 
          shadow="shadow-blue-500/10"
          gradient="from-blue-600/20 to-transparent"
        />
        <StatCard 
          label="SOLUCIONADOS" 
          value={stats.resolved} 
          icon={CheckCircle2} 
          color="text-emerald-400" 
          shadow="shadow-emerald-500/10"
          gradient="from-emerald-600/20 to-transparent"
          sub={`${stats.efficiency}% EFECTIVIDAD`}
        />
        <StatCard 
          label="AGENTES ONLINE" 
          value={stats.activeAgents} 
          icon={Users} 
          color="text-purple-400" 
          shadow="shadow-purple-500/10"
          gradient="from-purple-600/20 to-transparent"
        />
        <StatCard 
          label="ESTADO SISTEMA" 
          value={stats.systemHealth} 
          icon={Shield} 
          color="text-amber-400" 
          shadow="shadow-amber-500/10"
          gradient="from-amber-600/20 to-transparent"
        />
      </div>

      {/* Main Content Area: Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Analysis (Pie) */}
        <div className="lg:col-span-1 glass-panel p-8 rounded-[2.5rem] border-white/5 bg-[#0a0520]/40 flex flex-col items-center">
          <div className="w-full mb-8 flex justify-between items-center">
            <h2 className="text-xs font-black text-white uppercase tracking-[4px]">ANÁLISIS DE ESTADO</h2>
            <PieChartIcon className="w-4 h-4 text-blue-400" />
          </div>
          
          <div className="w-full h-72 min-w-0 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <PieComponent
                  activeIndex={activeIndex}
                  activeShape={RenderActiveShape}
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  paddingAngle={8}
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </PieComponent>
                <Tooltip 
                   contentStyle={{ backgroundColor: 'rgba(3, 0, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full grid grid-cols-3 gap-2 mt-8">
            {statusData.map((stat, i) => (
              <div key={i} className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[8px] font-bold text-[#8888aa] uppercase tracking-widest">{stat.name}</span>
                <div className="text-lg font-bold text-white font-orbitron">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Flow (Area Chart) */}
        <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem] border-white/5 bg-[#0a0520]/40">
          <div className="w-full mb-8 flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-xs font-black text-white uppercase tracking-[4px]">FLUJO OPERATIVO</h2>
              <p className="text-[10px] font-bold text-[#8888aa] uppercase tracking-widest">ACTIVIDAD SEMANAL</p>
            </div>
            <ActivityIcon className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="w-full h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8888aa', fontSize: 10 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 10 }} />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'rgba(3, 0, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="tickets" 
                  stroke="#10b981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorTickets)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Bar Chart + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 bg-[#0a0520]/40">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-xs font-black text-white uppercase tracking-[4px]">DEMANDA POR DEPTO</h2>
              <BarChart3 className="w-4 h-4 text-purple-400" />
           </div>
           <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={ticketsByDept}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8888aa', fontSize: 9 }}
                    />
                    <YAxis hide />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(3, 0, 20, 0.95)', border: 'none', borderRadius: '12px' }} />
                    <Bar dataKey="tickets" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40}>
                       {ticketsByDept.map((_, i) => (
                         <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 bg-[#0a0520]/40">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-black text-white uppercase tracking-[4px]">MOVIMIENTOS CRÍTICOS</h2>
              <button onClick={() => setPage('tickets')} className="flex items-center gap-1 text-[9px] font-black text-blue-400 hover:text-white transition-colors uppercase tracking-[3px]">
                EXPLORAR <ChevronRight size={10} />
              </button>
           </div>
           <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {recentTickets.map((t, i) => (
                <div key={i} onClick={() => handleTicketClick(t)} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group">
                   <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-emerald-500/50">
                      <Zap size={18} className="text-emerald-400 group-hover:animate-pulse"/>
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black text-white uppercase tracking-widest truncate">{t.title}</div>
                      <div className="flex items-center gap-3 mt-1">
                         <span className="text-[9px] font-bold text-slate-500 uppercase">{t.createdByName}</span>
                         <span className="text-white/5 text-xs">|</span>
                         <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">{formatDistanceToNow(t.updatedAt)}</span>
                      </div>
                   </div>
                   <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${statusColors[t.status]}`}>
                      {t.status}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Professional Infrastructure Footer */}
      <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-[2px]">SISTEMA TICKETS TZOMPANTEPEC</h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Procesamiento de datos en clúster descentralizado activo</p>
          </div>
        </div>
        <div className="flex gap-6">
           <div className="text-right">
              <div className="text-[10px] font-black text-white uppercase tracking-widest">TIEMPO DE UP-TIME</div>
              <div className="text-xs font-bold text-emerald-400 font-orbitron">99.9997%</div>
           </div>
           <div className="text-right">
              <div className="text-[10px] font-black text-white uppercase tracking-widest">VERSION CORE</div>
              <div className="text-xs font-bold text-blue-400 font-orbitron">v4.2.0 Stable</div>
           </div>
        </div>
      </div>
    </div>
  );
}
