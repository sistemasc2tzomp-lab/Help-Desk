import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { generateStatisticalReport } from '../utils/pdfGenerator';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  FileText, Download, Shield, Clock,
  Filter, Users as UsersIcon, LayoutPanelLeft,
  CheckCircle2, AlertTriangle, Timer, DollarSign,
  QrCode, Monitor, Zap, HardDrive, ShieldCheck, Mail
} from 'lucide-react';

type ReportTab = 'dashboard' | 'hardware' | 'software' | 'network' | 'security' | 'users' | 'efficiency' | 'inventory';

export default function ReportsRepository() {
  const { tickets, users, departments } = useApp();
  const [activeTab, setActiveTab ] = useState<ReportTab>('dashboard');
  const [generating, setGenerating] = useState(false);

  const [filters, setFilters] = useState({
    department: 'Todos',
    priority: 'Todas',
    status: 'Todos',
  });

  const COLORS = ['#5A2D82', '#00AEEF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // STRICT DUPLICATION PREVENTION: Filter by ID before processing any report
  const uniqueTickets = useMemo(() => {
    const map = new Map();
    tickets.forEach(t => {
      if (!map.has(t.id)) map.set(t.id, t);
    });
    return Array.from(map.values());
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return uniqueTickets.filter(t => {
      const matchDept = filters.department === 'Todos' || t.departmentId === filters.department;
      const matchPrio = filters.priority === 'Todas' || t.priority === filters.priority;
      const matchStatus = filters.status === 'Todos' || t.status === filters.status;
      
      // Category filtering based on Tab
      let matchCat = true;
      if (activeTab === 'hardware') matchCat = t.category === 'Hardware';
      if (activeTab === 'software') matchCat = t.category === 'Software';
      if (activeTab === 'network') matchCat = t.category === 'Red';
      if (activeTab === 'security') matchCat = t.category === 'Seguridad';

      return matchDept && matchPrio && matchStatus && matchCat;
    });
  }, [uniqueTickets, filters, activeTab]);

  const statsByDept = useMemo(() => {
    return departments.map(d => ({
      name: d.name,
      total: uniqueTickets.filter(t => t.departmentId === d.id).length,
      resolved: uniqueTickets.filter(t => t.departmentId === d.id && (t.status === 'Resuelto' || t.status === 'Cerrado')).length
    })).sort((a,b) => b.total - a.total);
  }, [uniqueTickets, departments]);

  const handleDownloadReport = async (title: string) => {
    setGenerating(true);
    try {
      await generateStatisticalReport({
        title,
        subtitle: `DESGLOSE DETALLADO — ${activeTab.toUpperCase()}`,
        tickets: filteredTickets,
        departments: departments,
        type: activeTab
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 fade-in pb-24 bg-[var(--bg-void)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#5A2D82]/20 text-[#5A2D82] border border-[#5A2D82]/30"><QrCode size={18} /></div>
            <h1 className="text-5xl font-black text-white font-orbitron tracking-tighter uppercase">REPORTES TÉCNICOS</h1>
          </div>
          <p className="text-zinc-500 text-[10px] font-black tracking-[5px] uppercase">DESGLOSE INDIVIDUAL POR CATEGORÍA — DTO. SISTEMAS C2</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
           onClick={() => handleDownloadReport(`Reporte ${activeTab}`)}
           className="bg-[#00AEEF] hover:bg-[#0090C5] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[3px] flex items-center gap-2 shadow-2xl transition-all active:scale-95"
          >
            <Download size={16} /> {generating ? 'PROCESANDO...' : 'EXPORTAR DESGLOSE INDIVIDUAL'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-80 shrink-0 space-y-3">
          {[
            { id: 'dashboard', label: 'Dashboard General', icon: LayoutPanelLeft },
            { id: 'hardware', label: 'Reporte de Hardware', icon: HardDrive },
            { id: 'software', label: 'Reporte de Software', icon: Monitor },
            { id: 'network', label: 'Reporte de Redes', icon: Zap },
            { id: 'security', label: 'Reporte de Seguridad', icon: ShieldCheck },
            { id: 'users', label: 'Reporte de Usuarios', icon: UsersIcon },
            { id: 'efficiency', label: 'Tasa de Solución', icon: Timer },
            { id: 'inventory', label: 'Insumos / Materiales', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`w-full flex items-center gap-5 px-6 py-5 rounded-[2rem] transition-all text-left ${
                activeTab === tab.id ? 'bg-[#5A2D82] text-white shadow-2xl' : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-[#00AEEF]' : ''} />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </aside>

        <main className="flex-1 min-w-0 space-y-8 animate-fade-in">
          {activeTab === 'dashboard' ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-10 rounded-[3rem] border-white/5 bg-white/2 space-y-6">
                   <h3 className="text-sm font-black text-white font-orbitron uppercase tracking-widest">ACTIVIDAD POR DEPARTAMENTO</h3>
                   <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={statsByDept}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                            <XAxis dataKey="name" stroke="#555" fontSize={8} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="total" fill="#5A2D82" radius={[10, 10, 0, 0]} />
                            <Bar dataKey="resolved" fill="#00AEEF" radius={[10, 10, 0, 0]} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="glass-panel p-10 rounded-[3rem] border-white/5 bg-white/2 space-y-8 overflow-hidden">
                   <h3 className="text-sm font-black text-white font-orbitron uppercase tracking-widest">TICKETS (SIN ENG LOBAR)</h3>
                   <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {filteredTickets.slice(0, 15).map(t => (
                        <div key={t.id} className="p-4 rounded-2xl bg-white/2 border border-white/5 flex justify-between items-center group hover:bg-white/5 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="text-[10px] font-black text-[#5A2D82] font-orbitron">#{t.folio || t.id.slice(0,6)}</div>
                              <div className="text-[11px] text-white font-bold">{t.title}</div>
                           </div>
                           <span className="text-[8px] font-black text-zinc-500 uppercase">{t.status}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          ) : (
            <div className="glass-panel rounded-[3rem] border-white/5 bg-white/2 overflow-hidden shadow-2xl">
               <div className="p-8 border-b border-white/5 bg-[#5A2D82]/5 flex justify-between items-center">
                  <h3 className="text-sm font-black text-white font-orbitron uppercase tracking-widest">DETALLE INDIVIDUAL: {activeTab.toUpperCase()}</h3>
                  <span className="text-[10px] font-black text-zinc-500 uppercase">{filteredTickets.length} REGISTROS ÚNICOS</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-white/2 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                          <th className="px-8 py-5">Folio</th>
                          <th className="px-8 py-5">Solicitante</th>
                          <th className="px-8 py-5">Asunto</th>
                          <th className="px-8 py-5">Estado</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {filteredTickets.map(t => (
                          <tr key={t.id} className="hover:bg-white/5 transition-colors">
                             <td className="px-8 py-5 text-white font-orbitron text-xs">#{t.folio || t.id.slice(0,6)}</td>
                             <td className="px-8 py-5 text-zinc-300 font-bold text-xs">{t.createdByName.toUpperCase()}</td>
                             <td className="px-8 py-5 text-zinc-500 text-xs">{t.title}</td>
                             <td className="px-8 py-5">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${t.status === 'Cerrado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                   {t.status}
                                </span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
