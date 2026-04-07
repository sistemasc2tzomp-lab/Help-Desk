import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ticket } from '../types';
import { formatDate } from './date';

export const generateProfessionalTicketReport = (doc: jsPDF, ticket: Ticket, departmentName?: string) => {
  // Configuración de Hoja Carta (Letter): 215.9 x 279.4 mm
  const pageWidth = 215.9;
  const pageHeight = 279.4;
  
  // Colores mejorados y más suaves
  const primarySoftColor: [number, number, number] = [250, 251, 252]; // Softest Slate
  const headerTextColor: [number, number, number] = [30, 41, 59];    // Slate 800
  const detailColor: [number, number, number] = [220, 38, 38];      // Red for folio
  
  const marginX = 20;
  
  // -- Header Background (Softer) --
  doc.setFillColor(primarySoftColor[0], primarySoftColor[1], primarySoftColor[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // -- Institutional Icons (Simulated as geometric professional shapes) --
  // Icono Izq (Escudo)
  doc.setFillColor(51, 65, 85, 0.1);
  doc.circle(marginX + 5, 22, 10, 'F');
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.5);
  doc.text('🛡️', marginX + 2, 25); // Placeholder emoji while we don't have base64
  
  // Icono Der (Tecnología)
  doc.circle(pageWidth - marginX - 5, 22, 10, 'F');
  doc.text('⚙️', pageWidth - marginX - 8, 25);
  
  // -- Title --
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
  doc.setFontSize(16);
  doc.text('HELP DESK TZOMPANTEPEC', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('COORDINACIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIONES', pageWidth / 2, 26, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text('REPORTE OFICIAL DE INCIDENCIAS Y SERVICIOS', pageWidth / 2, 34, { align: 'center' });

  // -- Folio Badge --
  const folioText = ticket.folio ? `FOLIO NO. ${ticket.folio.toString().padStart(6, '0')}` : `ID: ${ticket.id.slice(0, 8).toUpperCase()}`;
  doc.setFont('courier', 'bold');
  doc.setTextColor(detailColor[0], detailColor[1], detailColor[2]);
  doc.setFontSize(12);
  doc.text(folioText, pageWidth - marginX, 20, { align: 'right' });
  
  // -- Metadata Section --
  let currentY = 55;
  doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETALLES TÉCNICOS DE LA SOLICITUD', marginX, currentY);
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY + 2, pageWidth - marginX, currentY + 2);
  
  currentY += 8;

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [['ATRIBUTO', 'INFORMACIÓN REGISTRADA']],
    body: [
      ['ASUNTO DEL PROBLEMA', ticket.title.toUpperCase()],
      ['CLASIFICACIÓN', (ticket.category || 'GENERAL').toUpperCase()],
      ['DEPARTAMENTO', (departmentName || 'ÁREA GENERAL').toUpperCase()],
      ['SOLICITANTE', ticket.createdByName.toUpperCase()],
      ['TÉCNICO RESPONSABLE', (ticket.assignedToName && ticket.assignedToName !== 'En espera' ? ticket.assignedToName : 'PENDIENTE DE ASIGNACIÓN').toUpperCase()],
      ['ESTADO OPERATIVO', ticket.status.toUpperCase()],
      ['FECHA Y HORA REGISTRO', formatDate(ticket.createdAt).toUpperCase()],
    ],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', lineColor: [226, 232, 240], lineWidth: 0.1 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] } }
  });
  
  // -- Problem Description (Expanded) --
  currentY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DESCRIPCIÓN Y CLASIFICACIÓN DEL REQUERIMIENTO', marginX, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const splitDesc = doc.splitTextToSize(ticket.description, pageWidth - (marginX * 2));
  doc.text(splitDesc, marginX, currentY + 7);
  
  // -- Footer Area (Firma y Avisos) --
  const signY = pageHeight - 50;
  
  // Signature Lines
  const lineW = 65;
  const col1X = marginX + (lineW / 2);
  const col2X = pageWidth - marginX - (lineW / 2);
  
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(col1X - (lineW/2), signY, col1X + (lineW/2), signY);
  doc.line(col2X - (lineW/2), signY, col2X + (lineW/2), signY);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
  doc.text('FIRMA DE CONFORMIDAD SOLICITANTE', col1X, signY + 5, { align: 'center' });
  doc.text('AUTORIZACIÓN / ÁREA TÉCNICA', col2X, signY + 5, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(ticket.createdByName.toUpperCase(), col1X, signY + 9, { align: 'center' });
  doc.text('SISTEMA DE GESTIÓN IT - TZOMPANTEPEC', col2X, signY + 9, { align: 'center' });
  
  // Institutional Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const footerText = 'Este documento es un comprobante oficial emitido por el sistema centralizado de soporte técnico de Tzompantepec.';
  doc.text(footerText, pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text(`Página 1 de 1 · Generado por Soporte Técnico · ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

  // Save with appropriate filename
  const fileName = ticket.folio ? `HELP_DE_TZOMP_F${ticket.folio}.pdf` : `REPORTE_T${ticket.id.slice(0, 6).toUpperCase()}.pdf`;
  doc.save(fileName);
};
