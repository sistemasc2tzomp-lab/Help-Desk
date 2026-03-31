import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { TicketStatus, TicketPriority } from '../types';
import { formatDate } from '../utils/date';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const statusColors: Record<TicketStatus, string> = {
  'Abierto': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'En Progreso': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  'Resuelto': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  'Cerrado': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const priorityColors: Record<string, string> = {
  'Urgente': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'Alta': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  'Media': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  'Baja': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

export default function TicketDetail() {
  const {
    selectedTicketId, getTicketById, currentUser,
    updateTicketStatus, updateTicketPriority, assignTicket,
    addMessage, users, departments, setPage,
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

  if (!ticket) {
    return (
      <div className="p-6 text-center text-slate-400">
        Ticket no encontrado.
        <button onClick={() => setPage('tickets')} className="ml-2 text-indigo-400 hover:underline">Volver</button>
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
    const ext = file.name.split('.').pop();
    const path = `messages/${Date.now()}.${ext}`;
    const sb = getSupabase();
    const { error } = await sb.storage.from('attachments').upload(path, file, { upsert: true });
    if (error) return undefined;
    const { data } = sb.storage.from('attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !replyImage) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (replyImage) {
        imageUrl = await uploadReplyImage(replyImage);
        if (!imageUrl && replyPreview) imageUrl = replyPreview;
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => setPage('tickets')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Volver a tickets
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-indigo-400 text-sm font-mono font-semibold">{ticket.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                  {dept && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                      🏢 {dept.name}
                    </span>
                  )}
                </div>
                <h1 className="text-white text-xl font-bold">{ticket.title}</h1>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{ticket.description}</p>

            {/* Ticket attachment image */}
            {ticket.imageUrl && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Imagen adjunta</p>
                <div
                  className="rounded-xl overflow-hidden border border-white/10 cursor-pointer max-w-sm hover:opacity-90 transition"
                  onClick={() => setLightboxUrl(ticket.imageUrl!)}
                >
                  <img src={ticket.imageUrl} alt="Adjunto del ticket" className="w-full max-h-48 object-cover" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5 text-xs text-slate-500">
              <span>Creado por <span className="text-slate-300">{ticket.createdByName}</span></span>
              <span>·</span>
              <span>{formatDate(ticket.createdAt)}</span>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            <h2 className="text-slate-400 font-semibold text-xs uppercase tracking-wider">
              Conversación ({ticket.messages.filter(m => !m.isInternal || currentUser?.role !== 'Cliente').length})
            </h2>
            {ticket.messages.length === 0 ? (
              <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-6 text-center text-slate-500 text-sm">
                No hay mensajes aún. Sé el primero en responder.
              </div>
            ) : (
              ticket.messages.map(msg => {
                if (msg.isInternal && currentUser?.role === 'Cliente') return null;
                return (
                  <div
                    key={msg.id}
                    className={`bg-[#1a1d27] border rounded-2xl p-4 ${
                      msg.isInternal ? 'border-orange-500/20 bg-orange-500/5' : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                        style={{ backgroundColor: msg.authorColor }}
                      >
                        {msg.authorInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white text-sm font-medium">{msg.authorName}</span>
                          <span className="text-slate-500 text-xs">{msg.authorRole}</span>
                          {msg.isInternal && (
                            <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full">
                              Interno
                            </span>
                          )}
                          <span className="text-slate-600 text-xs ml-auto">{formatDate(msg.timestamp)}</span>
                        </div>
                        {msg.content && (
                          <p className="text-slate-300 text-sm leading-relaxed">{msg.content}</p>
                        )}
                        {msg.imageUrl && (
                          <div
                            className="mt-2 rounded-xl overflow-hidden border border-white/10 max-w-xs cursor-pointer hover:opacity-90 transition"
                            onClick={() => setLightboxUrl(msg.imageUrl!)}
                          >
                            <img src={msg.imageUrl} alt="Imagen adjunta" className="w-full max-h-40 object-cover" />
                            <div className="px-3 py-1.5 bg-black/30 flex items-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                              </svg>
                              <span className="text-slate-400 text-xs">Ver imagen</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply form */}
          {ticket.status !== 'Cerrado' && (
            <form onSubmit={handleSendMessage} className="bg-[#1a1d27] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: currentUser?.avatarColor }}
                >
                  {currentUser?.initials}
                </div>
                <span className="text-slate-300 text-sm font-medium">{currentUser?.name}</span>
              </div>

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Escribe tu respuesta..."
                rows={3}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition resize-none"
              />

              {/* Reply image preview */}
              {replyPreview && (
                <div className="relative inline-block">
                  <img src={replyPreview} alt="Preview" className="rounded-xl h-28 object-cover border border-white/10" />
                  <button
                    type="button"
                    onClick={() => { setReplyImage(null); setReplyPreview(null); if (replyFileRef.current) replyFileRef.current.value = ''; }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-400 transition"
                  >×</button>
                </div>
              )}

              <div className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  {/* Attach image button */}
                  <button
                    type="button"
                    onClick={() => replyFileRef.current?.click()}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition text-xs"
                    title="Adjuntar imagen"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    Imagen
                  </button>
                  <input ref={replyFileRef} type="file" accept="image/*" onChange={handleReplyImage} className="hidden"/>

                  {canManage && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setIsInternal(!isInternal)}
                        className={`w-9 h-5 rounded-full transition relative ${isInternal ? 'bg-orange-500' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isInternal ? 'left-4' : 'left-0.5'}`}/>
                      </div>
                      <span className="text-slate-400 text-sm">Nota interna</span>
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={(!message.trim() && !replyImage) || sending}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition"
                >
                  {sending ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  )}
                  Enviar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Manage */}
          {canManage && (
            <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-4 space-y-4">
              <h3 className="text-white font-semibold text-sm">Gestionar Ticket</h3>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">Estado</label>
                <select
                  value={ticket.status}
                  onChange={e => updateTicketStatus(ticket.id, e.target.value as TicketStatus)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option>Abierto</option>
                  <option>En Progreso</option>
                  <option>Resuelto</option>
                  <option>Cerrado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">Prioridad</label>
                <select
                  value={ticket.priority}
                  onChange={e => updateTicketPriority(ticket.id, e.target.value as TicketPriority)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option>Urgente</option>
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">Asignado a</label>
                <select
                  value={ticket.assignedToId || ''}
                  onChange={e => assignTicket(ticket.id, e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">Sin asignar</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">Información</h3>
            <div className="space-y-2.5">
              <div>
                <div className="text-slate-500 text-xs mb-1">Categoría</div>
                <div className="text-slate-300 text-sm">{ticket.category}</div>
              </div>
              {dept && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">Departamento</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-slate-300 text-sm">{dept.name}</span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-slate-500 text-xs mb-1">Creado por</div>
                <div className="text-slate-300 text-sm">{ticket.createdByName}</div>
              </div>
              {ticket.assignedToName && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">Asignado a</div>
                  <div className="text-slate-300 text-sm">{ticket.assignedToName}</div>
                </div>
              )}
              <div>
                <div className="text-slate-500 text-xs mb-1">Creado</div>
                <div className="text-slate-300 text-sm">{formatDate(ticket.createdAt)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Última actualización</div>
                <div className="text-slate-300 text-sm">{formatDate(ticket.updatedAt)}</div>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`rounded-2xl p-4 border ${statusColors[ticket.status]}`}>
            <div className="text-xs opacity-70 mb-1">Estado actual</div>
            <div className="font-semibold">{ticket.status}</div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Imagen ampliada" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
