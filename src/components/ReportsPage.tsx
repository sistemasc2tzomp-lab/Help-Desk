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
const CATEGORIES = ['Técnico', 'Facturación', 'Bug', 'Feature', 'General'];

const statusColor: Record<TicketStatus, string> = {
  'Abierto': '#3b82f6',
  'En Progreso': '#eab308',
  'Resuelto': '#10b981',
  'Cerrado': '#64748b',
};
const priorityColor: Record<string, string> = {
  'Urgente': '#ef4444',
  'Alta': '#f97316',
  'Media': '#eab308',
  'Baja': '#64748b',
};

function count<T extends string>(arr: T[], val: T) {
  return arr.filter(x => x === val).length;
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

/* ─── mini components ─────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
      <div className="text-slate-400 text-xs uppercase tracking-widest mb-2">{label}</div>
      <div className="text-3xl font-bold mb-1" style={{ color }}>{value}</div>
      {sub && <div className="text-slate-500 text-xs">{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const w = max === 0 ? 0 : (value / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-sm w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-white/5 rounded-full h-2.5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
      <span className="text-white text-sm font-semibold w-8 text-right">{value}</span>
    </div>
  );
}

function SectionHeader({ title, icon, children }: { title: string; icon: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
          {icon}
        </div>
        <h2 className="text-white font-bold text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ─── PDF generators ───────────────────────────────────────────────────────── */
function addPdfHeader(doc: jsPDF, title: string) {
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SoporteHub', 14, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 210 - 14, 13, { align: 'right' });
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 29);
  doc.setDrawColor(229, 231, 235);
  doc.line(14, 32, 196, 32);
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

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const { currentUser, tickets, users, departments } = useApp();
  const [activeTab, setActiveTab] = useState<'general' | 'tickets' | 'agents' | 'departments'>('general');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // Admin-only guard
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
          <p className="text-slate-400">Solo los administradores pueden ver los reportes.</p>
        </div>
      </div>
    );
  }

  /* ── filter tickets by date ── */
  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (dateFrom && t.createdAt < dateFrom) return false;
      if (dateTo && t.createdAt > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [tickets, dateFrom, dateTo]);

  const total = filtered.length;
  const agents = users.filter(u => u.role === 'Agente' || u.role === 'Admin');

  /* ── stats ── */
  const byStatus = STATUSES.map(s => ({ s, n: count(filtered.map(t => t.status), s) }));
  const byPriority = PRIORITIES.map(p => ({ p, n: count(filtered.map(t => t.priority), p) }));
  const byCategory = CATEGORIES.map(c => ({ c, n: filtered.filter(t => t.category === c).length }));
  const byDept = departments.map(d => ({ d, n: filtered.filter(t => t.departmentId === d.id).length }));
  const maxStatus = Math.max(...byStatus.map(x => x.n), 1);
  const maxPriority = Math.max(...byPriority.map(x => x.n), 1);
  const maxCat = Math.max(...byCategory.map(x => x.n), 1);
  const maxDept = Math.max(...byDept.map(x => x.n), 1);

  const resolved = filtered.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
  const resolutionRate = pct(resolved, total);

  const agentStats = agents.map(a => {
    const assigned = filtered.filter(t => t.assignedToId === a.id);
    const resolvedByAgent = assigned.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
    const msgs = assigned.reduce((sum, t) => sum + t.messages.filter(m => m.authorId === a.id).length, 0);
    return { agent: a, total: assigned.length, resolved: resolvedByAgent, rate: pct(resolvedByAgent, assigned.length), msgs };
  }).sort((a, b) => b.total - a.total);

  /* ══ PDF EXPORTS ══ */

  const exportGeneralPDF = () => {
    setExportLoading('general-pdf');
    const doc = new jsPDF();
    addPdfHeader(doc, 'Reporte General');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen Ejecutivo', 14, 42);

    // KPI boxes
    const kpis = [
      { label: 'Total Tickets', val: total, color: [79, 70, 229] as [number,number,number] },
      { label: 'Abiertos', val: byStatus[0].n, color: [59, 130, 246] as [number,number,number] },
      { label: 'En Progreso', val: byStatus[1].n, color: [234, 179, 8] as [number,number,number] },
      { label: 'Resueltos', val: byStatus[2].n + byStatus[3].n, color: [16, 185, 129] as [number,number,number] },
    ];
    kpis.forEach((k, i) => {
      const x = 14 + i * 46;
      doc.setFillColor(k.color[0], k.color[1], k.color[2]);
      doc.roundedRect(x, 48, 42, 22, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(String(k.val), x + 21, 60, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(k.label, x + 21, 66, { align: 'center' });
    });

    // By Status table
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución por Estado', 14, 82);
    autoTable(doc, {
      startY: 86,
      head: [['Estado', 'Cantidad', '% del Total']],
      body: byStatus.map(({ s, n }) => [s, n, `${pct(n, total)}%`]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución por Prioridad', 14, y2);
    autoTable(doc, {
      startY: y2 + 4,
      head: [['Prioridad', 'Cantidad', '% del Total']],
      body: byPriority.map(({ p, n }) => [p, n, `${pct(n, total)}%`]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    const y3 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución por Categoría', 14, y3);
    autoTable(doc, {
      startY: y3 + 4,
      head: [['Categoría', 'Cantidad', '% del Total']],
      body: byCategory.map(({ c, n }) => [c, n, `${pct(n, total)}%`]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    doc.save(`reporte-general-${new Date().toISOString().slice(0, 10)}.pdf`);
    setExportLoading(null);
  };

  const exportTicketsPDF = () => {
    setExportLoading('tickets-pdf');
    const doc = new jsPDF({ orientation: 'landscape' });
    addPdfHeader(doc, 'Listado de Tickets');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`Listado de Tickets (${total})`, 14, 42);
    autoTable(doc, {
      startY: 48,
      head: [['#', 'Título', 'Estado', 'Prioridad', 'Categoría', 'Creado por', 'Asignado a', 'Fecha']],
      body: filtered.map((t, i) => [
        i + 1,
        t.title.length > 35 ? t.title.slice(0, 35) + '…' : t.title,
        t.status,
        t.priority,
        t.category,
        t.createdByName,
        t.assignedToName || '—',
        formatDate(t.createdAt),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save(`listado-tickets-${new Date().toISOString().slice(0, 10)}.pdf`);
    setExportLoading(null);
  };

  const exportAgentsPDF = () => {
    setExportLoading('agents-pdf');
    const doc = new jsPDF();
    addPdfHeader(doc, 'Rendimiento de Agentes');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Rendimiento de Agentes', 14, 42);
    autoTable(doc, {
      startY: 48,
      head: [['Agente', 'Rol', 'Asignados', 'Resueltos', '% Resolución', 'Mensajes']],
      body: agentStats.map(a => [
        a.agent.name,
        a.agent.role,
        a.total,
        a.resolved,
        `${a.rate}%`,
        a.msgs,
      ]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save(`rendimiento-agentes-${new Date().toISOString().slice(0, 10)}.pdf`);
    setExportLoading(null);
  };

  const exportDeptPDF = () => {
    setExportLoading('dept-pdf');
    const doc = new jsPDF();
    addPdfHeader(doc, 'Reporte por Departamentos');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Tickets por Departamento', 14, 42);
    autoTable(doc, {
      startY: 48,
      head: [['Departamento', 'Total Tickets', 'Abiertos', 'En Progreso', 'Resueltos', '% del Total']],
      body: byDept.map(({ d, n }) => {
        const dTickets = filtered.filter(t => t.departmentId === d.id);
        return [
          d.name,
          n,
          dTickets.filter(t => t.status === 'Abierto').length,
          dTickets.filter(t => t.status === 'En Progreso').length,
          dTickets.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length,
          `${pct(n, total)}%`,
        ];
      }),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save(`reporte-departamentos-${new Date().toISOString().slice(0, 10)}.pdf`);
    setExportLoading(null);
  };

  /* ══ EXCEL EXPORTS ══ */

  const exportGeneralExcel = () => {
    downloadExcel([
      {
        name: 'KPIs', data: [
          ['Métrica', 'Valor'],
          ['Total Tickets', total],
          ['Tasa de Resolución', `${resolutionRate}%`],
          ['Abiertos', byStatus[0].n],
          ['En Progreso', byStatus[1].n],
          ['Resueltos', byStatus[2].n],
          ['Cerrados', byStatus[3].n],
        ]
      },
      {
        name: 'Por Estado', data: [
          ['Estado', 'Cantidad', '% del Total'],
          ...byStatus.map(({ s, n }) => [s, n, `${pct(n, total)}%`]),
        ]
      },
      {
        name: 'Por Prioridad', data: [
          ['Prioridad', 'Cantidad', '% del Total'],
          ...byPriority.map(({ p, n }) => [p, n, `${pct(n, total)}%`]),
        ]
      },
      {
        name: 'Por Categoría', data: [
          ['Categoría', 'Cantidad', '% del Total'],
          ...byCategory.map(({ c, n }) => [c, n, `${pct(n, total)}%`]),
        ]
      },
    ], `reporte-general-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportTicketsExcel = () => {
    downloadExcel([{
      name: 'Tickets',
      data: [
        ['ID', 'Título', 'Descripción', 'Estado', 'Prioridad', 'Categoría', 'Departamento', 'Creado por', 'Asignado a', 'Fecha Creación'],
        ...filtered.map(t => [
          t.id,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.category,
          departments.find(d => d.id === t.departmentId)?.name || '—',
          t.createdByName,
          t.assignedToName || '—',
          formatDate(t.createdAt),
        ]),
      ]
    }], `tickets-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportAgentsExcel = () => {
    downloadExcel([{
      name: 'Agentes',
      data: [
        ['Agente', 'Email', 'Rol', 'Tickets Asignados', 'Resueltos', '% Resolución', 'Mensajes enviados'],
        ...agentStats.map(a => [
          a.agent.name,
          a.agent.email,
          a.agent.role,
          a.total,
          a.resolved,
          `${a.rate}%`,
          a.msgs,
        ]),
      ]
    }], `agentes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportDeptExcel = () => {
    downloadExcel([{
      name: 'Departamentos',
      data: [
        ['Departamento', 'Total Tickets', 'Abiertos', 'En Progreso', 'Resueltos', 'Cerrados', '% del Total'],
        ...byDept.map(({ d, n }) => {
          const dt = filtered.filter(t => t.departmentId === d.id);
          return [
            d.name,
            n,
            dt.filter(t => t.status === 'Abierto').length,
            dt.filter(t => t.status === 'En Progreso').length,
            dt.filter(t => t.status === 'Resuelto').length,
            dt.filter(t => t.status === 'Cerrado').length,
            `${pct(n, total)}%`,
          ];
        }),
      ]
    }], `departamentos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  /* ── Export button ── */
  function ExportMenu({ onPDF, onExcel, id }: { onPDF: () => void; onExcel: () => void; id: string }) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onPDF}
          disabled={exportLoading === `${id}-pdf`}
          className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          PDF
        </button>
        <button
          onClick={onExcel}
          className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
          Excel
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: '📊' },
    { id: 'tickets', label: 'Tickets', icon: '🎫' },
    { id: 'agents', label: 'Agentes', icon: '👥' },
    { id: 'departments', label: 'Departamentos', icon: '🏢' },
  ] as const;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes y Estadísticas</h1>
          <p className="text-slate-400 text-sm mt-1">Análisis completo del sistema de soporte</p>
        </div>
      </div>

      {/* Date filters */}
      <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span className="text-slate-400 text-sm font-medium">Filtrar por fecha:</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-xs">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#13151f] border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-xs">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-[#13151f] border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Limpiar
            </button>
          )}
        </div>
        <div className="ml-auto text-slate-500 text-xs">
          {total} tickets {dateFrom || dateTo ? 'en el período' : 'en total'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1d2e] border border-white/5 rounded-2xl p-1.5 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: GENERAL ═══════════ */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div>
            <SectionHeader
              title="Resumen General"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>}
            >
              <ExportMenu onPDF={exportGeneralPDF} onExcel={exportGeneralExcel} id="general" />
            </SectionHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Tickets" value={total} color="#7C3AED" />
              <KpiCard label="Tasa de Resolución" value={`${resolutionRate}%`} sub={`${resolved} de ${total} resueltos`} color="#10b981" />
              <KpiCard label="Tickets Abiertos" value={byStatus[0].n} sub="Pendientes de atención" color="#3b82f6" />
              <KpiCard label="En Progreso" value={byStatus[1].n} sub="Siendo atendidos" color="#eab308" />
            </div>
          </div>

          {/* By Status + Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Por Estado</h3>
              <div className="space-y-3">
                {byStatus.map(({ s, n }) => (
                  <div key={s}>
                    <BarRow label={s} value={n} max={maxStatus} color={statusColor[s]} />
                    <div className="text-right text-xs text-slate-600 -mt-0.5">{pct(n, total)}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Por Prioridad</h3>
              <div className="space-y-3">
                {byPriority.map(({ p, n }) => (
                  <div key={p}>
                    <BarRow label={p} value={n} max={maxPriority} color={priorityColor[p]} />
                    <div className="text-right text-xs text-slate-600 -mt-0.5">{pct(n, total)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* By Category */}
          <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Por Categoría</h3>
            <div className="space-y-3">
              {byCategory.map(({ c, n }) => (
                <div key={c}>
                  <BarRow label={c} value={n} max={maxCat} color="#7C3AED" />
                  <div className="text-right text-xs text-slate-600 -mt-0.5">{pct(n, total)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: TICKETS ═══════════ */}
      {activeTab === 'tickets' && (
        <div>
          <SectionHeader
            title={`Listado de Tickets (${total})`}
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>}
          >
            <ExportMenu onPDF={exportTicketsPDF} onExcel={exportTicketsExcel} id="tickets" />
          </SectionHeader>

          <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Título</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Estado</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Prioridad</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Categoría</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Creado por</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Asignado a</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-slate-500 py-12">
                        No hay tickets en el período seleccionado
                      </td>
                    </tr>
                  ) : (
                    filtered.map(t => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium max-w-[200px] truncate">{t.title}</div>
                          <div className="text-slate-500 text-xs mt-0.5">{t.category}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: statusColor[t.status] + '22', color: statusColor[t.status] }}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: priorityColor[t.priority] + '22', color: priorityColor[t.priority] }}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{t.category}</td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{t.createdByName}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{t.assignedToName || <span className="text-slate-600">—</span>}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(t.createdAt)}</td>
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
        <div>
          <SectionHeader
            title="Rendimiento de Agentes"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          >
            <ExportMenu onPDF={exportAgentsPDF} onExcel={exportAgentsExcel} id="agents" />
          </SectionHeader>

          {/* Agent cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {agentStats.map(({ agent, total: tot, resolved: res, rate, msgs }) => (
              <div key={agent.id} className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: agent.avatarColor }}>
                    {agent.initials}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{agent.name}</div>
                    <div className="text-slate-500 text-xs">{agent.role} · {agent.email}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/5 rounded-xl p-2.5">
                    <div className="text-white font-bold text-lg">{tot}</div>
                    <div className="text-slate-500 text-xs">Asignados</div>
                  </div>
                  <div className="bg-emerald-500/10 rounded-xl p-2.5">
                    <div className="text-emerald-400 font-bold text-lg">{res}</div>
                    <div className="text-slate-500 text-xs">Resueltos</div>
                  </div>
                  <div className="bg-indigo-500/10 rounded-xl p-2.5">
                    <div className="text-indigo-400 font-bold text-lg">{msgs}</div>
                    <div className="text-slate-500 text-xs">Mensajes</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Tasa de resolución</span>
                    <span className="text-white font-semibold">{rate}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {agentStats.length === 0 && (
              <div className="col-span-3 text-center py-12 text-slate-500">No hay agentes registrados</div>
            )}
          </div>

          {/* Table */}
          <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Agente</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Rol</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Asignados</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Resueltos</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">% Resolución</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Mensajes</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map(({ agent, total: tot, resolved: res, rate, msgs }) => (
                  <tr key={agent.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: agent.avatarColor }}>{agent.initials}</div>
                        <div>
                          <div className="text-white text-sm font-medium">{agent.name}</div>
                          <div className="text-slate-500 text-xs">{agent.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${agent.role === 'Admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{agent.role}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-white font-semibold">{tot}</td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-semibold">{res}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-white text-xs font-semibold">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-indigo-400 font-semibold">{msgs}</td>
                  </tr>
                ))}
                {agentStats.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-slate-500 py-10">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: DEPARTMENTS ═══════════ */}
      {activeTab === 'departments' && (
        <div>
          <SectionHeader
            title="Reporte por Departamentos"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
          >
            <ExportMenu onPDF={exportDeptPDF} onExcel={exportDeptExcel} id="dept" />
          </SectionHeader>

          {departments.length === 0 ? (
            <div className="text-center py-20 text-slate-500">No hay departamentos configurados</div>
          ) : (
            <>
              {/* Dept cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {byDept.map(({ d, n }) => {
                  const dt = filtered.filter(t => t.departmentId === d.id);
                  const open = dt.filter(t => t.status === 'Abierto').length;
                  const ip = dt.filter(t => t.status === 'En Progreso').length;
                  const res = dt.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
                  return (
                    <div key={d.id} className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
                      <div className="h-1 w-full" style={{ backgroundColor: d.color }} />
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold" style={{ backgroundColor: d.color + '22', color: d.color }}>
                            {d.name[0]}
                          </div>
                          <div>
                            <div className="text-white font-semibold">{d.name}</div>
                            <div className="text-slate-500 text-xs">{n} tickets · {pct(n, total)}% del total</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-blue-500/10 rounded-lg p-2">
                            <div className="text-blue-400 font-bold text-lg">{open}</div>
                            <div className="text-slate-500">Abiertos</div>
                          </div>
                          <div className="bg-yellow-500/10 rounded-lg p-2">
                            <div className="text-yellow-400 font-bold text-lg">{ip}</div>
                            <div className="text-slate-500">En Progreso</div>
                          </div>
                          <div className="bg-emerald-500/10 rounded-lg p-2">
                            <div className="text-emerald-400 font-bold text-lg">{res}</div>
                            <div className="text-slate-500">Resueltos</div>
                          </div>
                        </div>
                        {n > 0 && (
                          <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                            <div className="bg-blue-500 h-full" style={{ width: `${pct(open, n)}%` }} />
                            <div className="bg-yellow-500 h-full" style={{ width: `${pct(ip, n)}%` }} />
                            <div className="bg-emerald-500 h-full" style={{ width: `${pct(res, n)}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bar chart */}
              <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Tickets por Departamento</h3>
                <div className="space-y-3">
                  {byDept.map(({ d, n }) => (
                    <BarRow key={d.id} label={d.name} value={n} max={maxDept} color={d.color} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
