import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TicketStatus, TicketPriority } from '../types';
import { formatDate } from '../utils/date';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

function generateProfessionalTicketReport(doc: jsPDF, ticket: any, dept: any) {
  // Config
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Box
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('HELP DESK TZOMP', 14, 20);
  
  doc.setFontSize(10);
  doc.text('SISTEMAS & INTELIGENCIA ARTIFICIAL', 14, 28);
  doc.setTextColor(100, 100, 100);
  doc.text('MUNICIPIO DE TZOMPANTEPEC, TLAXCALA', 14, 34);

  // Ticket ID (Right aligned)
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(14);
  doc.text(`FOLIO: ${ticket.id.toUpperCase()}`, pageWidth - 14, 25, { align: 'right' });
  
  // Body Space
  let y = 60;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE LA SOLICITUD', 14, y);
  doc.line(14, y + 2, pageWidth - 14, y + 2);
  
  y += 15;
  autoTable(doc, {
    startY: y,
    head: [['Campo', 'Valor']],
    body: [
      ['Título', ticket.title.toUpperCase()],
      ['Prioridad', ticket.priority.toUpperCase()],
      ['Estado Actual', ticket.status.toUpperCase()],
      ['Departamento', dept?.name.toUpperCase() || 'GENERAL'],
      ['Solicitante', ticket.createdByName.toUpperCase()],
      ['Fecha de Reporte', formatDate(ticket.createdAt)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
    styles: { fontSize: 10, cellPadding: 5 }
  });

  y = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.text('DESCRIPCION DETALLADA', 14, y);
  doc.line(14, y+2, pageWidth - 14, y + 2);
  
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(ticket.description, pageWidth - 28);
  doc.text(splitDesc, 14, y);
  
  y += (splitDesc.length * 5) + 20;
  
  // Footer / Signature Area
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 260, 80, 260);
  doc.text('FIRMA SOLICITANTE', 14, 265);
  
  doc.line(pageWidth - 80, 260, pageWidth - 14, 260);
  doc.text('FIRMA AREA TECNICA', pageWidth - 14, 265, { align: 'right' });
  
  doc.save(`SOLICITUD-${ticket.id.slice(0,6)}.pdf`);
}

const statusColors: Record<TicketStatus, string> = {
  'Abierto': 'bg-white/10 text-white border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]',
  'En Progreso': 'bg-white/5 text-gray-300 border border-white/10 shadow-[0_0_10px_rgba(200,200,200,0.05)]',
  'Resuelto': 'bg-white/20 text-white border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]',
  'Cerrado': 'bg-white/2 text-gray-500 border border-white/5',
};

const priorityColors: Record<string, string> = {
  'Urgente': 'text-white border-white/40 bg-white/10',
  'Alta': 'text-gray-200 border-white/20 bg-white/5',
  'Media': 'text-gray-400 border-white/10 bg-white/2',
  'Baja': 'text-gray-600 border-white/5 bg-white/1',
};

export default function TicketDetail() {
  const {
    selectedTicketId, getTicketById, currentUser,
    updateTicketStatus, updateTicketPriority, assignTicket, autoAssignAdminOnOpen,
    addMessage, users, departments, setPage, refreshData,
  } = useApp();

  const ticket = getTicketById(selectedTicketId || '');
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  // Reply image attachment
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyPreview, setReplyPreview] = useState<string | null>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Auto-scroll to latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  // ── Auto-asignación al admin que abre el ticket ────────────────────────────
  useEffect(() => {
    if (selectedTicketId && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Agente')) {
      autoAssignAdminOnOpen(selectedTicketId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicketId, currentUser?.id]);

  // ── Supabase Realtime subscription for live chat ──────────────────────────
  useEffect(() => {
    if (!selectedTicketId || !isSupabaseConfigured()) return;
    const sb = getSupabase();
    // THE REALTIME CHANNEL MUST TARGET THE REAL TABLE 'ticket_comentarios'
    const channel = sb
      .channel(`ticket-messages-${selectedTicketId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'ticket_comentarios', 
          filter: `ticket_id=eq.${selectedTicketId}` 
        },
        () => { 
          console.log('Realtime update: New comment detected');
          refreshData(); 
        }
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [selectedTicketId, refreshData]);


  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] text-center space-y-6">
        <div className="text-6xl animate-bounce">🔍</div>
        <h2 className="text-white font-black font-orbitron tracking-widest text-xl">NODO NO LOCALIZADO</h2>
        <p className="text-[#8888aa] text-xs font-bold tracking-[3px] uppercase">El ticket solicitado no existe en la base de datos actua</p>
        <button 
          onClick={() => setPage('tickets')} 
          className="btn-futuristic px-8 py-3 text-[10px] tracking-[2px]"
        >
          REGRESAR AL NÚCLEO
        </button>
      </div>
    );
  }

  const canManage = currentUser?.role === 'Admin' || currentUser?.role === 'Agente';
  const agents = users.filter(u => u.role === 'Admin' || u.role === 'Agente');
  const dept = departments.find(d => d.id === ticket.departmentId);

  const handleReplyImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Solo imágenes.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Máx 5 MB.'); return; }
    setReplyImage(file);
    const reader = new FileReader();
    reader.onload = ev => setReplyPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadReplyImage = async (file: File): Promise<string | undefined> => {
    if (!isSupabaseConfigured()) return undefined;
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `messages/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const sb = getSupabase();

      // Intento 1: upload normal
      let { error } = await sb.storage
        .from('attachments')
        .upload(path, file, { upsert: true, contentType: file.type || `image/${ext}` });

      if (error) {
        // Intento 2: convertir a Blob con tipo explícito y reintentar
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: file.type || 'image/jpeg' });
        const retry = await sb.storage
          .from('attachments')
          .upload(path, blob, { upsert: true, contentType: file.type || 'image/jpeg' });
        error = retry.error;
      }

      if (!error) {
        const { data } = sb.storage.from('attachments').getPublicUrl(path);
        // Verificar que la URL sea accesible (evita retornar una URL rota)
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch (err) {
      console.warn('Storage upload failed, will use base64 fallback:', err);
    }
    return undefined;
  };

  // Convierte un File a data URL base64 (fallback cuando Storage falla)
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      // Comprimir si es demasiado grande antes de convertir a base64
      if (file.size > 1_000_000) {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const canvas = document.createElement('canvas');
          const MAX = 1200;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
        img.src = objectUrl;
      } else {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !replyImage) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (replyImage) {
        // Primero intentar subir a Storage (URL pública — accesible desde cualquier dispositivo)
        imageUrl = await uploadReplyImage(replyImage);
        if (!imageUrl) {
          // Fallback: convertir a base64 y guardar en la BD directamente
          // Esto garantiza que la imagen sea visible en CUALQUIER dispositivo/plataforma
          try {
            imageUrl = await fileToBase64(replyImage);
          } catch {
            // Si todo falla, no enviar imagen rota
            imageUrl = undefined;
          }
        }
      }
      await addMessage(ticket.id, message.trim(), isInternal, imageUrl);
      setMessage('');
      setIsInternal(false);
      setReplyImage(null);
      setReplyPreview(null);
      if (replyFileRef.current) replyFileRef.current.value = '';
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-8 bg-[#050505] min-h-screen">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage('tickets')}
          className="group flex items-center gap-3 text-[#8888aa] hover:text-[#ffffff] transition-all text-[10px] font-black uppercase tracking-[3px]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Regresar al registro
        </button>

        <button
          onClick={() => {
            const doc = new jsPDF();
            // ... (I'll implement the logic below or in a separate helper)
            generateProfessionalTicketReport(doc, ticket, dept);
          }}
          className="flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          IMPRIMIR SOLICITUD
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Console */}
        <div className="lg:col-span-3 space-y-8">
          {/* Ticket Header & Body */}
          <div className="glass-panel rounded-[40px] border border-white/5 p-8 sm:p-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#ffffff]/5 to-transparent blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <span className="text-[#ffffff] text-xs font-mono font-black tracking-widest bg-[#ffffff]/10 px-4 py-1.5 rounded-full border border-[#ffffff]/20">{ticket.id}</span>
                <span className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest ${statusColors[ticket.status]}`}>
                  {ticket.status}
                </span>
                <span className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest border ${priorityColors[ticket.priority]}`}>
                  {ticket.priority}
                </span>
                {dept && (
                   <span className="text-[10px] px-4 py-1.5 rounded-full bg-white/5 text-[#8888aa] border border-white/10 font-bold uppercase tracking-widest">
                    {dept.name}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white font-orbitron tracking-tight mb-6 leading-tight uppercase underline decoration-[#ffffff]/20 decoration-4 underline-offset-8">
                {ticket.title}
              </h1>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-[#8888aa] text-lg font-rajdhani font-semibold leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {ticket.imageUrl && (
                <div className="mt-10 group/img">
                  <p className="text-[10px] text-[#ffffff] mb-4 uppercase tracking-[4px] font-black">Evidencia de entrada</p>
                  <div
                    className="rounded-[32px] overflow-hidden border-2 border-white/5 cursor-pointer max-w-xl hover:border-[#ffffff]/40 transition-all duration-500 shadow-2xl relative"
                    onClick={() => setLightboxUrl(ticket.imageUrl!)}
                  >
                    <img src={ticket.imageUrl} alt="Adjunto del ticket" className="w-full max-h-80 object-cover group-hover/img:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-white text-[10px] font-black uppercase tracking-[5px] bg-[#050505]/80 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">Ampliar Vista</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 mt-12 pt-8 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#121212] to-[#333333] flex items-center justify-center text-white font-black font-orbitron border border-white/10">
                    {ticket.createdByName.slice(0,1)}
                  </div>
                  <div>
                    <p className="text-[#8888aa] text-[9px] font-black uppercase tracking-widest">Originador</p>
                    <p className="text-white text-xs font-bold uppercase">{ticket.createdByName}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-[#8888aa] text-[9px] font-black uppercase tracking-widest">Transmisión iniciada</p>
                  <p className="text-white text-xs font-bold font-mono">{formatDate(ticket.createdAt).toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Stream (Messages) */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-white font-black font-orbitron tracking-[4px] text-xs uppercase">
                FLUJO_DE_DATOS ({ticket.messages.filter(m => !m.isInternal || currentUser?.role !== 'Cliente').length})
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            {ticket.messages.length === 0 ? (
              <div className="glass-panel border-white/5 rounded-3xl p-12 text-center">
                <p className="text-[#8888aa] font-bold tracking-[3px] uppercase text-xs italic">En espera de respuesta del comando...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {ticket.messages.map(msg => {
                  if (msg.isInternal && currentUser?.role === 'Cliente') return null;
                  return (
                    <div
                      key={msg.id}
                      className={`glass-panel border rounded-[32px] p-6 sm:p-8 transition-all duration-300 relative overflow-hidden ${
                        msg.isInternal ? 'border-white/20 bg-white/5 shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'border-white/5 hover:border-white/10'
                      }`}
                    >
                      {msg.isInternal && (
                        <div className="absolute top-0 right-0 px-6 py-2 bg-[#cccccc] text-[#050505] text-[9px] font-black uppercase tracking-[3px] rounded-bl-3xl">Nota del Sistema</div>
                      )}
                      
                      <div className="flex items-start gap-6">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black font-orbitron shadow-xl shrink-0"
                          style={{ backgroundColor: msg.authorColor }}
                        >
                          {msg.authorInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                              <span className="text-white font-bold text-sm tracking-tight">{msg.authorName.toUpperCase()}</span>
                              <span
                                className={`text-[10px] font-black uppercase tracking-[3px] ml-3 opacity-80 px-2 py-0.5 rounded-full ${
                                  msg.authorRole === 'Admin'
                                    ? 'text-white bg-white/20 border border-white/30'
                                    : msg.authorRole === 'Agente'
                                    ? 'text-gray-300 bg-white/10 border border-white/20'
                                    : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                }`}
                              >[{msg.authorRole === 'Admin' ? 'ADMINISTRADOR' : msg.authorRole === 'Agente' ? 'AGENTE' : 'CLIENTE'}]</span>
                            </div>
                            <span className="text-[#8888aa] font-mono text-[10px] font-bold">{formatDate(msg.timestamp).toUpperCase()}</span>
                          </div>
                          
                          <div className="text-[#8888aa] text-base font-rajdhani font-semibold leading-relaxed">
                            {msg.content}
                          </div>

                          {msg.imageUrl && (
                            <div
                              className="mt-6 rounded-3xl overflow-hidden border-2 border-white/5 max-w-sm cursor-pointer hover:border-[#ffffff]/40 transition-all group/msg-img shadow-2xl"
                              onClick={() => setLightboxUrl(msg.imageUrl!)}
                            >
                              <img src={msg.imageUrl} alt="Imagen adjunta" className="w-full max-h-52 object-cover group-hover/msg-img:scale-105 transition-transform duration-500" />
                              <div className="px-4 py-3 bg-[#050505]/50 backdrop-blur-md flex items-center justify-between border-t border-white/5">
                                <span className="text-white text-[9px] font-black uppercase tracking-[3px]">Visualizar Adjunto</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Console (Reply) */}
          {ticket.status !== 'Cerrado' && (
            <form onSubmit={handleSendMessage} className="glass-panel border-white/5 rounded-[40px] p-8 sm:p-10 space-y-8 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff]/2 to-transparent pointer-events-none" />
               
               <div className="flex items-center justify-between relative z-10 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-[#8888aa] border border-white/10">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <span className="text-white font-black font-orbitron tracking-[3px] text-xs uppercase">Terminal de respuesta</span>
                  </div>
                  {canManage && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <span className={`text-[9px] font-black uppercase tracking-[2px] transition-colors ${isInternal ? 'text-[#cccccc]' : 'text-[#8888aa]'}`}>
                        Canal Privado
                      </span>
                      <div
                        onClick={() => setIsInternal(!isInternal)}
                        className={`w-12 h-6 rounded-full transition-all relative border ${isInternal ? 'bg-white/20 border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${isInternal ? 'left-6 bg-white' : 'left-1 bg-[#8888aa]'}`}/>
                      </div>
                    </label>
                  )}
               </div>

               <div className="relative group z-10">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Inyectar mensaje en la transmisión..."
                  rows={4}
                  className="w-full bg-[#121212]/50 border border-white/10 rounded-3xl px-8 py-6 text-white placeholder-slate-700 text-base font-rajdhani font-semibold focus:outline-none focus:border-[#ffffff]/50 focus:shadow-[0_0_30px_rgba(255,255,255,0.02)] transition-all resize-none"
                />
               </div>

              {replyPreview && (
                <div className="relative inline-block z-10 animate-fade-in">
                  <div className="rounded-3xl overflow-hidden border-2 border-[#ffffff]/30 shadow-2xl">
                    <img src={replyPreview} alt="Preview" className="h-40 object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setReplyImage(null); setReplyPreview(null); if (replyFileRef.current) replyFileRef.current.value = ''; }}
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#999999] text-white flex items-center justify-center border-2 border-[#050505] hover:scale-110 transition shadow-lg"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-6 justify-between relative z-10 pt-4">
                <button
                  type="button"
                  onClick={() => replyFileRef.current?.click()}
                  className="flex items-center gap-2 group text-[#ffffff] hover:text-white transition-all text-[10px] font-black uppercase tracking-[3px] bg-[#ffffff]/10 hover:bg-[#ffffff] px-6 py-4 rounded-2xl border border-[#ffffff]/20"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-12 transition-transform">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Adjuntar Recursos
                </button>
                <input ref={replyFileRef} type="file" accept="image/*" onChange={handleReplyImage} className="hidden"/>

                <button
                  type="submit"
                  disabled={(!message.trim() && !replyImage) || sending}
                  className="w-full sm:w-auto btn-futuristic px-10 py-5 text-xs tracking-[4px] font-black group"
                >
                  {sending ? (
                    <span className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                      SINCRONIZANDO...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      ENVIAR TRANSMISIÓN
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar Intelligence Unit */}
        <div className="space-y-6">
          {/* Action Control */}
          {canManage && (
            <div className="glass-panel border-white/10 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffffff]/40 to-transparent" />
               <h3 className="text-white font-black font-orbitron tracking-[3px] text-[10px] uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffffff] animate-pulse" />
                Control de Incidencia
               </h3>
               
               <div className="space-y-5">
                <div>
                  <label className="block text-[9px] font-black text-[#8888aa] uppercase tracking-[3px] mb-2 ml-1">Estatus</label>
                  <select
                    value={ticket.status}
                    onChange={e => updateTicketStatus(ticket.id, e.target.value as TicketStatus)}
                    className="w-full bg-[#121212]/50 border border-white/10 rounded-xl px-4 py-3.5 text-white text-[11px] font-black focus:outline-none focus:border-[#ffffff]/50 transition-all font-mono uppercase tracking-widest cursor-pointer"
                  >
                    <option>Abierto</option>
                    <option>En Progreso</option>
                    <option>Resuelto</option>
                    <option>Cerrado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-[#8888aa] uppercase tracking-[3px] mb-2 ml-1">Prioridad</label>
                  <select
                    value={ticket.priority}
                    onChange={e => updateTicketPriority(ticket.id, e.target.value as TicketPriority)}
                    className="w-full bg-[#121212]/50 border border-white/10 rounded-xl px-4 py-3.5 text-white text-[11px] font-black focus:outline-none focus:border-[#ffffff]/50 transition-all font-mono uppercase tracking-widest cursor-pointer"
                  >
                    <option>Urgente</option>
                    <option>Alta</option>
                    <option>Media</option>
                    <option>Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-[#8888aa] uppercase tracking-[3px] mb-2 ml-1">Operador</label>
                  <select
                    value={ticket.assignedToId || ''}
                    onChange={e => assignTicket(ticket.id, e.target.value)}
                    className="w-full bg-[#121212]/50 border border-white/10 rounded-xl px-4 py-3.5 text-white text-[11px] font-black focus:outline-none focus:border-[#ffffff]/50 transition-all font-mono uppercase tracking-widest cursor-pointer"
                  >
                    <option value="">SIN_ASIGNAR</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
               </div>
            </div>
          )}

          {/* Data Sheet */}
          <div className="glass-panel border-white/5 rounded-[32px] p-6 sm:p-8 space-y-6">
            <h3 className="text-white font-black font-orbitron tracking-[3px] text-[10px] uppercase">Ficha de Datos</h3>
            
            <div className="space-y-5">
               {[
                 { l: 'Categoría', v: ticket.category.toUpperCase() },
                 { l: 'Departamento', v: dept?.name.toUpperCase() || 'GENERAL' },
                 { l: 'Creado por', v: ticket.createdByName.toUpperCase() },
                 { l: 'Asignado a', v: ticket.assignedToName?.toUpperCase() || 'PENDIENTE', c: ticket.assignedToName ? 'text-[#ffffff]' : 'text-[#999999] italic' },
               ].map((item, i) => (
                 <div key={i} className="border-b border-white/5 pb-3">
                   <p className="text-[9px] font-black text-[#8888aa] uppercase tracking-[2px] mb-1">{item.l}</p>
                   <p className={`text-[11px] font-bold font-rajdhani tracking-widest ${item.c || 'text-white'}`}>{item.v}</p>
                 </div>
               ))}
               <div>
                 <p className="text-[9px] font-black text-[#8888aa] uppercase tracking-[2px] mb-1">Timeline</p>
                 <div className="space-y-1 mt-2">
                    <p className="text-[10px] text-white/60 font-mono"><span className="text-[#ffffff]">INI:</span> {formatDate(ticket.createdAt).toUpperCase()}</p>
                    <p className="text-[10px] text-white/60 font-mono"><span className="text-[#cccccc]">MOD:</span> {formatDate(ticket.updatedAt).toUpperCase()}</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Status Monitor View */}
          <div className={`rounded-[32px] p-8 border-2 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group ${statusColors[ticket.status]}`}>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-[9px] font-black uppercase tracking-[4px] mb-4 opacity-70">Monitor Estatus</p>
            <p className="text-2xl font-black font-orbitron tracking-tighter uppercase">{ticket.status}</p>
            <div className="mt-6 flex gap-1">
               {[1,2,3,4,5].map(i => <div key={i} className="w-3 h-1 bg-current opacity-30 rounded-full" />)}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Enhancement */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-2xl" />
          <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-end mb-4">
               <button
                onClick={() => setLightboxUrl(null)}
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-[#999999] text-white flex items-center justify-center transition-all border border-white/10 group shadow-2xl"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-90 transition-transform"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="relative rounded-[40px] overflow-hidden border-4 border-white/10 shadow-[0_0_100px_rgba(255,255,255,0.1)]">
              <img src={lightboxUrl} alt="Imagen ampliada" className="max-w-full max-h-[80vh] object-contain" />
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none border-[1px] border-white/20 rounded-[38px] m-1" />
            </div>
            <p className="mt-8 text-[#8888aa] font-mono text-[10px] font-black uppercase tracking-[5px]">Visualizador de Alta Resolución v2.0</p>
          </div>
        </div>
      )}
    </div>
  );
}
