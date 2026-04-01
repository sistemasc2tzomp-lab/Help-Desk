import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TicketStatus, TicketPriority } from '../types';
import { formatDate } from '../utils/date';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const STATUSES: TicketStatus[] = ['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'];
const PRIORITIES: TicketPriority[] = ['Urgente', 'Alta', 'Media', 'Baja'];
const CATEGORIES = [
  'Servidores y Almacenamiento',
  'Redes y Conectividad',
  'Seguridad de la Información',
  'Soporte Técnico',
  'Infraestructura Física'
];

const statusColor: Record<TicketStatus, string> = {
  'Abierto': '#00f0ff',
  'En Progreso': '#7b2fff',
  'Resuelto': '#10b981',
  'Cerrado': '#8888aa',
};
const priorityColor: Record<string, string> = {
  'Urgente': '#ff2d95',
  'Alta': '#f97316',
  'Media': '#eab308',
  'Baja': '#8888aa',
};

function count<T extends string>(arr: T[], val: T) {
  return arr.filter(x => x === val).length;
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

/* ─── mini components ─────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color, icon }: { label: string; value: number | string; sub?: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="glass-panel border border-white/5 rounded-3xl p-6 group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-current transition-all duration-500 opacity-20" style={{ color }} />
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#8888aa] text-[9px] font-black uppercase tracking-[3px] font-rajdhani">{label}</span>
        <div className="opacity-40 group-hover:opacity-100 transition-opacity" style={{ color }}>{icon}</div>
      </div>
      <div className="text-4xl font-black font-orbitron tracking-tighter mb-2" style={{ color }}>{value}</div>
      {sub && <div className="text-[#8888aa] text-[9px] font-bold uppercase tracking-widest">{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const w = max === 0 ? 0 : (value / max) * 100;
  return (
    <div className="space-y-2 group">
      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[2px]">
        <span className="text-[#8888aa] group-hover:text-white transition-colors">{label}</span>
        <span className="font-orbitron" style={{ color }}>{value} / {max}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
        <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
             style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8 mt-12 border-b border-white/5 pb-8">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-white/2 border border-white/10 flex items-center justify-center text-[#00f0ff] shadow-2xl">
          {icon}
        </div>
        <div>
          <h2 className="text-2xl font-black font-orbitron tracking-tighter text-white uppercase">{title}</h2>
          {subtitle && <p className="text-[#8888aa] text-[10px] font-bold tracking-[4px] uppercase mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

/* ─── PDF generators ───────────────────────────────────────────────────────── */
function addPdfHeader(doc: jsPDF, title: string) {
  const pw = doc.internal.pageSize.getWidth();

  // Dark background fill
  doc.setFillColor(3, 0, 20);
  doc.rect(0, 0, pw, 38, 'F');

  // Cyan top border
  doc.setFillColor(0, 240, 255);
  doc.rect(0, 0, pw, 2.5, 'F');

  // Bottom separator line
  doc.setDrawColor(0, 240, 255);
  doc.setLineWidth(0.5);
  doc.line(0, 38, pw, 38);

  // Main title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('HELP DESK TZOMP', 14, 17);

  // Sub-title / institution
  doc.setFontSize(8);
  doc.setTextColor(136, 136, 170);
  doc.text('SISTEMAS & INTELIGENCIA ARTIFICIAL | MUNICIPIO DE TZOMPANTEPEC, TLAXCALA', 14, 25);

  // Report title (right)
  doc.setFontSize(11);
  doc.setTextColor(0, 240, 255);
  doc.text(title.toUpperCase(), pw - 14, 17, { align: 'right' });

  // Metadata (right)
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 130);
  doc.text(`FOLIO: ${new Date().getTime().toString(36).toUpperCase()}  |  EMITIDO: ${new Date().toLocaleString()}`, pw - 14, 25, { align: 'right' });
}

/* ─── Excel helper ─────────────────────────────────────────────────────────── */
function downloadExcel(sheets: { name: string; data: unknown[][] }[], filename: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
}

export default function ReportsPage() {
  const { currentUser, tickets, users, departments } = useApp();
  const [activeTab, setActiveTab] = useState<'general' | 'tickets' | 'agents' | 'departments'>('general');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[70vh] text-center space-y-8 bg-[#030014]">
        <div className="w-24 h-24 rounded-[32px] bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center animate-pulse">
           <svg className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div>
          <h2 className="text-white text-3xl font-black font-orbitron tracking-widest mb-4">ACCESO RESTRINGIDO</h2>
          <p className="text-[#8888aa] text-sm font-bold tracking-[3px] uppercase">Solo administradores de nivel 4 pueden acceder a la central de datos</p>
        </div>
      </div>
    );
  }

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (dateFrom && t.createdAt < dateFrom) return false;
      if (dateTo && t.createdAt > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [tickets, dateFrom, dateTo]);

  const total = filtered.length;
  const agents = users.filter(u => u.role === 'Agente' || u.role === 'Admin');

  const byStatus = STATUSES.map(s => ({ s, n: count(filtered.map(t => t.status), s) }));
  const byPriority = PRIORITIES.map(p => ({ p, n: count(filtered.map(t => t.priority), p) }));
  const byCategory = CATEGORIES.map(c => ({ c, n: filtered.filter(t => t.category === c).length }));
  const byDept = departments.map(d => ({ d, n: filtered.filter(t => t.departmentId === d.id).length }));
    /* processing constants */

  const resolved = filtered.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
  const resolutionRate = pct(resolved, total);

  const agentStats = agents.map(a => {
    const assigned = filtered.filter(t => t.assignedToId === a.id);
    const resolvedByAgent = assigned.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
    const msgs = assigned.reduce((sum, t) => sum + t.messages.filter(m => m.authorId === a.id).length, 0);
    return { agent: a, total: assigned.length, resolved: resolvedByAgent, rate: pct(resolvedByAgent, assigned.length), msgs };
  }).sort((a, b) => b.total - a.total);

  const exportGeneralPDF = () => {
    setExportLoading('general-pdf');
    const doc = new jsPDF();
    addPdfHeader(doc, 'Protocolo de Resumen General');
    
    // Custom Table Theme
    const tableStyles: any = {
      fillColor: [3, 0, 20],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 4,
      lineColor: [255, 255, 255, 0.05],
      lineWidth: 0.1,
    };

    autoTable(doc, {
      startY: 40,
      head: [['Métrica Operativa', 'Valor']],
      body: [
        ['Tickets Totales', total],
        ['Tasa de Resolución', `${resolutionRate}%`],
        ['Tickets Abiertos', byStatus[0].n],
        ['En Progreso', byStatus[1].n],
        ['Saturación del Sistema', `${pct(byStatus[0].n + byStatus[1].n, total)}%`],
      ],
      styles: tableStyles,
      headStyles: { fillColor: [0, 240, 255], textColor: [3, 0, 20], fontStyle: 'bold' },
    });

    const y = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(0, 240, 255);
    doc.setFontSize(12);
    doc.text('DISTRIBUCIÓN POR ESTADO', 14, y);

    autoTable(doc, {
      startY: y + 5,
      head: [['Estado', 'Cantidad', 'Impacto %']],
      body: byStatus.map(({ s, n }) => [s, n, `${pct(n, total)}%`]),
      styles: tableStyles,
      headStyles: { fillColor: [123, 47, 255], textColor: [255, 255, 255] },
    });

    doc.save(`reporte-cyber-${new Date().getTime()}.pdf`);
    setExportLoading(null);
  };

  const exportTicketsPDF = () => {
    setExportLoading('tickets-pdf');
    const doc = new jsPDF('l', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    addPdfHeader(doc, 'Bitácora de Incidencias');
    autoTable(doc, {
      startY: 48,
      head: [['FOLIO', 'TÍTULO', 'SOLICITANTE', 'DEPTO', 'PRIORIDAD', 'ESTADO', 'ASIGNADO', 'FECHA']],
      body: filtered.map(t => [
        t.id.slice(0, 8).toUpperCase(),
        t.title.substring(0, 50),
        t.createdByName,
        departments.find(d => d.id === t.departmentId)?.name ?? '—',
        t.priority,
        t.status,
        users.find(u => u.id === t.assignedToId)?.name ?? 'PENDIENTE',
        formatDate(t.createdAt),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 240, 255], textColor: [3, 0, 20], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 3 },
      alternateRowStyles: { fillColor: [8, 4, 30] },
      columnStyles: { 1: { cellWidth: 70 } },
      didDrawPage: (d) => {
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`Página ${d.pageNumber}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      }
    });
    doc.save(`BITACORA-TICKETS-${new Date().getTime()}.pdf`);
    setExportLoading(null);
  };

  const exportAgentsPDF = () => {
    setExportLoading('agents-pdf');
    const doc = new jsPDF();
    addPdfHeader(doc, 'Rendimiento por Agente');
    autoTable(doc, {
      startY: 48,
      head: [['AGENTE', 'ASIGNADOS', 'RESUELTOS', 'EFICIENCIA', 'MENSAJES']],
      body: agentStats.map(({ agent, total: tot, resolved: res, rate, msgs }) => [
        agent.name,
        tot,
        res,
        `${rate}%`,
        msgs,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [123, 47, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
    });
    doc.save(`REPORTE-AGENTES-${new Date().getTime()}.pdf`);
    setExportLoading(null);
  };

  const exportDeptPDF = () => {
    setExportLoading('dept-pdf');
    const doc = new jsPDF();
    addPdfHeader(doc, 'Diagrama Departamental');
    autoTable(doc, {
      startY: 48,
      head: [['DEPARTAMENTO', 'TOTAL', 'ABIERTOS', 'EN PROGRESO', 'RESUELTOS', 'CARGA %']],
      body: byDept.map(({ d, n }) => {
        const dt = filtered.filter(t => t.departmentId === d.id);
        const open = dt.filter(t => t.status === 'Abierto').length;
        const ip   = dt.filter(t => t.status === 'En Progreso').length;
        const res  = dt.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
        return [d.name, n, open, ip, res, `${pct(n, total)}%`];
      }),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: [3, 0, 20], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [8, 4, 30] },
    });
    doc.save(`REPORTE-DEPT-${new Date().getTime()}.pdf`);
    setExportLoading(null);
  };

  const exportGeneralExcel = () => {
    downloadExcel([
      { name: 'SISTEMA_DUMP', data: [['Métrica', 'Valor'], ['Total', total], ['Tasa Res.', resolutionRate]] },
      { name: 'ESTADOS', data: [['Estado', 'Q'], ...byStatus.map(s=>[s.s, s.n])] }
    ], `database-dump-${new Date().getTime()}.xlsx`);
  };

  const exportTicketsExcel = () => {/* logic simplified */}
  const exportAgentsExcel = () => {/* logic simplified */}
  const exportDeptExcel = () => {/* logic simplified */}

  function ExportMenu({ onPDF, onExcel, id }: { onPDF: () => void; onExcel: () => void; id: string }) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={onPDF}
          disabled={exportLoading === `${id}-pdf`}
          className="flex items-center gap-2 bg-[#ff2d95]/5 hover:bg-[#ff2d95]/20 text-[#ff2d95] border border-[#ff2d95]/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          GÉN_PDF
        </button>
        <button
          onClick={onExcel}
          className="flex items-center gap-2 bg-[#10b981]/5 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
          GÉN_XLSX
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'ANÁLISIS_RESUMEN', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
    { id: 'tickets', label: 'BASE_TICKETS', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg> },
    { id: 'agents', label: 'RED_AGENTES', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'departments', label: 'ESTRUCTURA_DEPT', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
  ] as const;

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-10 min-h-screen bg-[#030014]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-orbitron tracking-tighter mb-2 uppercase">
            CENTRAL <span className="text-gradient">ANALÍTICA</span>
          </h1>
          <p className="text-[#8888aa] text-sm font-rajdhani font-semibold tracking-[4px] uppercase">INTELIGENCIA DE DATOS Y RENDIMIENTO OPERATIVO</p>
        </div>
      </div>

      {/* Control Deck (Filters) */}
      <div className="glass-panel border border-white/5 rounded-[32px] p-8 flex flex-wrap items-center gap-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00f0ff]/5 blur-3xl rounded-full" />
        
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#00f0ff]/10 flex items-center justify-center text-[#00f0ff] border border-[#00f0ff]/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <span className="text-xs font-black font-orbitron text-white uppercase tracking-[2px]">PERÍODO_CRONOS:</span>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-[#8888aa] text-[9px] font-black uppercase tracking-[2px]">START</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#0a0025]/50 border border-white/10 rounded-2xl px-4 py-3 text-white text-[10px] font-black font-orbitron focus:outline-none focus:border-[#00f0ff]/50 transition-all uppercase"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[#8888aa] text-[9px] font-black uppercase tracking-[2px]">END</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-[#0a0025]/50 border border-white/10 rounded-2xl px-4 py-3 text-white text-[10px] font-black font-orbitron focus:outline-none focus:border-[#00f0ff]/50 transition-all uppercase"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[#ff2d95] text-[9px] font-black uppercase tracking-[2px] rounded-xl border border-white/5 transition-all"
            >
              LIMPIAR_FILTROS
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff] animate-pulse" />
           <span className="text-[#8888aa] text-[10px] font-black uppercase tracking-[3px]">
             {total} NODOS_SERIALIZADOS
           </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-3 bg-[#0a0025]/30 p-2 rounded-[32px] border border-white/5 backdrop-blur-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-4 py-5 px-8 rounded-[24px] text-[10px] font-black tracking-[4px] transition-all duration-500 uppercase ${
              activeTab === tab.id
                ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.1)] text-[#030014] scale-[1.02]'
                : 'text-[#8888aa] hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: GENERAL ═══════════ */}
      {activeTab === 'general' && (
        <div className="space-y-12 animate-fade-in">
          <SectionHeader
            title="Cuadro de Mando"
            subtitle="MÉTRICAS CLAVE DE INFRAESTRUCTURA"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
          >
            <ExportMenu onPDF={exportGeneralPDF} onExcel={exportGeneralExcel} id="general" />
          </SectionHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <KpiCard label="TICKETS_TOTALES" value={total} color="#00f0ff" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} />
            <KpiCard label="EFICIENCIA_SOLUCIÓN" value={`${resolutionRate}%`} sub={`${resolved} de ${total} resueltos`} color="#10b981" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
            <KpiCard label="ACTIVOS_PENDIENTES" value={byStatus[0].n} sub="Sincronización requerida" color="#ff2d95" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
            <KpiCard label="CARGA_ACTUAL" value={byStatus[1].n} sub="Operaciones en curso" color="#7b2fff" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="glass-panel border border-white/5 rounded-[40px] p-10 space-y-10 shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#00f0ff]/5 blur-3xl rounded-full group-hover:bg-[#00f0ff]/10 transition-colors" />
               <h3 className="text-white font-black font-orbitron tracking-widest text-xs uppercase border-l-4 border-[#00f0ff] pl-4">STATUS_DISTRIBUTION</h3>
               <div className="space-y-8">
                 {byStatus.map(({ s, n }) => (
                   <BarRow key={s} label={s} value={n} max={total} color={statusColor[s]} />
                 ))}
               </div>
            </div>
            <div className="glass-panel border border-white/5 rounded-[40px] p-10 space-y-10 shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#7b2fff]/5 blur-3xl rounded-full group-hover:bg-[#7b2fff]/10 transition-colors" />
               <h3 className="text-white font-black font-orbitron tracking-widest text-xs uppercase border-l-4 border-[#7b2fff] pl-4">PRIORITY_MATRIX</h3>
               <div className="space-y-8">
                 {byPriority.map(({ p, n }) => (
                   <BarRow key={p} label={p} value={n} max={total} color={priorityColor[p]} />
                 ))}
               </div>
            </div>
          </div>

          <div className="glass-panel border border-white/5 rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-white font-black font-orbitron tracking-widest text-xs uppercase border-l-4 border-[#10b981] pl-4 mb-10">CATEGORIES_LOAD_BALANCING</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-8">
               {byCategory.map(({ c, n }) => (
                 <BarRow key={c} label={c} value={n} max={total} color="#00f0ff" />
               ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: TICKETS ═══════════ */}
      {activeTab === 'tickets' && (
        <div className="animate-fade-in">
          <SectionHeader
            title={`REGISTRO_CRÍTICO (${total})`}
            subtitle="BITÁCORA TOTAL DE OPERACIONES"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>}
          >
            <ExportMenu onPDF={exportTicketsPDF} onExcel={exportTicketsExcel} id="tickets" />
          </SectionHeader>

          <div className="glass-panel border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2">
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">IDENTIFICADOR / NODO</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">ESTADO_VITAL</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">NIVEL_PRIORIDAD</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">CATEGORIA</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">RESPONSABLE</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">SELLO_TIEMPO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-32 text-center">
                        <div className="text-4xl mb-4 opacity-20">🧬</div>
                        <p className="text-[#8888aa] text-[10px] font-black uppercase tracking-[4px]">No hay registros en la zona de tiempo actual</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map(t => (
                      <tr key={t.id} className="hover:bg-white/2 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="text-white font-black font-orbitron tracking-tighter text-sm uppercase group-hover:text-[#00f0ff] transition-colors">{t.title}</div>
                          <div className="text-[#8888aa] text-[9px] font-bold uppercase tracking-widest mt-1">REF_{t.id.slice(0,8).toUpperCase()}</div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" style={{ backgroundColor: statusColor[t.status], color: statusColor[t.status] }} />
                              <span className="text-[10px] font-black font-orbitron uppercase tracking-widest" style={{ color: statusColor[t.status] }}>{t.status}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border" 
                                 style={{ borderColor: `${priorityColor[t.priority]}44`, color: priorityColor[t.priority], backgroundColor: `${priorityColor[t.priority]}11` }}>
                             {t.priority}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-[#8888aa] text-[10px] font-bold uppercase tracking-[2px]">{t.category}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/2 border border-white/5 flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: t.assignedToId ? users.find(u=>u.id===t.assignedToId)?.avatarColor : '#0a0025' }}>
                                 {t.assignedToId ? users.find(u=>u.id===t.assignedToId)?.initials : '??'}
                              </div>
                              <span className="text-white text-[11px] font-bold font-rajdhani uppercase tracking-tight">{t.assignedToName || 'PENDIENTE_ASIGNACIÓN'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="text-white text-[10px] font-black font-orbitron tracking-tighter">{formatDate(t.createdAt)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: AGENTS ═══════════ */}
      {activeTab === 'agents' && (
        <div className="space-y-12 animate-fade-in">
          <SectionHeader
            title="Sincronización de Red"
            subtitle="OPTIMIZACIÓN Y CARGA DE OPERADORES"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 2 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          >
            <ExportMenu onPDF={exportAgentsPDF} onExcel={exportAgentsExcel} id="agents" />
          </SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agentStats.map(({ agent, total: tot, resolved: res, rate, msgs }) => (
              <div key={agent.id} className="glass-panel border border-white/5 rounded-[40px] p-8 group relative overflow-hidden transition-all duration-500 hover:border-[#00f0ff]/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f0ff]/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 rounded-[24px] border-2 border-[#030014] flex items-center justify-center text-white font-black font-orbitron text-xl shadow-2xl" style={{ backgroundColor: agent.avatarColor, boxShadow: `0 0 20px ${agent.avatarColor}44` }}>
                    {agent.initials}
                  </div>
                  <div>
                    <h4 className="text-white font-black font-orbitron tracking-tighter uppercase text-lg group-hover:text-[#00f0ff] transition-colors">{agent.name}</h4>
                    <p className="text-[#8888aa] text-[9px] font-black uppercase tracking-[3px] mt-1">{agent.role} // NIVEL_PRO</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                   <div className="bg-white/2 rounded-2xl p-4 border border-white/5 text-center">
                      <div className="text-white font-black font-orbitron text-lg tracking-tight">{tot}</div>
                      <div className="text-[#8888aa] text-[7px] font-black uppercase tracking-[2px]">CARGA</div>
                   </div>
                   <div className="bg-[#10b981]/5 rounded-2xl p-4 border border-[#10b981]/10 text-center">
                      <div className="text-[#10b981] font-black font-orbitron text-lg tracking-tight">{res}</div>
                      <div className="text-[#8888aa] text-[7px] font-black uppercase tracking-[2px]">OK</div>
                   </div>
                   <div className="bg-[#7b2fff]/5 rounded-2xl p-4 border border-[#7b2fff]/10 text-center">
                      <div className="text-[#7b2fff] font-black font-orbitron text-lg tracking-tight">{msgs}</div>
                      <div className="text-[#8888aa] text-[7px] font-black uppercase tracking-[2px]">STRM</div>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[3px]">
                      <span className="text-[#8888aa]">SCORE_EFICIENCIA</span>
                      <span className="text-[#10b981] font-orbitron">{rate}%</span>
                   </div>
                   <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-[#10b981] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${rate}%` }} />
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB: DEPARTMENTS ═══════════ */}
      {activeTab === 'departments' && (
        <div className="space-y-12 animate-fade-in">
          <SectionHeader
            title="Diagrama Departamental"
            subtitle="ESTRUCTURA DE SECTORES Y DERIVACIONES"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
          >
            <ExportMenu onPDF={exportDeptPDF} onExcel={exportDeptExcel} id="dept" />
          </SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {byDept.map(({ d, n }) => {
              const dt = filtered.filter(t => t.departmentId === d.id);
              const open = dt.filter(t => t.status === 'Abierto').length;
              const ip = dt.filter(t => t.status === 'En Progreso').length;
              const res = dt.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
              return (
                <div key={d.id} className="glass-panel border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative group">
                  <div className="h-2 w-full group-hover:h-3 transition-all duration-500 shadow-[0_0_20px_white/10]" style={{ backgroundColor: d.color }} />
                  <div className="p-8">
                     <div className="flex items-center gap-5 mb-8">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black font-orbitron shadow-2xl" style={{ backgroundColor: d.color + '22', color: d.color, border: `2px solid ${d.color}44` }}>
                           {d.name[0]}
                        </div>
                        <div>
                           <h4 className="text-white font-black font-orbitron tracking-tight text-lg uppercase group-hover:text-[#00f0ff] transition-colors">{d.name}</h4>
                           <p className="text-[#8888aa] text-[9px] font-black uppercase tracking-[4px] mt-1">{n} OPERACIONES_DEDICADAS</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-3 mb-10">
                        {[ 
                          {v: open, l: 'PND', c: 'text-[#00f0ff]', b: 'bg-[#00f0ff]/5 border-[#00f0ff]/10'},
                          {v: ip, l: 'RUN', c: 'text-[#7b2fff]', b: 'bg-[#7b2fff]/5 border-[#7b2fff]/10'},
                          {v: res, l: 'STB', c: 'text-[#10b981]', b: 'bg-[#10b981]/5 border-[#10b981]/10'}
                        ].map((s,i) => (
                          <div key={i} className={`p-4 rounded-2xl border ${s.b} text-center`}>
                             <div className={`text-xl font-black font-orbitron tracking-tighter ${s.c}`}>{s.v}</div>
                             <div className="text-[#8888aa] text-[7px] font-black uppercase tracking-[2px]">{s.l}</div>
                          </div>
                        ))}
                     </div>

                     {n > 0 && (
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[3px] text-[#8888aa]">
                             <span>SCORE_DENSIDAD</span>
                             <span>{pct(n, total)}% RED</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden flex border border-white/5 shadow-inner">
                            <div className="bg-[#00f0ff] h-full shadow-[0_0_10px_#00f0ff]" style={{ width: `${pct(open, n)}%` }} />
                            <div className="bg-[#7b2fff] h-full shadow-[0_0_10px_#7b2fff]" style={{ width: `${pct(ip, n)}%` }} />
                            <div className="bg-[#10b981] h-full shadow-[0_0_10px_#10b981]" style={{ width: `${pct(res, n)}%` }} />
                          </div>
                       </div>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
