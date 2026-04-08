import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TicketStatus, TicketPriority } from '../types';
import { formatDate } from '../utils/date';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { logoBase64 } from '../utils/logoBase64';

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
  'Abierto': '#ffffff',
  'En Progreso': '#cccccc',
  'Resuelto': '#999999',
  'Cerrado': '#666666',
};
const priorityColor: Record<string, string> = {
  'Urgente': '#ffffff',
  'Alta': '#aaaaaa',
  'Media': '#777777',
  'Baja': '#444444',
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
        <div className="w-16 h-16 rounded-3xl bg-white/2 border border-white/10 flex items-center justify-center text-[#ffffff] shadow-2xl">
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

/* ─── PDF Design System ────────────────────────────────────────────────────── */
const PDF_COLORS = {
  primary:    [15,  23,  42] as [number, number, number],   // Azul marino institucional
  secondary:  [30,  41,  59] as [number, number, number],   // Azul oscuro filas
  accent:     [59, 130, 246] as [number, number, number],   // Azul brillante
  accentDark: [29,  78, 216] as [number, number, number],   // Azul encabezado
  white:      [255, 255, 255] as [number, number, number],
  light:      [248, 250, 252] as [number, number, number],  // Fondo filas pares
  muted:      [100, 116, 139] as [number, number, number],  // Texto secundario
  border:     [203, 213, 225] as [number, number, number],  // Bordes tabla
  headerTxt:  [226, 232, 240] as [number, number, number],  // Texto headerRows
  bodyTxt:    [30,  41,  59] as [number, number, number],   // Texto celdas
  altRow:     [241, 245, 249] as [number, number, number],  // Fila alternada clara
  success:    [16, 185, 129] as [number, number, number],   // Verde resuelto
  warning:    [245, 158,  11] as [number, number, number],  // Naranja en progreso
  danger:     [239,  68,  68] as [number, number, number],  // Rojo urgente
};

const PDF_TABLE_STYLES: Parameters<typeof autoTable>[1] = {
  styles: {
    fontSize: 9,
    cellPadding: { top: 5, right: 8, bottom: 5, left: 8 },
    textColor: PDF_COLORS.bodyTxt,
    lineColor: PDF_COLORS.border,
    lineWidth: 0.3,
    font: 'helvetica',
  },
  headStyles: {
    fillColor: PDF_COLORS.accentDark,
    textColor: PDF_COLORS.white,
    fontStyle: 'bold',
    fontSize: 9,
    cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
  },
  alternateRowStyles: {
    fillColor: PDF_COLORS.altRow,
  },
  bodyStyles: {
    fillColor: PDF_COLORS.white,
  },
  tableLineColor: PDF_COLORS.border,
  tableLineWidth: 0.3,
};

function addPdfHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pw = doc.internal.pageSize.getWidth();

  // === FONDO SUAVE SUPERIOR (Soft Tint) ===
  doc.setFillColor(245, 250, 248); // Very light emerald/mint tint
  doc.rect(0, 0, pw, 40, 'F');

  // Franja de acento institucional sutil
  doc.setFillColor(16, 185, 129); // Emerald accent
  doc.rect(0, 39, pw, 1, 'F');

  // === ICONOS INSTITUCIONALES (LOGOS) ===
  // Izquierda: Logo Principal
  try {
    doc.addImage(logoBase64, 'PNG', 12, 10, 20, 20);
  } catch (e) {
    // Fallback if image fails
    doc.setFillColor(30, 41, 59, 0.05);
    doc.roundedRect(12, 10, 20, 20, 4, 4, 'F');
  }

  // Derecha: Logo Secundario (Simétrico para balance visual)
  try {
    doc.addImage(logoBase64, 'PNG', pw - 32, 10, 20, 20);
  } catch (e) {
    doc.setFillColor(30, 41, 59, 0.05);
    doc.roundedRect(pw - 32, 10, 20, 20, 4, 4, 'F');
  }

  // === LOGO / NOMBRE INSTITUCIONAL ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('H. AYUNTAMIENTO DE TZOMPANTEPEC', pw / 2, 16, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105); // Darker emerald for text
  doc.text('SISTEMA TICKETS — TZOMPANTEPEC', pw / 2, 24, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('UNIDAD DE TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIÓN', pw / 2, 30, { align: 'center' });


  // === TÍTULO DEL REPORTE ===
  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(title.toUpperCase(), 14, 48);
  }

  // === SUBTÍTULO DE SECCIÓN (si existe) ===
  if (subtitle) {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 45, pw - 28, 8, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(subtitle.toUpperCase(), 18, 50.5);
  }
}

function addPdfFooter(doc: jsPDF, pageNum: number, totalPages?: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // === AREA DE FIRMAS ===
  const footerY = ph - 45;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(30, footerY + 20, 90, footerY + 20); // Firma Izquierda
  doc.line(pw - 90, footerY + 20, pw - 30, footerY + 20); // Firma Derecha

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text('FIRMA RESPONSABLE TI', 60, footerY + 25, { align: 'center' });
  doc.text('FIRMA DE CONFORMIDAD USUARIO', pw - 60, footerY + 25, { align: 'center' });

  // Línea separadora pie
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(14, ph - 14, pw - 14, ph - 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text('SISTEMA TICKETS TZOMPANTEPEC — DOCUMENTO OFICIAL GENERADO AUTOMÁTICAMENTE — CONFIDENCIAL', 14, ph - 8);
  const pageLabel = totalPages ? `${pageNum} / ${totalPages}` : String(pageNum);
  doc.text(`PÁGINA ${pageLabel}`, pw - 14, ph - 8, { align: 'right' });
}

function addSectionLabel(doc: jsPDF, label: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.rect(14, y, pw - 28, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(label.toUpperCase(), 20, y + 6.2);
  return y + 14;
}

function addMetricBox(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, color: [number, number, number]) {
  doc.setFillColor(...PDF_COLORS.light);
  doc.roundedRect(x, y, w, 22, 2, 2, 'F');
  doc.setDrawColor(...color);
  doc.setLineWidth(1.5);
  doc.line(x, y, x, y + 22);
  doc.setLineWidth(0.3);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.roundedRect(x, y, w, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...color);
  doc.text(value, x + w / 2, y + 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(label.toUpperCase(), x + w / 2, y + 19.5, { align: 'center' });
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
  const { currentUser, tickets, users, departments, userActivity } = useApp();
  const [activeTab, setActiveTab] = useState<'general' | 'tickets' | 'agents' | 'departments' | 'adoption'>('general');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[70vh] text-center space-y-8 bg-[#030014]">
        <div className="w-24 h-24 rounded-[32px] bg-gray-600/10 border-2 border-gray-600/30 flex items-center justify-center animate-pulse">
           <svg className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div>
          <h2 className="text-white text-3xl font-black font-orbitron tracking-widest mb-4">ACCESO RESTRINGIDO</h2>
          <p className="text-[#8888aa] text-sm font-bold tracking-[3px] uppercase">Solo administradores pueden acceder a la central de datos</p>
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

  // --- NUEVAS MÉTRICAS ANALÍTICAS ---
  const byDay = useMemo(() => {
    const days: Record<string, number> = {};
    filtered.forEach(t => {
      const d = t.createdAt.split('T')[0];
      days[d] = (days[d] || 0) + 1;
    });
    return Object.entries(days).sort().slice(-15); // Últimos 15 días activos
  }, [filtered]);

  const byMonth = useMemo(() => {
    const months: Record<string, number> = {};
    filtered.forEach(t => {
      const m = t.createdAt.substring(0, 7); // YYYY-MM
      months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).sort();
  }, [filtered]);

  const topProblems = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const agentStats = agents.map(a => {
    const assigned = filtered.filter(t => t.assignedToId === a.id);
    const resolvedByAgent = assigned.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
    const msgs = assigned.reduce((sum, t) => sum + t.messages.filter(m => m.authorId === a.id).length, 0);
    return { agent: a, total: assigned.length, resolved: resolvedByAgent, rate: pct(resolvedByAgent, assigned.length), msgs };
  }).sort((a, b) => b.total - a.total);

  const exportGeneralPDF = () => {
    setExportLoading('general-pdf');
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pw = doc.internal.pageSize.getWidth();
      const startY = 50;

      addPdfHeader(doc, 'Reporte Maestro ADMIN CONTROL', 'Inteligencia de Datos e Incidencias');

      // ── BLOQUE DE MÉTRICAS KPI ──
      let y = startY;
      const boxW = (pw - 28 - 9) / 4;
      const kpis = [
        { label: 'Total Solicitudes',   value: String(total),           color: PDF_COLORS.accentDark },
        { label: 'Tasa Resolución',    value: `${resolutionRate}%`,    color: PDF_COLORS.success },
        { label: 'Pendientes',         value: String(byStatus[0].n),   color: PDF_COLORS.warning },
        { label: 'En Proceso',        value: String(byStatus[1].n),   color: PDF_COLORS.danger },
      ];
      kpis.forEach((k, i) => addMetricBox(doc, 14 + i * (boxW + 3), y, boxW, k.label, k.value, k.color));
      y += 30;

      // ── SECCIÓN: PROBLEMAS PRINCIPALES (CATEGORÍAS) ──
      y = addSectionLabel(doc, 'Jerarquía de Incidencias (Clasificación)', y);
      autoTable(doc, {
        ...PDF_TABLE_STYLES,
        startY: y,
        head: [['CATEGORÍA DE PROBLEMA', 'INCIDENCIAS DETECTADAS', 'IMPACTO %']],
        body: topProblems.map(([c, n]) => [c, n, `${pct(n, total)}%`]),
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center', fontStyle: 'bold', textColor: PDF_COLORS.accent },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── SECCIÓN: IMPACTO POR DEPARTAMENTO ──
      y = addSectionLabel(doc, 'Demanda Institucional por Departamento', y);
      const sortedDepts = [...byDept].sort((a, b) => b.n - a.n).slice(0, 10);
      autoTable(doc, {
        ...PDF_TABLE_STYLES,
        startY: y,
        head: [['DEPARTAMENTO', 'SOLICITUDES', 'PORCENTAJE DE CARGA']],
        body: sortedDepts.map(({ d, n }) => [d.name, n, `${pct(n, total)}%`]),
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center' },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 15;

      // Nueva Página para Gráficos de Tiempo y Prioridad
      doc.addPage();
      addPdfHeader(doc, 'Reporte Maestro ADMIN CONTROL', 'Análisis Temporal y Priorización');
      y = 55;

      // ── SECCIÓN: TENDENCIA POR DÍA ──
      y = addSectionLabel(doc, 'Dinámica de Incidencias por Día (Últimos 15 días)', y);
      autoTable(doc, {
        ...PDF_TABLE_STYLES,
        startY: y,
        head: [['FECHA', 'TICKETS GENERADOS', 'OBSERVACIÓN']],
        body: byDay.map(([fecha, n]) => [
          fecha, 
          n, 
          n > (total/15) * 1.5 ? 'PICO DE DEMANDA' : 'ESTABLE'
        ]),
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'center' } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── SECCIÓN: DISTRIBUCIÓN POR PRIORIDAD ──
      y = addSectionLabel(doc, 'Niveles críticos de Priorización', y);
      autoTable(doc, {
        ...PDF_TABLE_STYLES,
        startY: y,
        head: [['NIVEL DE PRIORIDAD', 'CANTIDAD', 'RELEVANCIA %']],
        body: byPriority.map(({ p, n }) => [p, n, `${pct(n, total)}%`]),
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center', fontStyle: 'bold' },
        },
      });

      // Pie de página
      addPdfFooter(doc, 1, 1);
      doc.save(`REPORTE-GENERAL-${new Date().getTime()}.pdf`);
    } finally {
      setExportLoading(null);
    }
  };

  const exportTicketsPDF = () => {
    setExportLoading('tickets-pdf');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      addPdfHeader(doc, 'Bitácora de Solicitudes', `Total de registros: ${filtered.length} solicitudes`);

      autoTable(doc, {
        ...PDF_TABLE_STYLES,
        startY: 55,
        head: [['FOLIO', 'ASUNTO', 'SOLICITANTE', 'DEPTO', 'CATEGORÍA', 'PRIORIDAD', 'ESTADO', 'FECHA']],
        body: filtered.map(t => [
          t.folio ? `TKT-${String(t.folio).padStart(4, '0')}` : t.id.slice(0, 8).toUpperCase(),
          t.title,
          t.createdByName.split(' ')[0],
          departments.find(d => d.id === t.departmentId)?.name ?? '—',
          t.category,
          t.priority,
          t.status,
          formatDate(t.createdAt).split(' ')[0],
        ]),
        columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold', textColor: PDF_COLORS.accentDark },
          1: { cellWidth: 70, overflow: 'linebreak' },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
          7: { cellWidth: 24 },
        },
        styles: { ...PDF_TABLE_STYLES.styles, fontSize: 8 },
        margin: { bottom: 60, left: 14, right: 14 },
        didDrawPage: (d) => {
          addPdfFooter(doc, d.pageNumber);
        },
      });
      // Actualizar total en todos los pies de página es complejo en jsPDF;
      // en su lugar se usa el número de página solo
      doc.save(`BITACORA-SOLICITUDES-${new Date().getTime()}.pdf`);
    } finally {
      setExportLoading(null);
    }
  };

  const exportAgentsPDF = () => {
    setExportLoading('agents-pdf');
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pw = doc.internal.pageSize.getWidth();
      addPdfHeader(doc, 'Productividad por Agente', 'Análisis de eficiencia operativa');

      // Métricas globales del equipo
      let y = 58;
      const totalAssigned = agentStats.reduce((s, a) => s + a.total, 0);
      const totalResolved  = agentStats.reduce((s, a) => s + a.resolved, 0);
      const avgRate = agentStats.length ? Math.round(agentStats.reduce((s, a) => s + a.rate, 0) / agentStats.length) : 0;
      const boxW = (pw - 28 - 6) / 3;
      [
        { label: 'Total Asignados',  value: String(totalAssigned), color: PDF_COLORS.accentDark },
        { label: 'Total Resueltos',  value: String(totalResolved),  color: PDF_COLORS.success },
        { label: 'Eficiencia Media', value: `${avgRate}%`,          color: PDF_COLORS.warning },
      ].forEach((k, i) => addMetricBox(doc, 14 + i * (boxW + 3), y, boxW, k.label, k.value, k.color));
      y += 30;

      y = addSectionLabel(doc, 'Tabla de Rendimiento Individual', y);
      autoTable(doc, {
        ...PDF_TABLE_STYLES,
        startY: y,
        head: [['AGENTE', 'ROL', 'SOLICITUDES ASIGNADAS', 'RESUELTAS', 'EFICIENCIA', 'MENSAJES ENVIADOS']],
        body: agentStats.map(({ agent, total: tot, resolved: res, rate, msgs }) => [
          agent.name,
          agent.role,
          tot,
          res,
          `${rate}%`,
          msgs,
        ]),
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center', textColor: PDF_COLORS.muted },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold', textColor: PDF_COLORS.accentDark },
          5: { halign: 'center' },
        },
        didDrawPage: (d) => addPdfFooter(doc, d.pageNumber),
      });

      addPdfFooter(doc, 1, 1);
      doc.save(`REPORTE-AGENTES-${new Date().getTime()}.pdf`);
    } finally {
      setExportLoading(null);
    }
  };

  const exportDeptPDF = () => {
    setExportLoading('dept-pdf');
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pw = doc.internal.pageSize.getWidth();
      addPdfHeader(doc, 'Análisis Departamental', 'Carga de trabajo segregada');

      let y = 58;
      const boxW2 = (pw - 28 - 6) / 3;
      [
        { label: 'Departamentos', value: String(departments.length), color: PDF_COLORS.accentDark },
        { label: 'Total Tickets',  value: String(total),              color: PDF_COLORS.accent },
        { label: 'Tasa Resolución',value: `${resolutionRate}%`,       color: PDF_COLORS.success },
      ].forEach((k, i) => addMetricBox(doc, 14 + i * (boxW2 + 3), y, boxW2, k.label, k.value, k.color));
      y += 30;

      y = addSectionLabel(doc, 'Carga Operativa por Departamento', y);
      autoTable(doc, {
        ...PDF_TABLE_STYLES,
        startY: y,
        head: [['DEPARTAMENTO', 'TOTAL', 'ABIERTOS', 'EN PROGRESO', 'RESUELTOS', 'CARGA DEL SISTEMA %']],
        body: byDept.map(({ d, n }) => {
          const dt = filtered.filter(t => t.departmentId === d.id);
          const open = dt.filter(t => t.status === 'Abierto').length;
          const ip   = dt.filter(t => t.status === 'En Progreso').length;
          const res  = dt.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
          return [d.name, n, open, ip, res, `${pct(n, total)}%`];
        }),
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 55 },
          1: { halign: 'center', fontStyle: 'bold' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center', fontStyle: 'bold', textColor: PDF_COLORS.accentDark },
        },
        didDrawPage: (d) => addPdfFooter(doc, d.pageNumber),
      });

      addPdfFooter(doc, 1, 1);
      doc.save(`REPORTE-DEPT-${new Date().getTime()}.pdf`);
    } finally {
      setExportLoading(null);
    }
  };

  const exportAdoptionPDF = () => {
    setExportLoading('adoption-pdf');
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      addPdfHeader(doc, 'Reporte de Adopción y Uso', 'Métricas de interacción institucional');

      let y = 55;
      const sortedUsers = [...users].sort((a,b) => {
        const cB = tickets.filter(t=>t.createdById===b.id).length;
        const cA = tickets.filter(t=>t.createdById===a.id).length;
        return cB - cA;
      });

      autoTable(doc, {
        ...PDF_TABLE_STYLES,
        startY: y,
        head: [['USUARIO', 'DEPARTAMENTO', 'TICKETS', 'ENGAGEMENT', 'ESTADO']],
        body: sortedUsers.map(u => {
          const count = tickets.filter(t => t.createdById === u.id).length;
          const lastSeen = userActivity[u.id];
          const isOnline = lastSeen && (Date.now() - new Date(lastSeen).getTime() < 300000);
          let engagement = count > 5 ? 'ALTO' : count > 0 ? 'MEDIO' : 'BAJO';
          return [u.name, departments.find(d=>d.id===u.departmentId)?.name || 'SISTEMAS', count, engagement, isOnline ? 'ONLINE' : 'OFFLINE'];
        }),
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { cellWidth: 45 },
          2: { halign: 'center' },
          3: { halign: 'center', fontStyle: 'bold' },
          4: { halign: 'center' },
        },
        didDrawPage: (d) => addPdfFooter(doc, d.pageNumber),
      });

      doc.save(`REPORTE-ADOPCION-${Date.now()}.pdf`);
    } finally {
      setExportLoading(null);
    }
  };

  const exportAdoptionExcel = () => {
    const data = [['Usuario', 'Departamento', 'Tickets Creados', 'Engagement', 'Estado Conexión']];
    users.forEach(u => {
      const count = tickets.filter(t => t.createdById === u.id).length;
      const lastSeen = userActivity[u.id];
      data.push([u.name, departments.find(d=>d.id===u.departmentId)?.name || 'S/D', String(count), count > 5 ? 'ALTO' : 'MEDIO', lastSeen ? 'ACTIVO' : 'INACTIVO']);
    });
    downloadExcel([{ name: 'Adopcion', data }], `engagement-usuarios-${Date.now()}.xlsx`);
  };

  const exportTicketsExcel = () => {
    const data = [['Folio', 'Título', 'Solicitante', 'Departamento', 'Prioridad', 'Estado', 'Categoría', 'Asignado', 'Fecha']];
    filtered.forEach(t => {
      data.push([
        t.id, t.title, t.createdByName, 
        departments.find(d => d.id === t.departmentId)?.name || 'N/A', 
        t.priority, t.status, t.category, 
        t.assignedToName || 'Pendiente', 
        formatDate(t.createdAt)
      ]);
    });
    downloadExcel([{ name: 'Tickets', data }], `bitacora-tickets-${Date.now()}.xlsx`);
  };

  const exportAgentsExcel = () => {
    const data = [['Agente', 'Rol', 'Total Asignados', 'Resueltos', 'Eficiencia %', 'Mensajes']];
    agentStats.forEach(as => {
      data.push([as.agent.name, as.agent.role, String(as.total), String(as.resolved), String(as.rate), String(as.msgs)]);
    });
    downloadExcel([{ name: 'Agentes', data }], `rendimiento-agentes-${Date.now()}.xlsx`);
  };

  const exportDeptExcel = () => {
    const data = [['Departamento', 'Total', 'Abiertos', 'En Progreso', 'Resueltos', 'Carga %']];
    byDept.forEach(({ d, n }) => {
      const dt = filtered.filter(t => t.departmentId === d.id);
      const open = dt.filter(t => t.status === 'Abierto').length;
      const ip = dt.filter(t => t.status === 'En Progreso').length;
      const res = dt.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado').length;
      data.push([d.name, String(n), String(open), String(ip), String(res), String(pct(n, total))]);
    });
    downloadExcel([{ name: 'Departamentos', data }], `analisis-depts-${Date.now()}.xlsx`);
  };

  function ExportMenu({ onPDF, onExcel, id }: { onPDF: () => void; onExcel: () => void; id: string }) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={onPDF}
          disabled={exportLoading === `${id}-pdf`}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          GÉN_PDF
        </button>
        <button
          onClick={onExcel}
          className="flex items-center gap-2 bg-white/2 hover:bg-white/5 text-gray-400 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
          GÉN_XLSX
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'ANÁLISIS_RESUMEN', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
    { id: 'tickets', label: 'BASE_SOLICITUDES', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg> },
    { id: 'agents', label: 'RED_AGENTES', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'departments', label: 'ESTRUCTURA_DEPT', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
    { id: 'adoption', label: 'ADOPCIÓN_USO', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg> },
  ] as const;

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-10 min-h-screen bg-[#030014]">
      {/* Header Premium con Iconos */}
      <div className="relative group">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10 border-b border-white/5 pb-8">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden group/icon">
                 <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                 <svg className="w-8 h-8 text-white relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-white font-orbitron tracking-tighter uppercase leading-none">
                  DATOS <span className="text-blue-400">&</span> REPORTES
                </h1>
                <p className="text-[#8888aa] text-[10px] font-black tracking-[4.5px] uppercase mt-2">INTELIGENCIA DE DATOS Y RENDIMIENTO OPERATIVO</p>
              </div>
           </div>
           
           <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
                 <div className="text-white text-[10px] font-black uppercase font-orbitron">Estado del Repositorio</div>
                 <div className="text-emerald-400 text-[9px] font-bold uppercase tracking-widest mt-1 animate-pulse">Sincronizado_OK</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                 <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
           </div>
        </div>
      </div>

      {/* Control Deck (Filters) */}
      <div className="glass-panel border border-white/5 rounded-[32px] p-8 flex flex-wrap items-center gap-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffffff]/5 blur-3xl rounded-full" />
        
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#ffffff]/10 flex items-center justify-center text-[#ffffff] border border-[#ffffff]/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <span className="text-xs font-black font-orbitron text-white uppercase tracking-[2px]">PERIODO DE BUSQUEDA REPORTE:</span>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-[#8888aa] text-[9px] font-black uppercase tracking-[2px]">START</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-4 py-3 text-white text-[10px] font-black font-orbitron focus:outline-none focus:border-[#ffffff]/50 transition-all uppercase"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[#8888aa] text-[9px] font-black uppercase tracking-[2px]">END</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-4 py-3 text-white text-[10px] font-black font-orbitron focus:outline-none focus:border-[#ffffff]/50 transition-all uppercase"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[#999999] text-[9px] font-black uppercase tracking-[2px] rounded-xl border border-white/5 transition-all"
            >
              LIMPIAR_FILTROS
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-[#ffffff] shadow-[0_0_10px_#ffffff] animate-pulse" />
           <span className="text-[#8888aa] text-[10px] font-black uppercase tracking-[3px]">
             {total} CLIENTES_SERIALIZADOS
           </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-3 bg-[#0f0a28]/30 p-2 rounded-[32px] border border-white/5 backdrop-blur-xl">
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
            title="REPORTES SISTEMA"
            subtitle="MÉTRICAS CLAVE DE INFRAESTRUCTURA"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
          >
            <ExportMenu onPDF={exportGeneralPDF} onExcel={exportGeneralExcel} id="general" />
          </SectionHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <KpiCard label="SOLICITUDES_TOTALES" value={total} color="#ffffff" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} />
            <KpiCard label="EFICIENCIA_SOLUCIÓN" value={`${resolutionRate}%`} sub={`${resolved} de ${total} resueltos`} color="#aaaaaa" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
            <KpiCard label="ACTIVOS_PENDIENTES" value={byStatus[0].n} sub="Sincronización requerida" color="#999999" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
            <KpiCard label="CARGA_ACTUAL" value={byStatus[1].n} sub="Operaciones en curso" color="#cccccc" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="glass-panel border border-white/5 rounded-[40px] p-10 space-y-10 shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#ffffff]/5 blur-3xl rounded-full group-hover:bg-[#ffffff]/10 transition-colors" />
               <h3 className="text-white font-black font-orbitron tracking-widest text-xs uppercase border-l-4 border-[#ffffff] pl-4">DISTRIBUCIÓN DE ESTADOS</h3>
               <div className="space-y-8">
                 {byStatus.map(({ s, n }) => (
                   <BarRow key={s} label={s} value={n} max={total} color={statusColor[s]} />
                 ))}
               </div>
            </div>
            <div className="glass-panel border border-white/5 rounded-[40px] p-10 space-y-10 shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#cccccc]/5 blur-3xl rounded-full group-hover:bg-[#cccccc]/10 transition-colors" />
               <h3 className="text-white font-black font-orbitron tracking-widest text-xs uppercase border-l-4 border-[#cccccc] pl-4">MATRIZ DE PRIORIDADES</h3>
               <div className="space-y-8">
                 {byPriority.map(({ p, n }) => (
                   <BarRow key={p} label={p} value={n} max={total} color={priorityColor[p]} />
                 ))}
               </div>
            </div>
          </div>

          <div className="glass-panel border border-white/5 rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-white font-black font-orbitron tracking-widest text-xs uppercase border-l-4 border-[#aaaaaa] pl-4 mb-10">BALANCEO DE CARGA POR CATEGORÍAS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-8">
               {byCategory.map(({ c, n }) => (
                 <BarRow key={c} label={c} value={n} max={total} color="#ffffff" />
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
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2">
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">IDENTIFICADOR / CLIENTE</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">ESTADO_VITAL</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">NIVEL_PRIORIDAD</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px] hidden lg:table-cell">CATEGORIA</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px]">RESPONSABLE</th>
                    <th className="px-8 py-6 text-[10px] font-black text-[#8888aa] uppercase tracking-[3px] hidden xl:table-cell">SELLO_TIEMPO</th>
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
                          <div className="text-white font-black font-orbitron tracking-tighter text-sm uppercase group-hover:text-[#ffffff] transition-colors">{t.title}</div>
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
                        <td className="px-8 py-6 hidden lg:table-cell">
                           <span className="text-[#8888aa] text-[10px] font-bold uppercase tracking-[2px]">{t.category}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/2 border border-white/5 flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: t.assignedToId ? users.find(u=>u.id===t.assignedToId)?.avatarColor : '#0f0a28' }}>
                                 {t.assignedToId ? users.find(u=>u.id===t.assignedToId)?.initials : '??'}
                              </div>
                              <span className="text-white text-[11px] font-bold font-rajdhani uppercase tracking-tight">{t.assignedToName?.split(' ')[0] || 'PENDIENTE'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 hidden xl:table-cell">
                           <div className="text-white text-[10px] font-black font-orbitron tracking-tighter">{formatDate(t.createdAt)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-white/5">
              {filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-3xl mb-4 opacity-20">🧬</div>
                  <p className="text-[#8888aa] text-[8px] font-black uppercase tracking-[3px]">Sin señales detectadas</p>
                </div>
              ) : (
                filtered.map(t => (
                  <div key={t.id} className="p-6 active:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-white font-black font-orbitron tracking-tight text-xs uppercase mb-1">{t.title}</div>
                        <div className="text-[#8888aa] text-[8px] font-bold tracking-widest uppercase">REF_{t.id.slice(0,6).toUpperCase()}</div>
                      </div>
                      <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter" style={{ backgroundColor: `${statusColor[t.status]}22`, color: statusColor[t.status], border: `1px solid ${statusColor[t.status]}44` }}>
                        {t.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: t.assignedToId ? users.find(u=>u.id===t.assignedToId)?.avatarColor : '#0f0a28' }}>
                          {t.assignedToId ? users.find(u=>u.id===t.assignedToId)?.initials : '??'}
                        </div>
                        <span className="text-[#8888aa] text-[9px] font-bold uppercase tracking-tight">{t.assignedToName?.split(' ')[0] || 'PENDIENTE'}</span>
                      </div>
                      <span className="text-[#8888aa] text-[9px] font-mono">{formatDate(t.createdAt).split(' ')[0]}</span>
                    </div>
                  </div>
                ))
              )}
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
              <div key={agent.id} className="glass-panel border border-white/5 rounded-[40px] p-8 group relative overflow-hidden transition-all duration-500 hover:border-[#ffffff]/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffffff]/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 rounded-[24px] border-2 border-[#030014] flex items-center justify-center text-white font-black font-orbitron text-xl shadow-2xl" style={{ backgroundColor: agent.avatarColor, boxShadow: `0 0 20px ${agent.avatarColor}44` }}>
                    {agent.initials}
                  </div>
                  <div>
                    <h4 className="text-white font-black font-orbitron tracking-tighter uppercase text-lg group-hover:text-[#ffffff] transition-colors">{agent.name}</h4>
                    <p className="text-[#8888aa] text-[9px] font-black uppercase tracking-[3px] mt-1">{agent.role} // NIVEL_PRO</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                   <div className="bg-white/2 rounded-2xl p-4 border border-white/5 text-center">
                      <div className="text-white font-black font-orbitron text-lg tracking-tight">{tot}</div>
                      <div className="text-[#8888aa] text-[7px] font-black uppercase tracking-[2px]">CARGA</div>
                   </div>
                   <div className="bg-[#aaaaaa]/5 rounded-2xl p-4 border border-[#aaaaaa]/10 text-center">
                      <div className="text-[#aaaaaa] font-black font-orbitron text-lg tracking-tight">{res}</div>
                      <div className="text-[#8888aa] text-[7px] font-black uppercase tracking-[2px]">OK</div>
                   </div>
                   <div className="bg-[#cccccc]/5 rounded-2xl p-4 border border-[#cccccc]/10 text-center">
                      <div className="text-[#cccccc] font-black font-orbitron text-lg tracking-tight">{msgs}</div>
                      <div className="text-[#8888aa] text-[7px] font-black uppercase tracking-[2px]">STRM</div>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[3px]">
                      <span className="text-[#8888aa]">SCORE_EFICIENCIA</span>
                      <span className="text-[#aaaaaa] font-orbitron">{rate}%</span>
                   </div>
                   <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-[#aaaaaa] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${rate}%` }} />
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
                           <h4 className="text-white font-black font-orbitron tracking-tight text-lg uppercase group-hover:text-[#ffffff] transition-colors">{d.name}</h4>
                           <p className="text-[#8888aa] text-[9px] font-black uppercase tracking-[4px] mt-1">{n} OPERACIONES_DEDICADAS</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-3 mb-10">
                        {[ 
                          {v: open, l: 'PND', c: 'text-[#ffffff]', b: 'bg-[#ffffff]/5 border-[#ffffff]/10'},
                          {v: ip, l: 'RUN', c: 'text-[#cccccc]', b: 'bg-[#cccccc]/5 border-[#cccccc]/10'},
                          {v: res, l: 'STB', c: 'text-[#aaaaaa]', b: 'bg-[#aaaaaa]/5 border-[#aaaaaa]/10'}
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
                            <div className="bg-[#ffffff] h-full shadow-[0_0_10px_#ffffff]" style={{ width: `${pct(open, n)}%` }} />
                            <div className="bg-[#cccccc] h-full shadow-[0_0_10px_#cccccc]" style={{ width: `${pct(ip, n)}%` }} />
                            <div className="bg-[#aaaaaa] h-full shadow-[0_0_10px_#aaaaaa]" style={{ width: `${pct(res, n)}%` }} />
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

      {/* ═══════════ TAB: ADOPTION ═══════════ */}
      {activeTab === 'adoption' && (
        <div className="space-y-12 animate-fade-in">
          <SectionHeader
            title="Adopción y Compromiso"
            subtitle="ANÁLISIS DE INTERACCIÓN POR DEPARTAMENTO"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>}
          >
            <ExportMenu onPDF={exportAdoptionPDF} onExcel={exportAdoptionExcel} id="adoption" />
          </SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[ 
              { label: 'EMBAJADORES (100%)', count: users.filter(u => tickets.filter(t => t.createdById === u.id).length > 5).length, color: '#ffffff', desc: 'Uso Intensivo' },
              { label: 'ACTIVOS', count: users.filter(u => { const c = tickets.filter(t => t.createdById === u.id).length; return c > 0 && c <= 5; }).length, color: '#cccccc', desc: 'Uso Frecuente' },
              { label: 'POCO USO', count: users.filter(u => { const c = tickets.filter(t => t.createdById === u.id).length; return c === 0 && userActivity[u.id]; }).length, color: '#aaaaaa', desc: 'Conexión esporádica' },
              { label: 'NUNCA', count: users.filter(u => !userActivity[u.id]).length, color: '#666666', desc: 'Sin registro de acceso' }
            ].map((stat, i) => (
              <div key={i} className="glass-panel p-6 border border-white/5 rounded-3xl text-center">
                <div className="text-3xl font-black font-orbitron mb-2" style={{ color: stat.color }}>{stat.count}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-white/80">{stat.label}</div>
                <div className="text-[7px] font-medium uppercase tracking-tight text-[#8888aa] mt-1">{stat.desc}</div>
              </div>
            ))}
          </div>

          <div className="glass-panel border border-white/5 rounded-[40px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/2">
                    <th className="px-8 py-6 text-[9px] font-black text-[#8888aa] uppercase tracking-[3px]">Usuario / Depto</th>
                    <th className="px-8 py-6 text-[9px] font-black text-[#8888aa] uppercase tracking-[3px]">Engagement</th>
                    <th className="px-8 py-6 text-[9px] font-black text-[#8888aa] uppercase tracking-[3px]">Conexión</th>
                    <th className="px-8 py-6 text-[9px] font-black text-[#8888aa] uppercase tracking-[3px]">Tickets</th>
                    <th className="px-8 py-6 text-[9px] font-black text-[#8888aa] uppercase tracking-[3px]">Última Vez</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.sort((a,b) => {
                    const cB = tickets.filter(t=>t.createdById===b.id).length;
                    const cA = tickets.filter(t=>t.createdById===a.id).length;
                    return cB - cA;
                  }).map(u => {
                    const userTicketsCount = tickets.filter(t => t.createdById === u.id).length;
                    const lastSeen = userActivity[u.id];
                    const isOnline = lastSeen && (Date.now() - new Date(lastSeen).getTime() < 300000); // 5 mins
                    
                    let level = 'NUNCA';
                    let levelColor = '#444444';
                    if (userTicketsCount > 5) { level = '100% (ALTO)'; levelColor = '#ffffff'; }
                    else if (userTicketsCount > 0) { level = 'MEDIO'; levelColor = '#cccccc'; }
                    else if (lastSeen) { level = 'BAJO'; levelColor = '#8888aa'; }

                    return (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg" style={{ backgroundColor: u.avatarColor }}>{u.initials}</div>
                            <div>
                               <div className="text-white font-black font-orbitron tracking-tight text-xs uppercase">{u.name}</div>
                               <div className="text-[#8888aa] text-[8px] font-bold uppercase tracking-widest">{departments.find(d=>d.id===u.departmentId)?.name || 'SISTEMAS'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <span className="text-[9px] font-black font-orbitron" style={{ color: levelColor }}>{level}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500/30'}`} />
                              <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-400' : 'text-white/20'}`}>
                                {isOnline ? 'CONECTADO' : 'OFFLINE'}
                              </span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-white font-black font-orbitron text-xs">{userTicketsCount}</span>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-[#8888aa] text-[9px] font-mono uppercase">
                             {lastSeen ? new Date(lastSeen).toLocaleString('es-MX', { hour12: false, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'SIN REGISTRO'}
                           </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
