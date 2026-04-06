import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ticket } from '../types';
import { formatDate } from './date';

export const generateProfessionalTicketReport = (doc: jsPDF, ticket: Ticket, departmentName?: string) => {
  const primaryColor = [3, 0, 20]; // #030014 (Deep Night)
  const accentColor = [0, 240, 255]; // #00f0ff (Cyber Cyan)
  
  // -- Header --
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('HELP DESK TZOMPANTEPEC', 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTE OFICIAL DE SOLICITUD', 15, 32);
  
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`REF: ${ticket.id.slice(0, 8).toUpperCase()}`, 195, 25, { align: 'right' });
  
  // -- Info Block --
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DE LA SOLICITUD', 15, 55);
  
  // Horizontal line
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 58, 195, 58);
  
  autoTable(doc, {
    startY: 65,
    head: [['Campo', 'Información']],
    body: [
      ['Título', ticket.title.toUpperCase()],
      ['Departamento', (departmentName || 'GENERAL').toUpperCase()],
      ['Estado', ticket.status.toUpperCase()],
      ['Prioridad', ticket.priority.toUpperCase()],
      ['Creado por', ticket.createdByName.toUpperCase()],
      ['Fecha de Inicio', formatDate(ticket.createdAt).toUpperCase()],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
  });
  
  // -- Description --
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPCIÓN', 15, finalY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitDescription = doc.splitTextToSize(ticket.description, 180);
  doc.text(splitDescription, 15, finalY + 8);
  
  // -- Flow --
  if (ticket.messages && ticket.messages.length > 0) {
    const flowY = finalY + (splitDescription.length * 5) + 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIAL DE RESOLUCIÓN', 15, flowY);
    
    autoTable(doc, {
      startY: flowY + 5,
      head: [['Fecha', 'Autor', 'Contenido']],
      body: ticket.messages.map(m => [
        formatDate(m.timestamp).toUpperCase(),
        m.authorName.toUpperCase(),
        m.content
      ]),
      theme: 'grid',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
      styles: { fontSize: 8 }
    });
  }
  
  // -- Footer --
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`HELP DESK TZOMPANTEPEC - Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
    doc.text(`Documento generado electrónicamente el ${new Date().toLocaleString()}`, 105, 290, { align: 'center' });
  }
  
  doc.save(`SOLICITUD_${ticket.id.slice(0, 8).toUpperCase()}.pdf`);
};
