import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { TicketStatus, TicketPriority, TicketCategory } from '../types';
import { formatDate } from '../utils/date';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import { generateProfessionalTicketReport } from '../utils/pdfGenerator';

const statusColors: Record<TicketStatus, string> = {
  'Abierto': 'bg-cyan-500/10 text-[#00f0ff] border border-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]',
  'En Progreso': 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(123,47,255,0.1)]',
  'Resuelto': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
  'Cerrado': 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

const priorityColors: Record<string, string> = {
  'Urgente': 'text-pink-400 border-pink-500/30 bg-pink-500/10 shadow-[0_0_10px_rgba(255,45,149,0.1)]',
  'Alta': 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  'Media': 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  'Baja': 'text-slate-400 border-slate-500/30 bg-slate-500/10',
};
const predefinedSolutions: Record<TicketCategory, string[]> = {
  'Hardware': ['Reemplazo de equipo en proceso.', 'Mantenimiento preventivo completado.', 'Falla de hardware detectada, se solicita refacción.'],
  'Software': ['Actualización de software completada.', 'Error de sistema corregido.', 'Instalación de aplicación exitosa.', 'Se requiere reinicio para aplicar cambios.'],
  'Red': ['Restablecimiento de conexión exitoso.', 'Monitoreo de red activado, sin anomalías.', 'Ajuste en configuración de firewall aplicado.', 'Se detectó caída de enlace por proveedor externo.'],
  'Seguridad': ['Análisis de vulnerabilidad concluido.', 'Permisos ajustados según políticas.', 'Incidente de seguridad mitigado.', 'Se aplicó bloqueo preventivo.'],
  'Acceso': ['Credenciales restablecidas, favor de verificar.', 'Acceso a sistema concedido.', 'Usuario bloqueado/desbloqueado según solicitud.'],
  'Impresora': ['Niveles de tinta y papel restablecidos.', 'Configuración de impresora en red corregida.', 'Atasco de papel resuelto.', 'Mantenimiento preventivo a equipo de impresión.'],
  'Correo': ['Buzón de correo restaurado.', 'Configuración de cliente de correo aplicada.', 'Problema de envío/recepción solucionado.', 'Contraseña de correo institucional restablecida.'],
  'Servidor': ['Reinicio de servicio completado.', 'Espacio en disco liberado.', 'Parche de seguridad aplicado en servidor.', 'Monitoreo de CPU/RAM estabilizado.'],
  'Respaldo': ['Respaldo de datos completado exitosamente.', 'Restauración de archivos realizada.', 'Configuración de backup automático ajustada.'],
  'General': ['Solicitud procesada y resuelta.', 'Asistencia brindada.', 'Duda aclarada, ticket cerrado.']
};

const getDeptIcon = (category: string = 'General', size = 20) => {
  const c = category.toLowerCase();
  if (c.includes('hard')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
  if (c.includes('soft')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
  if (c.includes('red')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><path d="M5 22v-3a7 7 0 0 1 14 0v3"/><circle cx="5" cy="11" r="2"/><circle cx="19" cy="11" r="2"/><line x1="5" y1="13" x2="7" y2="17"/><line x1="19" y1="13" x2="17" y2="17"/><line x1="12" y1="8" x2="12" y2="12"/></svg>;
  if (c.includes('print') || c.includes('imp')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
  if (c.includes('seg')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  if (c.includes('corr')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2-2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
  if (c.includes('serv')) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>;
  // Generic user/dept icon fallback
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
};

export default function TicketDetail() {
  const {
    selectedTicketId, getTicketById, currentUser,
    updateTicketStatus, updateTicketPriority, assignTicket, autoAssignAdminOnOpen,
    addMessage, users, departments, setPage, refreshData, loading,
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

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [showSolutionsMenu, setShowSolutionsMenu] = useState(false);

  // ── Refresh on Mount ───────────────────────────────
  useEffect(() => {
    if (selectedTicketId) {
      refreshData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicketId]);

  // ── Supabase Realtime subscription for live chat ──────────────────────────
  useEffect(() => {
    if (!selectedTicketId || !isSupabaseConfigured()) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`ticket-messages-${selectedTicketId}`)
      .on(
        'postgres_changes',
        { event: '*',  schema: 'public', table: 'ticket_comentarios', filter: `ticket_id=eq.${selectedTicketId}` },
        () => { refreshData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${selectedTicketId}` },
        () => { refreshData(); }
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [selectedTicketId, refreshData]);

  if (loading && !ticket) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] text-center space-y-6">
        <div className="w-16 h-16 border-4 border-[#00f0ff]/20 border-t-[#00f0ff] rounded-full animate-spin" />
        <h2 className="text-white font-black font-orbitron tracking-widest text-xl animate-pulse">SINCRONIZANDO NODO...</h2>
        <p className="text-[#8888aa] text-[9px] font-black tracking-[4px] uppercase">Estableciendo conexión segura con la central de datos</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] text-center space-y-6">
        <div className="text-6xl animate-bounce">🔍</div>
        <h2 className="text-white font-black font-orbitron tracking-widest text-xl">ERROR DE ENLACE: NODO NO LOCALIZADO</h2>
        <p className="text-[#8888aa] text-xs font-bold tracking-[3px] uppercase max-w-sm">
          LA SOLICITUD <span className="text-[#ffffff]">#{selectedTicketId?.slice(0,8)}</span> NO HA SIDO DETECTADA EN ESTE SEGMENTO DE RED.
        </p>
        <div className="flex gap-4">
          <button onClick={refreshData} className="px-8 py-3 bg-white/5 text-white border border-white/10 rounded-xl hover:bg-white/10 transition-all font-black uppercase text-[10px]">REINTENTAR</button>
          <button onClick={() => setPage('tickets')} className="btn-futuristic px-8 py-3 text-[10px]">REGRESAR</button>
        </div>
      </div>
    );
  }

  const canManage = currentUser?.role === 'Admin' || currentUser?.role === 'Agente';
  const agents = users.filter(u => u.role === 'Admin' || u.role === 'Agente');
  const dept = departments.find(d => d.id === ticket.departmentId);

  const handleReplyImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setReplyPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setReplyImage(file);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !replyImage) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (replyImage) {
        imageUrl = await fileToBase64(replyImage);
      }
      await addMessage(ticket.id, message.trim(), isInternal, imageUrl);
      setMessage('');
      setIsInternal(false);
      setReplyImage(null);
      setReplyPreview(null);
    } finally {
      setSending(false);
    }
  };

  const confirmStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingStatus || !statusComment.trim()) return;
    setIsSubmittingStatus(true);
    try {
      await addMessage(ticket.id, `CAMBIO DE ESTADO A [${pendingStatus.toUpperCase()}]: ${statusComment.trim()}`, true);
      await updateTicketStatus(ticket.id, pendingStatus);
      setStatusComment('');
      setShowStatusModal(false);
      setPendingStatus(null);
    } catch(err) {
      console.error(err);
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-8 bg-[#030014] min-h-screen">
      <div className="flex items-center justify-between">
        <button onClick={() => setPage('tickets')} className="group flex items-center gap-3 text-[#8888aa] hover:text-[#ffffff] transition-all text-[10px] font-black uppercase tracking-[3px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Regresar
        </button>

        <button onClick={() => { const doc = new jsPDF(); generateProfessionalTicketReport(doc, ticket, dept?.name); }} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          IMPRIMIR SOLICITUD
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="glass-panel rounded-[40px] border border-white/5 p-8 sm:p-12 relative overflow-hidden">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="text-[#8888aa] text-[9px] font-black tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/10 uppercase">
                {ticket.folio ? `FOLIO_${ticket.folio.toString().padStart(6, '0')}` : `REF_${ticket.id.slice(0,8).toUpperCase()}`}
              </span>
              <span className={`text-[9px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest ${statusColors[ticket.status]}`}>{ticket.status}</span>
              <span className={`text-[9px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest border ${priorityColors[ticket.priority as string]}`}>{ticket.priority}</span>
            </div>

            <h1 className="text-3xl font-black text-white font-orbitron tracking-tight mb-6 uppercase">{ticket.title}</h1>
            <p className="text-[#8888aa] text-lg font-rajdhani leading-relaxed whitespace-pre-wrap mb-10">{ticket.description}</p>

            {ticket.imageUrl && (
              <div className="mt-8 rounded-[32px] overflow-hidden border border-white/10 cursor-pointer max-w-xl group" onClick={() => setLightboxUrl(ticket.imageUrl!)}>
                <img src={ticket.imageUrl} alt="Adjunto" className="w-full h-auto group-hover:scale-105 transition-transform duration-700" />
              </div>
            )}

              <div className="flex items-center gap-6 mt-12 pt-8 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/5 flex items-center justify-center text-[#00f0ff] border border-[#00f0ff]/20">
                    {getDeptIcon(ticket.category)}
                  </div>
                  <div>
                    <p className="text-[#8888aa] text-[8px] font-black uppercase tracking-widest">Originador</p>
                    <p className="text-white text-[10px] font-bold uppercase">{ticket.createdByName}</p>
                  </div>
                </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <p className="text-[#8888aa] text-[8px] font-black uppercase tracking-widest">Iniciada</p>
                <p className="text-white text-[10px] font-bold font-mono">{formatDate(ticket.createdAt).toUpperCase()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-white font-black font-orbitron tracking-[4px] text-[10px] uppercase border-l-2 border-white/20 pl-4">FLUJO_DE_MENSAJES</h2>
            <div className="space-y-4">
              {ticket.messages.map((msg) => {
                if (msg.isInternal && currentUser?.role === 'Cliente') return null;
                return (
                  <div key={msg.id} className={`glass-panel border rounded-[32px] p-6 sm:p-8 relative overflow-hidden transition-all ${msg.isInternal ? 'border-white/20 bg-white/5' : 'border-white/5'}`}>
                    {msg.isInternal && <div className="absolute top-0 right-0 px-4 py-1.5 bg-white/10 text-white text-[8px] font-black uppercase tracking-[3px] rounded-bl-2xl">Sistema</div>}
                    <div className="flex items-start gap-5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white border-white/10 border" style={{ backgroundColor: msg.authorColor }}>
                         {getDeptIcon(ticket.category, 18)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-white text-xs font-bold uppercase tracking-tight">{msg.authorName}</span>
                          <span className="text-[#8888aa] text-[9px] font-mono">{formatDate(msg.timestamp).toUpperCase()}</span>
                        </div>
                        <p className="text-[#8888aa] text-[15px] font-medium leading-relaxed">{msg.content}</p>
                        {msg.imageUrl && (
                           <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 max-w-xs cursor-pointer group" onClick={() => setLightboxUrl(msg.imageUrl!)}>
                             <img src={msg.imageUrl} alt="Adjunto" className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {ticket.status !== 'Cerrado' && (
            <form onSubmit={handleSendMessage} className="glass-panel border-white/5 rounded-[40px] p-8 sm:p-10 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <span className="text-white font-black font-orbitron tracking-[3px] text-[10px] uppercase flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-white opacity-40 animate-pulse" />
                  Terminal de respuesta
                </span>
                <div className="flex items-center gap-3">
                  {canManage && (
                    <div className="relative group">
                      <button 
                        type="button" 
                        onClick={() => setShowSolutionsMenu(!showSolutionsMenu)} 
                        className={`flex items-center gap-3 text-[9px] font-black tracking-[3px] uppercase px-5 py-2.5 rounded-full border transition-all ${showSolutionsMenu ? 'bg-[#00f0ff] text-black border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.4)]' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="w-2.5 h-0.5 bg-current rounded-full" />
                          <div className="w-4 h-0.5 bg-current rounded-full" />
                          <div className="w-2.5 h-0.5 bg-current rounded-full" />
                        </div>
                        Soluciones
                      </button>

                      {showSolutionsMenu && (
                        <div className="absolute bottom-full right-0 mb-4 w-72 glass-panel border border-white/10 rounded-3xl p-4 shadow-2xl z-[100] max-h-96 overflow-y-auto animate-fade-up">
                          <p className="text-[8px] font-black text-[#8888aa] uppercase tracking-[3px] mb-4 border-b border-white/5 pb-2">Respuestas Rápidas</p>
                          <div className="space-y-2">
                            {predefinedSolutions[ticket.category]?.map((sol, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => { setMessage(sol); setShowSolutionsMenu(false); }}
                                className="w-full text-left p-4 rounded-2xl hover:bg-white/10 text-white transition-all border border-transparent hover:border-white/5 group"
                              >
                                <p className="text-[10px] font-bold leading-relaxed line-clamp-3 group-hover:text-[#00f0ff] transition-colors uppercase tracking-tight">{sol}</p>
                              </button>
                            ))}
                            {(!predefinedSolutions[ticket.category] || predefinedSolutions[ticket.category].length === 0) && (
                              <p className="text-center py-4 text-[9px] text-[#8888aa] font-black uppercase">Sin soluciones predefinidas</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {canManage && (
                    <button type="button" onClick={() => setIsInternal(!isInternal)} className={`text-[9px] font-black tracking-[2px] uppercase px-4 py-1.5 rounded-full border transition-all ${isInternal?'bg-white text-[#030014] border-white':'text-[#8888aa] border-white/10'}`}>
                      {isInternal ? 'MODO: PRIVADO' : 'MODO: PÚBLICO'}
                    </button>
                  )}
                </div>
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Escribir respuesta..." rows={4} className="w-full bg-white/2 border border-white/5 rounded-3xl px-6 py-5 text-white placeholder-slate-700 font-rajdhani focus:outline-none focus:border-white/20 transition-all resize-none" />
              {replyPreview && (
                 <div className="relative inline-block group">
                    <img src={replyPreview} className="h-20 rounded-xl" />
                    <button type="button" onClick={() => {setReplyImage(null); setReplyPreview(null);}} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow-lg">X</button>
                 </div>
              )}
              <div className="flex justify-between items-center gap-4">
                <button type="button" onClick={() => replyFileRef.current?.click()} className="text-[9px] font-black text-white px-6 py-3 rounded-xl bg-white/5 border border-white/10 uppercase tracking-[2px]">Adjuntar</button>
                <input ref={replyFileRef} type="file" accept="image/*" onChange={handleReplyImage} className="hidden" />
                <button type="submit" disabled={sending || (!message.trim() && !replyImage)} className="btn-futuristic px-10 py-4 text-[10px] tracking-[3px]">
                  {sending ? 'ENVIANDO...' : 'ENVIAR MENSAJE'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-8">
          {canManage && (
            <div className="glass-panel border-white/5 rounded-[32px] p-8 space-y-6">
              <h3 className="text-white font-black font-orbitron tracking-[3px] text-[10px] uppercase border-l-2 border-white/20 pl-4">CONTROL_CENTRAL</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-black text-[#8888aa] uppercase tracking-[2px] ml-1 mb-1 block">Estado</label>
                  <select value={ticket.status} onChange={e => { setPendingStatus(e.target.value as TicketStatus); setShowStatusModal(true); }} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] font-black font-mono focus:outline-none cursor-pointer">
                    <option value="Abierto">Abierto</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Resuelto">Resuelto</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-black text-[#8888aa] uppercase tracking-[2px] ml-1 mb-1 block">Prioridad</label>
                  <select value={ticket.priority} onChange={e => updateTicketPriority(ticket.id, e.target.value as TicketPriority)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] font-black font-mono focus:outline-none cursor-pointer">
                    <option value="Urgente">Urgente</option>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-black text-[#8888aa] uppercase tracking-[2px] ml-1 mb-1 block">Asignar Operador</label>
                  <select value={ticket.assignedToId || ''} onChange={e => assignTicket(ticket.id, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] font-black font-mono focus:outline-none cursor-pointer">
                    <option value="">SIN ASIGNAR</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel border-white/5 rounded-[32px] p-8 space-y-6">
            <h3 className="text-white font-black font-orbitron tracking-[3px] text-[10px] uppercase opacity-60">Datos Clave</h3>
            <div className="space-y-4">
              {[
                { l: 'Categoría', v: ticket.category.toUpperCase() },
                { l: 'Depto', v: dept?.name.toUpperCase() || 'GENERAL' },
                { l: 'Asignado', v: ticket.assignedToName?.toUpperCase() || 'PENDIENTE' }
              ].map((item, i) => (
                <div key={i} className="border-b border-white/5 pb-2">
                  <p className="text-[8px] font-black text-[#8888aa] uppercase tracking-[2px]">{item.l}</p>
                  <p className="text-[10px] font-bold text-white tracking-widest">{item.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
          <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Lbox" className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)]" />
          </div>
        </div>
      )}

      {showStatusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm" onClick={() => setShowStatusModal(false)}></div>
          <div className="glass-panel border-white/10 p-8 sm:p-10 rounded-[40px] w-full max-w-lg relative z-10 space-y-6 shadow-2xl">
            <h3 className="text-xl font-black font-orbitron text-white tracking-[3px] uppercase">Cambio de Estado</h3>
            <p className="text-[#8888aa] text-xs font-bold leading-relaxed uppercase tracking-widest">Justifica el cambio a <span className="text-white">{pendingStatus}</span>:</p>
            <form onSubmit={confirmStatusChange} className="space-y-6">
              <textarea autoFocus required value={statusComment} onChange={e => setStatusComment(e.target.value)} placeholder="Motivo/Observaciones..." rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-white/40 transition-all resize-none" />
              <div className="flex gap-4 justify-end">
                <button type="button" onClick={() => setShowStatusModal(false)} className="text-[9px] font-black text-[#8888aa] hover:text-white uppercase tracking-[2px]">Cancelar</button>
                <button type="submit" disabled={!statusComment.trim() || isSubmittingStatus} className="btn-futuristic px-8 py-3 text-[10px] uppercase tracking-[3px]">
                   {isSubmittingStatus ? 'PROCESANDO...' : 'CONFIRMAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
