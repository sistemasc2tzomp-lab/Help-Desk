import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TicketStatus } from '../types';
import { formatDistanceToNow } from '../utils/date';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Sector, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Activity, CheckCircle2, FileText, 
  TrendingUp, Shield, Users, 
  ChevronRight, Zap, Database, Server, Clock, AlertCircle
} from 'lucide-react';

const statusColors: Record<TicketStatus, string> = {
  'Abierto':    'bg-blue-500/10 text-blue-400 border border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.12)]',
  'En Proceso': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.12)]',
  'Resuelto':   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.1)]',
  'Cerrado':    'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

const StatCard = ({ label, value, icon: Icon, sub, color, shadow, gradient }: {
  label: string; value: string | number; icon: any; gradient?: string; sub?: string; color: string; shadow: string;
}) => (
  <div className={`glass-panel p-5 md:p-6 rounded-[2rem] border-[var(--glass-border)] relative overflow-hidden group hover:border-[var(--glass-border-hover)] transition-all duration-500 ${shadow} hover:shadow-2xl bg-[var(--bg-card,rgba(3,7,18,0.4))]`}>
    <div className={`absolute -right-4 -bottom-4 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-125 duration-700 ${color}`}>
      <Icon className="w-16 h-16 md:w-24 md:h-24" />
    </div>
    <div className="relative z-10 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-xl bg-white/5 ${color} border border-white/10`}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <span className="text-[9px] md:text-[10px] font-black text-[#8888aa] tracking-[3px] uppercase">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl md:text-4xl font-black text-white font-orbitron tracking-tight">{value}</div>
        {sub && <div className="text-[8px] md:text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
          <TrendingUp size={8} /> {sub}
        </div>}
      </div>
    </div>
    {gradient && <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${gradient} opacity-50`} />}
  </div>
);

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
    </g>
  );
}

export default function Dashboard() {
  const { tickets, users, currentUser, setPage, setSelectedTicketId, departments, isOnline } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setIsHydrated(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 19) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
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

  const userDeptName = useMemo(() => {
    if (!currentUser?.departmentId) return currentUser?.name || 'Sistemas / TI';
    const dept = departments.find(d => d.id === currentUser.departmentId);
    return dept ? dept.name : currentUser?.name || 'Sistemas / TI';
  }, [currentUser, departments]);

  const stats = useMemo(() => ({
    total: filteredTickets.length,
    abiertos: filteredTickets.filter(t => t.status === 'Abierto').length,
    progreso: filteredTickets.filter(t => t.status === 'En Proceso').length,
    resueltos: filteredTickets.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length,
    activeAgents: agents.length,
    efficiency: filteredTickets.length > 0 ? Math.round((filteredTickets.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length / filteredTickets.length) * 100) : 0,
  }), [filteredTickets, agents]);

  const onlineCount = useMemo(() => users.filter(u => isOnline(u.updated)).length, [users, isOnline]);

  const recentTickets = useMemo(() => 
    [...filteredTickets]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
  , [filteredTickets]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { 'Abierto': 0, 'En Proceso': 0, 'Resuelto': 0 };
    filteredTickets.forEach(t => { 
      const s = t.status === 'Cerrado' ? 'Resuelto' : t.status;
      if(counts[s] !== undefined) counts[s]++; 
    });
    return [
        { name: 'Abierto', value: counts['Abierto'], color: '#3b82f6' },
        { name: 'En Proceso', value: counts['En Proceso'], color: '#6366f1' },
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
      return { name: dayName, tickets: count };
    });
    return data;
  }, [filteredTickets]);

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setPage('ticket-detail');
  };

  const PieComponent = Pie as any;

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 md:space-y-12 bg-[var(--bg-void)] min-h-screen text-[var(--text-secondary)] font-rajdhani">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[3px] border border-blue-500/20 flex items-center gap-2">
              <Shield size={12} /> Terminal Operativa Activa
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-tight font-orbitron uppercase">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-500">{userDeptName}</span>
          </h1>
          <p className="max-w-2xl text-[#8888aa] mt-3 font-medium flex items-center gap-3 text-sm md:text-base">
            <Clock className="text-blue-500 animate-pulse" size={18} />
            Gestión de infraestructura y servicios técnico-administrativos C2 Tzompantepec.
          </p>
        </div>

        {(currentUser?.role === 'Admin' || currentUser?.role === 'Agente') && (
            <button 
              onClick={() => triggerSync()}
              className="px-8 py-5 glass-panel rounded-[2rem] border-white/5 bg-white/5 flex items-center gap-5 hover:bg-white/10 hover:border-cyan-500/30 transition-all group active:scale-95 shadow-2xl"
              title="Sincronizar presencia de red"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] block leading-none mb-1">ONLINE_LIVE</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-white font-orbitron leading-none">{onlineCount}</span>
                  <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">AGENTES_ACTIVOS</span>
                </div>
              </div>
            </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          label="Total_Tickets" 
          value={stats.total} 
          icon={FileText} 
          color="text-blue-400" 
          shadow="hover:shadow-blue-500/10"
          gradient="from-blue-500/20 to-transparent"
        />
        <StatCard 
          label="Soporte_Activo" 
          value={stats.abiertos} 
          icon={AlertCircle} 
          color="text-cyan-400" 
          shadow="hover:shadow-cyan-500/10"
          gradient="from-cyan-500/20 to-transparent"
          sub={`${Math.round((stats.abiertos/stats.total)*100 || 0)}%`}
        />
        <StatCard 
          label="En_Proceso" 
          value={stats.progreso} 
          icon={Clock} 
          color="text-indigo-400" 
          shadow="hover:shadow-indigo-500/10"
          gradient="from-indigo-500/20 to-transparent"
        />
        <StatCard 
          label="Tasa_Resolucion" 
          value={`${stats.efficiency}%`} 
          icon={CheckCircle2} 
          color="text-emerald-400" 
          shadow="hover:shadow-emerald-500/10"
          gradient="from-emerald-500/20 to-transparent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-6 md:space-y-10">
          <div className="glass-panel p-6 md:p-8 rounded-[3rem] border border-white/5 bg-white/2 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[10px] font-black text-white uppercase tracking-[5px]">FLUJO_DE_TICKETS</h2>
                <p className="text-[#8888aa] text-[9px] font-medium tracking-widest uppercase">Últimos 7 días</p>
              </div>
              <Activity className="text-blue-500/50 w-6 h-6" />
            </div>
            {isHydrated && (
              <div style={{ width: '100%', height: 240, minHeight: 240, minWidth: 200 }}>
                <ResponsiveContainer width="100%" height={240} minHeight={240}>
                  <AreaChart data={timeData}>
                    <defs>
                      <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#8888aa', fontSize: 10, fontWeight: 700}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#8888aa', fontSize: 10, fontWeight: 700}} 
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#030712', border: '1px solid #ffffff10', borderRadius: '1rem'}} 
                      itemStyle={{color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase'}}
                    />
                    <Area type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTickets)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
             {/* Status Distribution */}
             <div className="glass-panel p-6 md:p-8 rounded-[3rem] border border-white/5 bg-white/2">
                <h2 className="text-[10px] font-black text-white uppercase tracking-[5px] mb-4">DISTRIBUCION_STATUS</h2>
                <div style={{ width: '100%', height: 260, minHeight: 260, minWidth: 200 }}>
                  {isHydrated && (
                   <ResponsiveContainer width="100%" height={260} minHeight={260}>
                      <PieChart>
                         <PieComponent
                            activeIndex={activeIndex}
                            activeShape={RenderActiveShape}
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            onMouseEnter={onPieEnter}
                         >
                            {statusData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                         </PieComponent>
                         <Tooltip />
                      </PieChart>
                   </ResponsiveContainer>
                  )}
                </div>
             </div>

             {/* Dept Load */}
             <div className="glass-panel p-6 md:p-8 rounded-[3rem] border border-white/5 bg-white/2">
                <h2 className="text-[10px] font-black text-white uppercase tracking-[5px] mb-4">CARGA_DEPARTAMENTOS</h2>
                <div style={{ width: '100%', height: 260, minHeight: 260, minWidth: 200 }}>
                  {isHydrated && (
                   <ResponsiveContainer width="100%" height={260} minHeight={260}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={ticketsByDept}>
                         <PolarGrid stroke="#ffffff05" />
                         <PolarAngleAxis dataKey="subject" tick={{fill: '#8888aa', fontSize: 8}} />
                         <Radar name="Tickets" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                      </RadarChart>
                   </ResponsiveContainer>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar Activity */}
        <div className="space-y-6 md:space-y-8">
          <div className="glass-panel p-6 md:p-8 rounded-[3rem] border border-white/5 bg-white/2 overflow-hidden h-full min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-[10px] font-black text-white uppercase tracking-[5px]">ACTIVIDAD_RECIENTE</h2>
                <p className="text-[#8888aa] text-[9px] font-medium tracking-widest uppercase">Ticket Feed</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            
            <div className="space-y-4">
              {recentTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
                  <Database className="w-10 h-10 text-[#8888aa]" />
                  <p className="text-[10px] font-black uppercase tracking-[3px]">Sincronizando_Datos...</p>
                </div>
              ) : (
                recentTickets.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => handleTicketClick(t.id)}
                    className="group relative p-4 md:p-5 rounded-[2rem] bg-white/2 border border-white/5 hover:bg-white/5 hover:border-blue-500/30 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        t.status === 'Abierto' ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 
                        t.status === 'En Proceso' ? 'bg-indigo-500 shadow-[0_0_10px_#6366f1]' : 
                        'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                      }`} />
                      <div className="space-y-1">
                        <div className="text-sm font-black text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                          {t.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold text-[#8888aa] uppercase tracking-wider">
                          <span>{t.status}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(t.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

