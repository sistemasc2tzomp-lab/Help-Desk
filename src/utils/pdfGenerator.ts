import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ticket } from '../types';
import { formatDate } from './date';
import { logoBase64 } from './logoBase64';

const PURPLE_INST = [90, 45, 130];
const BLUE_TECH = [0, 174, 239];
const TEXT_DARK = [43, 43, 43];

const drawPageTemplate = (doc: jsPDF, ticket: any, departmentName: string = 'REGIDURÍA') => {
  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const marginX = 22;

  // Header
  doc.setFillColor(245, 246, 248);
  doc.rect(0, 0, pageWidth, 42, 'F');
  try {
     doc.addImage(logoBase64, 'PNG', marginX, 8, 24, 24); 
     doc.addImage(logoBase64, 'PNG', pageWidth - marginX - 24, 8, 24, 24); 
  } catch (e) {}

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PURPLE_INST[0], PURPLE_INST[1], PURPLE_INST[2]);
  doc.setFontSize(14);
  doc.text('SISTEMA DE TICKETS – TZOMPANTEPEC', pageWidth / 2, 36, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(BLUE_TECH[0], BLUE_TECH[1], BLUE_TECH[2]);
  doc.text('Unidad de Tecnologías de la Información y Comunicación', pageWidth / 2, 41, { align: 'center' });

  // Folio
  const folio = `FOLIO: AG-2026-${(ticket.folio || ticket.id.slice(0, 6)).toString().padStart(6, '0')}`;
  doc.setFontSize(11);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(folio, pageWidth - marginX, 52, { align: 'right' });
  doc.setDrawColor(PURPLE_INST[0], PURPLE_INST[1], PURPLE_INST[2]);
  doc.setLineWidth(0.8);
  doc.line(marginX, 55, pageWidth - marginX, 55);

  let curY = 62;

  // 1 — DATOS GENERALES
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('1 — DATOS GENERALES DEL TICKET', marginX, curY);
  autoTable(doc, {
    startY: curY + 2,
    margin: { left: marginX, right: marginX },
    tableWidth: pageWidth - (marginX * 2),
    body: [
      ['FECHA DE REGISTRO', formatDate(ticket.createdAt), 'DEPARTAMENTO', departmentName.toUpperCase()],
      ['USUARIO SOLICITANTE', ticket.createdByName.toUpperCase(), 'EQUIPO AFECTADO', (ticket.category || 'GENERAL').toUpperCase()],
      ['UBICACIÓN', 'PLANTA ALTA - C2', 'EXTENSIÓN / TEL', 'N/A']
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 35 }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 35 } }
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // 2 — INFORMACIÓN DEL INCIDENTE
  doc.setFont('helvetica', 'bold');
  doc.text('2 — INFORMACIÓN DEL INCIDENTE', marginX, curY);
  autoTable(doc, {
    startY: curY + 2,
    margin: { left: marginX, right: marginX },
    head: [['CATEGORÍA', 'PRIORIDAD', 'ESTADO', 'DTO. ASIGNADO']],
    body: [[ (ticket.category || 'GENERAL').toUpperCase(), (ticket.priority || 'ALTA').toUpperCase(), ticket.status.toUpperCase(), 'DEPARTAMENTO DE SISTEMAS C2' ]],
    theme: 'grid',
    headStyles: { fillColor: PURPLE_INST, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3, halign: 'center' }
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // Secciones 3, 4, 5
  const drawExpandingBox = (title: string, content: string, h: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(title, marginX, curY);
    doc.setDrawColor(200);
    doc.rect(marginX, curY + 2, pageWidth - (marginX * 2), h);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(content || 'Sin información adicional.', pageWidth - (marginX * 2) - 10), marginX + 5, curY + 8);
    curY += h + 8;
  };

  drawExpandingBox('3 — DESCRIPCIÓN DEL PROBLEMA', ticket.description, 25);
  drawExpandingBox('4 — DIAGNÓSTICO TÉCNICO', 'Análisis operativo realizado por el centro C2.', 20);
  drawExpandingBox('5 — SOLUCIÓN APLICADA', 'Atención brindada por el departamento de sistemas.', 20);

  // 6 — TIEMPOS DE ATENCIÓN
  doc.setFont('helvetica', 'bold');
  doc.text('6 — TIEMPOS DE ATENCIÓN Y SLA', marginX, curY);
  autoTable(doc, {
    startY: curY + 2,
    margin: { left: marginX, right: marginX },
    head: [['TIEMPO TOTAL RESPUESTA', 'DURACIÓN DE RESOLUCIÓN', 'CUMPLIMIENTO']],
    body: [['SINCRO SISTEMA', '0 MIN', 'OPTIMIZADO ✔️']],
    theme: 'striped',
    headStyles: { fillColor: BLUE_TECH, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3, halign: 'center' }
  });

  // DYNAMIC SIGNATURE POSITIONING
  let signY = (doc as any).lastAutoTable.finalY + 30;

  // Check if signatures fit on current page
  if (signY + 30 > pageHeight - 30) {
    doc.addPage();
    signY = 40;
  }

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(marginX, signY, marginX + 75, signY); 
  doc.line(pageWidth - marginX - 75, signY, pageWidth - marginX, signY); 

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text('RESPONSABLE TÉCNICO', marginX + 37.5, signY + 5, { align: 'center' });
  doc.text('FIRMA USUARIO SOLICITANTE', pageWidth - marginX - 37.5, signY + 5, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.text('DEPARTAMENTO DE SISTEMAS C2', marginX + 37.5, signY + 10, { align: 'center' });
  doc.text(ticket.createdByName.toUpperCase(), pageWidth - marginX - 37.5, signY + 10, { align: 'center' });

  // FIXED FOOTER
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PURPLE_INST[0], PURPLE_INST[1], PURPLE_INST[2]);
  doc.text('DEPARTAMENTO DE SISTEMAS C2 TZOMPANTEPEC', pageWidth / 2, pageHeight - 15, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Av. Zaragoza no. 1, San Salvador Tzompantepec Col. Centro C.P. 90490 Tel: 241-4152315', pageWidth / 2, pageHeight - 11, { align: 'center' });
};

export const generateProfessionalTicketReport = (doc: jsPDF, ticket: Ticket, departmentName?: string) => {
  drawPageTemplate(doc, ticket, departmentName);
  const folio = `AG-2026-${(ticket.folio || ticket.id.slice(0, 6)).toString().padStart(6, '0')}`;
  doc.save(`REPORTE_OFICIAL_${folio}.pdf`);
};

export const generateStatisticalReport = (options: {
  title: string,
  subtitle: string,
  tickets: any[],
  departments: any[],
  type: string
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const uniqueTickets = Array.from(new Map(options.tickets.map(t => [t.id, t])).values());

  uniqueTickets.forEach((t, i) => {
    if (i > 0) doc.addPage();
    const deptName = options.departments.find(d => d.id === t.departmentId)?.name || 'SOPORTE';
    drawPageTemplate(doc, t, deptName);
  });

  doc.save(`${options.title.replace(/\s+/g, '_')}_DETALLADO.pdf`);
};
