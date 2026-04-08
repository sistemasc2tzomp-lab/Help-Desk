import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '../utils/logoBase64';

export default function ReportsRepository() {
  const { tickets, departments, theme } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper for Chart colors based on theme
  const getChartColors = () => {
    return theme === 'dark' 
      ? { text: '#94a3b8', grid: 'rgba(255,255,255,0.05)', tooltip: '#0f172a' }
      : { text: '#475569', grid: 'rgba(0,0,0,0.05)', tooltip: '#ffffff' };
  };

  const chartColors = getChartColors();

  // Data Mappers
  const statusData = [
    { name: 'Abiertos', value: tickets.filter(t => t.status === 'Abierto').length, color: '#3b82f6' },
    { name: 'En Progreso', value: tickets.filter(t => t.status === 'En Progreso').length, color: '#f59e0b' },
    { name: 'Resueltos', value: tickets.filter(t => t.status === 'Resuelto').length, color: '#10b981' }
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: 'Alta', value: tickets.filter(t => t.priority === 'Alta').length, color: '#ef4444' },
    { name: 'Media', value: tickets.filter(t => t.priority === 'Media').length, color: '#f59e0b' },
    { name: 'Baja', value: tickets.filter(t => t.priority === 'Baja').length, color: '#3b82f6' }
  ].filter(d => d.value > 0);

  const deptData = departments.map(d => ({
    name: d.name,
    count: tickets.filter(t => t.departmentId === d.id).length
  })).filter(d => d.count > 0).sort((a,b) => b.count - a.count);

  // PDF Generation function
  const generateFullReport = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const timestamp = new Date().toLocaleString();

      // Header
      doc.setFillColor(3, 0, 20); // Dark Blue Header
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      try {
        doc.addImage(logoBase64, 'PNG', 15, 5, 30, 30);
      } catch (e) { /* ignore */ }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('REPORTE INSTITUCIONAL DE SERVICIOS - TZOMPANTEPEC', 55, 20);
      doc.setFontSize(10);
      doc.text(`Generado: ${timestamp} | Sistema de Atención Ciudadana C2`, 55, 28);

      // Section 1: Dashboard Summary
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFontSize(16);
      doc.text('1. RESUMEN EJECUTIVO', 15, 55);
      
      autoTable(doc, {
        startY: 60,
        head: [['Métrica', 'Total', 'Estado']],
        body: [
          ['Total de Tickets Registrados', tickets.length.toString(), 'GENERAL'],
          ['Tickets Resueltos (Cerrados)', tickets.filter(t => t.status === 'Resuelto').length.toString(), 'FINALIZADO'],
          ['Atención Pendiente (Abiertos)', tickets.filter(t => t.status === 'Abierto').length.toString(), 'CRÍTICO'],
          ['En Curso de Atención', tickets.filter(t => t.status === 'En Progreso').length.toString(), 'OPERATIVO']
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Section 2: Department Load Table
      doc.addPage();
      doc.text('2. CARGA DE TRABAJO POR COORDINACIÓN / DEPARTAMENTO', 15, 20);
      
      autoTable(doc, {
        startY: 30,
        head: [['Departamento', 'Cantidad de Solicitudes', 'Porcentaje del Total']],
        body: deptData.map(d => [
          d.name, 
          d.count.toString(), 
          `${((d.count / (tickets.length || 1)) * 100).toFixed(1)}%`
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] }
      });

      // Section 3: Detailed Ticket Inventory
      doc.addPage();
      doc.text('3. INVENTARIO DETALLADO DE INCIDENCIAS', 15, 20);
      
      autoTable(doc, {
        startY: 30,
        head: [['ID', 'Usuario', 'Departamento', 'Categoría', 'Prioridad', 'Estado', 'Fecha']],
        body: tickets.map(t => [
          t.id.substring(0, 8),
          t.createdByName || 'Sin Nombre',
          departments.find(d => d.id === t.departmentId)?.name || 'N/A',
          t.category,
          t.priority,
          t.status,
          new Date(t.createdAt).toLocaleDateString()
        ]),
        styles: { fontSize: 8, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 20 },
          2: { cellWidth: 50 },
          3: { cellWidth: 40 }
        },
        headStyles: { fillColor: [15, 23, 42] }
      });

      // Section 4: Breakdown by Status
      doc.addPage();
      doc.text('4. DISTRIBUCIÓN POR ESTADO OPERATIVO', 15, 20);
      autoTable(doc, {
        startY: 30,
        head: [['Estado', 'Cantidad', 'Impacto']],
        body: statusData.map(s => [s.name, s.value.toString(), `${((s.value / (tickets.length || 1)) * 100).toFixed(1)}%`]),
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Section 5: Breakdown by Priority
      doc.text('5. DISTRIBUCIÓN POR NIVEL DE PRIORIDAD', 15, (doc as any).lastAutoTable.finalY + 20);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 25,
        head: [['Prioridad', 'Cantidad', 'Relevancia']],
        body: priorityData.map(p => [p.name, p.value.toString(), `${((p.value / (tickets.length || 1)) * 100).toFixed(1)}%`]),
        headStyles: { fillColor: [239, 68, 68] }
      });

      // Section 6: Classification/Category
      const catMap: Record<string, number> = {};
      tickets.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + 1; });
      const catData = Object.entries(catMap).sort((a,b) => b[1] - a[1]);

      doc.addPage();
      doc.text('6. ANÁLISIS POR CLASIFICACIÓN DE INCIDENCIA', 15, 20);
      autoTable(doc, {
        startY: 30,
        head: [['Categoría / Tipo', 'Frecuencia', 'Incidencia %']],
        body: catData.map(([name, count]) => [name, count.toString(), `${((count / (tickets.length || 1)) * 100).toFixed(1)}%`]),
        headStyles: { fillColor: [16, 185, 129] }
      });

      doc.save(`Reporte_Maestro_Tzomp_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte PDF. Por favor, intente de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[var(--text)] tracking-tight">REPOSITORIO DE REPORTES</h2>
          <p className="text-[var(--text-secondary)] mt-1 font-medium">Análisis institucional avanzado y métricas de desempeño</p>
        </div>
        
        <button
          onClick={generateFullReport}
          disabled={isGenerating}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold tracking-widest uppercase text-xs hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20"
        >
          {isGenerating ? (
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
          {isGenerating ? 'Generando...' : 'Descargar Reporte Institucional PDF'}
        </button>
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="glass-panel p-6 rounded-3xl border border-[var(--glass-border)] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
          </div>
          <h3 className="text-sm font-black text-[var(--text)] tracking-[3px] uppercase mb-8">Estado de Solicitudes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: chartColors.tooltip, border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'var(--text)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {statusData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}} />
                <span className="text-[10px] font-bold text-[var(--text)] uppercase">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Load */}
        <div className="glass-panel p-6 rounded-3xl border border-[var(--glass-border)] shadow-xl md:col-span-2">
          <h3 className="text-sm font-black text-[var(--text)] tracking-[3px] uppercase mb-8">Saturación por Coordinación</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: chartColors.text, fontSize: 9, fontWeight: 'bold'}}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: chartColors.text, fontSize: 9}}
                />
                <Tooltip 
                  cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                  contentStyle={{ backgroundColor: chartColors.tooltip, border: 'none', borderRadius: '12px' }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {deptData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#94a3b8'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="glass-panel p-6 rounded-3xl border border-[var(--glass-border)] shadow-xl">
          <h3 className="text-sm font-black text-[var(--text)] tracking-[3px] uppercase mb-8">Niveles de Prioridad</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Trend */}
        <div className="glass-panel p-6 rounded-3xl border border-[var(--glass-border)] shadow-xl md:col-span-2">
          <h3 className="text-sm font-black text-[var(--text)] tracking-[3px] uppercase mb-8">Tendencia de Incidencias</h3>
          <div className="h-64 text-center flex items-center justify-center border-2 border-dashed border-[var(--glass-border)] rounded-2xl">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">
              Análisis temporal de datos en tiempo real...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
