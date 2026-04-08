import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '../utils/logoBase64';

export default function ReportsRepository() {
  const { tickets, departments, theme, perfiles, onlineUsers } = useApp();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Helper for Chart colors based on theme
  const getChartColors = () => {
    return theme === 'dark' 
      ? { text: '#94a3b8', grid: 'rgba(255,255,255,0.05)', tooltip: '#0f172a' }
      : { text: '#475569', grid: 'rgba(0,0,0,0.05)', tooltip: '#ffffff' };
  };

  const chartColors = getChartColors();

  // Data Mappers for Dashboard
  const statusData = useMemo(() => [
    { name: 'Abiertos', value: tickets.filter(t => t.status === 'Abierto').length, color: '#3b82f6' },
    { name: 'En Progreso', value: tickets.filter(t => t.status === 'En Progreso').length, color: '#f59e0b' },
    { name: 'Resueltos', value: tickets.filter(t => t.status === 'Resuelto').length, color: '#10b981' }
  ].filter(d => d.value > 0), [tickets]);

  const priorityData = useMemo(() => [
    { name: 'Alta', value: tickets.filter(t => t.priority === 'Alta').length, color: '#ef4444' },
    { name: 'Media', value: tickets.filter(t => t.priority === 'Media').length, color: '#f59e0b' },
    { name: 'Baja', value: tickets.filter(t => t.priority === 'Baja').length, color: '#3b82f6' }
  ].filter(d => d.value > 0), [tickets]);

  const deptData = useMemo(() => departments.map(d => ({
    name: d.name,
    count: tickets.filter(t => t.departmentId === d.id).length
  })).filter(d => d.count > 0).sort((a,b) => b.count - a.count), [departments, tickets]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    tickets.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });
    return Object.entries(cats).map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [tickets]);



  // PDF Generation function
  const generateFullReport = () => {
    setIsGenerating('global');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const timestamp = new Date().toLocaleString();

      // Header
      doc.setFillColor(3, 30, 60); // Dark Institutional Blue
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      try { doc.addImage(logoBase64, 'PNG', 15, 5, 35, 35); } catch (e) { }

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('REPORTE MAESTRO DE CONTROL Y SERVICIOS - TZOMPANTEPEC', 60, 22);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`CORTE INFORMATIVO: ${timestamp} | AUDITORÍA DE SISTEMA HELP DESK C2`, 60, 32);

      // Section 1: Executive Summary
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('1. INDICADORES CLAVE DE DESEMPEÑO (KPIs)', 15, 60);
      
      autoTable(doc, {
        startY: 65,
        head: [['Métrica de Operación', 'Volumen', 'Estatus de Gestión', 'Impacto Administrativo']],
        body: [
          ['Total de Tickets Registrados', tickets.length.toString(), 'CONSOLIDADO', 'ALTO'],
          ['Atención Finalizada (Resueltos)', tickets.filter(t => t.status === 'Resuelto').length.toString(), 'EFECTIVO', 'POSITIVO'],
          ['Solicitudes en Bandeja (Abiertos)', tickets.filter(t => t.status === 'Abierto').length.toString(), 'PENDIENTE', 'CRÍTICO'],
          ['Gestión en Proceso', tickets.filter(t => t.status === 'En Progreso').length.toString(), 'ACTIVO', 'MODERADO'],
          ['Usuarios Interactuando Activamente', Object.keys(onlineUsers).length.toString(), 'REAL-TIME', 'DIRECTO']
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], halign: 'center' },
        styles: { fontSize: 10, cellPadding: 5 }
      });

      // Section 2: User Activity Monitoring
      doc.addPage();
      doc.setFontSize(16);
      doc.text('2. MONITOREO DE ACTIVIDAD Y CONECTIVIDAD', 15, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Listado de usuarios registrados y su estado actual de conexión en el sistema.', 15, 28);
      
      autoTable(doc, {
        startY: 35,
        head: [['Nombre de Usuario', 'Correo Electrónico', 'Rol Sistema', 'Estado Actual']],
        body: perfiles.map((p: any) => [
          p.nombre || 'N/A',
          p.correo || 'N/A',
          p.rol === 'admin' ? 'ADMINISTRADOR' : 'CLIENTE/DEPT',
          onlineUsers[p.id] ? 'CONECTADO' : 'DESCONECTADO'
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.text[0] === 'CONECTADO') data.cell.styles.textColor = [16, 185, 129];
            else data.cell.styles.textColor = [156, 163, 175];
          }
        }
      });

      // Section 3: Departmental Analytics
      doc.addPage();
      doc.setFontSize(16);
      doc.text('3. DESGLOSE POR COORDINACIÓN Y DEPARTAMENTO', 15, 20);
      
      autoTable(doc, {
        startY: 30,
        head: [['Unidad Administrativa', 'Tickets Totales', 'Carga Relativa (%)', 'Prioridad Promedio']],
        body: deptData.map(d => {
          const deptTickets = tickets.filter(t => t.departmentId === departments.find(dep => dep.name === d.name)?.id);
          const highCount = deptTickets.filter(t => t.priority === 'Alta').length;
          return [
            d.name, 
            d.count.toString(), 
            `${((d.count / (tickets.length || 1)) * 100).toFixed(1)}%`,
            highCount > (d.count / 2) ? 'CRÍTICA' : 'ESTÁNDAR'
          ];
        }),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] }
      });

      // Section 4: Detailed Inventory (The one that overlaps)
      doc.addPage();
      doc.setFontSize(16);
      doc.text('4. INVENTARIO COMPLETO DE INCIDENCIAS', 15, 20);
      
      autoTable(doc, {
        startY: 30,
        head: [['ID TICKET', 'SOLICITANTE', 'DEPARTAMENTO ATENCIÓN', 'CLASIFICACIÓN', 'PRIORIDAD', 'ESTADO', 'APERTURA']],
        body: tickets.map(t => [
          t.id.substring(0, 8).toUpperCase(),
          t.createdByName || 'AUTÓNOMO',
          departments.find(d => d.id === t.departmentId)?.name || 'NO ASIG.',
          t.category.toUpperCase(),
          t.priority,
          t.status.toUpperCase(),
          new Date(t.createdAt).toLocaleDateString()
        ]),
        styles: { 
          fontSize: 7, 
          overflow: 'linebreak',
          cellPadding: 2,
          minCellHeight: 8,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 40 },
          2: { cellWidth: 60 },
          3: { cellWidth: 50 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
          6: { cellWidth: 25 }
        },
        headStyles: { fillColor: [15, 23, 42], halign: 'center', fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });

      // Section 5: Global Metrics
      doc.addPage();
      doc.setFontSize(16);
      doc.text('5. DISTRIBUCIÓN GLOBAL DE SERVICIOS', 15, 20);
      
      autoTable(doc, {
        startY: 30,
        head: [['Top Problemas Principales (Categoría)', 'Frecuencia', 'Incidencia Global']],
        body: categoryData.map(c => [
          c.name,
          c.value.toString(),
          `${((c.value / (tickets.length || 1)) * 100).toFixed(1)}%`
        ]),
        headStyles: { fillColor: [16, 185, 129] }
      });

      doc.save(`REPORTE_TZOMPANTEPEC_MASTER_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error crítico al generar el PDF. Verifique los datos del sistema.');
    } finally {
      setIsGenerating(null);
    }
  };

  const generateSpecificReport = (reportType: string) => {
    if (reportType === 'global') {
      generateFullReport();
      return;
    }

    setIsGenerating(reportType);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const timestamp = new Date().toLocaleString();

      // Header
      doc.setFillColor(3, 30, 60); // Dark Institutional Blue
      doc.rect(0, 0, pageWidth, 45, 'F');
      try { doc.addImage(logoBase64, 'PNG', 15, 5, 35, 35); } catch (e) { }
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);

      let title = '';
      let head: string[][] = [];
      let body: any[][] = [];

      switch (reportType) {
        case 'usuarios':
          title = 'REPORTE DE USUARIOS Y NIVELES DE SEGURIDAD';
          head = [['Nombre', 'Correo', 'Rol/Nivel de Seguridad', 'Departamento', 'Estado Actual']];
          body = perfiles.map((p: any) => [
            p.nombre || 'N/A', p.correo || 'N/A', (p.rol || '').toUpperCase(),
            departments.find(d => d.id === p.departmentId)?.name || 'NO ASIGNADO',
            onlineUsers[p.id] ? 'CONECTADO' : 'DESCONECTADO'
          ]);
          break;
        case 'departamentos':
          title = 'REPORTE DE CARGA POR DEPARTAMENTOS';
          head = [['Departamento', 'Tickets Totales', 'Resueltos', 'Abiertos/Progreso', 'Frecuencia (%)']];
          body = departments.map(d => {
            const tkts = tickets.filter(t => t.departmentId === d.id);
            return [
              d.name, tkts.length.toString(),
              tkts.filter(t => t.status === 'Resuelto').length.toString(),
              tkts.filter(t => t.status !== 'Resuelto').length.toString(),
              `${((tkts.length / (tickets.length || 1)) * 100).toFixed(1)}%`
            ];
          });
          break;
        case 'clasificacion':
          title = 'REPORTE DE CLASIFICACIÓN DE INCIDENCIAS';
          head = [['Categoría del Problema', 'Incidencias Mapeadas', 'Porcentaje Global', 'Estatus Promedio']];
          body = categoryData.map(c => [
            c.name.toUpperCase(), c.value.toString(), `${((c.value / (tickets.length || 1)) * 100).toFixed(1)}%`, 'ESTÁNDAR'
          ]);
          break;
        case 'priorizacion':
          title = 'REPORTE EJECUTIVO DE PRIORIZACIÓN';
          head = [['Nivel de Prioridad', 'Total Reportado', 'Demandas Abiertas', 'Casos Resueltos']];
          body = ['Urgente', 'Alta', 'Media', 'Baja'].map(prio => {
            const pTkts = tickets.filter(t => t.priority === prio);
            return [
              prio.toUpperCase(), pTkts.length.toString(),
              pTkts.filter(t => t.status !== 'Resuelto').length.toString(),
              pTkts.filter(t => t.status === 'Resuelto').length.toString()
            ];
          });
          break;
        case 'diario':
          title = 'REPORTE CRONOLÓGICO DIARIO';
          head = [['Fecha', 'Nuevos Casos', 'Casos Resueltos', 'Completitud (%)']];
          const datesDaily: Record<string, { t: number, r: number }> = {};
          tickets.forEach(t => {
            const d = new Date(t.createdAt).toLocaleDateString();
            if (!datesDaily[d]) datesDaily[d] = { t: 0, r: 0 };
            datesDaily[d].t++;
            if (t.status === 'Resuelto') datesDaily[d].r++;
          });
          body = Object.entries(datesDaily).map(([date, counts]) => [date, counts.t.toString(), counts.r.toString(), counts.t > 0 ? `${((counts.r / counts.t) * 100).toFixed(1)}%` : '0%']);
          break;
        case 'mensual':
          title = 'REPORTE CRONOLÓGICO MENSUAL';
          head = [['Mes', 'Total Casos', 'Casos Resueltos', 'Desempeño']];
          const datesMonthly: Record<string, { t: number, r: number }> = {};
          tickets.forEach(t => {
            const dateObj = new Date(t.createdAt);
            const d = `${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
            if (!datesMonthly[d]) datesMonthly[d] = { t: 0, r: 0 };
            datesMonthly[d].t++;
            if (t.status === 'Resuelto') datesMonthly[d].r++;
          });
          body = Object.entries(datesMonthly).map(([month, counts]) => [month, counts.t.toString(), counts.r.toString(), counts.t > 0 ? `${((counts.r / counts.t) * 100).toFixed(1)}%` : '0%']);
          break;
        case 'ajustes':
          title = 'REPORTE DE SISTEMA Y AJUSTES';
          head = [['Módulo de Ajuste', 'Estado/Valor', 'Nivel de Control']];
          body = [
            ['Tema UI Actual', theme.toUpperCase(), 'LOCAL'],
            ['Sincronización Tiempo Real', 'ACTIVO', 'GLOBAL'],
            ['Conteo Total Usuarios', perfiles.length.toString(), 'GLOBAL'],
            ['Departamentos Activos', departments.length.toString(), 'GLOBAL'],
            ['Notificaciones Audio', 'HABILITADO', 'LOCAL']
          ];
          break;
        default:
          title = 'REPORTE ESPECÍFICO';
          break;
      }

      doc.text(title, 60, 22);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`CORTE INFORMATIVO: ${timestamp} | TIPO: ${reportType.toUpperCase()}`, 60, 32);

      autoTable(doc, {
        startY: 55,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], halign: 'center' },
        styles: { fontSize: 10, cellPadding: 4, textColor: [15, 23, 42] }
      });

      doc.save(`REPORTE_${reportType.toUpperCase()}_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error crítico al generar el PDF. Verifique los datos del sistema.');
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[var(--text)] tracking-tight">REPORTES REPOSITORY</h2>
          <p className="text-[var(--text-secondary)] mt-1 font-medium">Gestión documental y análisis de infraestructura Tzompantepec</p>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { id: 'global', title: 'Global', desc: 'Consolidado general', icon: '📄', color: 'bg-indigo-500' },
          { id: 'usuarios', title: 'Usuarios', desc: 'Análisis de seguridad', icon: '👥', color: 'bg-cyan-500' },
          { id: 'departamentos', title: 'Departamentos', desc: 'Carga por área', icon: '🏢', color: 'bg-blue-500' },
          { id: 'clasificacion', title: 'Clasificación', desc: 'Tipos de problemas', icon: '📋', color: 'bg-teal-500' },
          { id: 'priorizacion', title: 'Prioridad', desc: 'Gravedad de casos', icon: '⚠️', color: 'bg-orange-500' },
          { id: 'diario', title: 'Diario', desc: 'Tendencia por día', icon: '📅', color: 'bg-emerald-500' },
          { id: 'mensual', title: 'Mensual', desc: 'Tendencia por mes', icon: '📊', color: 'bg-purple-500' },
          { id: 'ajustes', title: 'Sistema/Ajustes', desc: 'Parametrización', icon: '⚙️', color: 'bg-slate-500' },
        ].map((rep) => (
          <button
            key={rep.id}
            onClick={() => generateSpecificReport(rep.id)}
            disabled={isGenerating !== null}
            className={`glass-panel p-4 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform text-left ${isGenerating === rep.id ? 'opacity-70 animate-pulse' : ''}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl text-white shadow-lg ${rep.color}`}>
              {rep.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-[var(--text)] font-bold text-sm tracking-wide">{rep.title}</h4>
              <p className="text-[var(--text-secondary)] text-[11px] leading-tight mt-0.5">{rep.desc}</p>
            </div>
            {isGenerating === rep.id ? (
              <svg className="animate-spin h-5 w-5 text-[var(--primary)]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--text-secondary)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            )}
          </button>
        ))}
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Main Charts */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-8 rounded-[2rem] border border-[var(--glass-border)] shadow-2xl">
            <h3 className="text-xs font-black text-[var(--text)] tracking-[4px] uppercase mb-8 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Saturación de Unidades Administrativas
            </h3>
            <div className="h-80" style={{ minHeight: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: chartColors.text, fontSize: 10, fontWeight: 'bold'}}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                    contentStyle={{ backgroundColor: chartColors.tooltip, border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={40}>
                    {deptData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#3b82f6'} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-8 rounded-[2rem] border border-[var(--glass-border)]">
              <h3 className="text-xs font-black text-[var(--text)] tracking-[4px] uppercase mb-8">Estado Operativo</h3>
              <div className="h-64" style={{ minHeight: 256 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-panel p-8 rounded-[2rem] border border-[var(--glass-border)]">
              <h3 className="text-xs font-black text-[var(--text)] tracking-[4px] uppercase mb-8">Nivel de Alerta</h3>
              <div className="h-64" style={{ minHeight: 256 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - User Presence & Top Issues */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-8 rounded-[2rem] border border-[var(--glass-border)] bg-indigo-600/5">
            <h3 className="text-xs font-black text-[var(--text)] tracking-[4px] uppercase mb-6">Monitoreo Presencial</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {perfiles.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${onlineUsers[user.id] ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-400 opacity-30'}`} />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-[var(--text)] truncate max-w-[120px]">{user.nombre || 'Sin Nombre'}</span>
                      <span className="text-[9px] text-[var(--text-secondary)] opacity-70 uppercase tracking-tighter">{user.rol}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${onlineUsers[user.id] ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
                    {onlineUsers[user.id] ? 'Activo' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border border-[var(--glass-border)]">
            <h3 className="text-xs font-black text-[var(--text)] tracking-[4px] uppercase mb-6">Top Clasificaciones</h3>
            <div className="space-y-6">
              {categoryData.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span>{cat.name}</span>
                    <span>{cat.value}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-1000" 
                      style={{ width: `${(cat.value / tickets.length) * 100}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
