import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { TicketPriority, TicketCategory } from '../types';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';

export default function NewTicket() {
  const { currentUser, addTicket, setPage, setSelectedTicketId, departments } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Media');
  const [category, setCategory] = useState<TicketCategory>('General');
  const [departmentId, setDepartmentId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Image attachment
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5 MB.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (file: File): Promise<string | undefined> => {
    if (!isSupabaseConfigured()) return undefined;
    const ext = file.name.split('.').pop();
    const path = `tickets/${Date.now()}.${ext}`;
    const sb = getSupabase();
    const { error } = await sb.storage.from('attachments').upload(path, file, { upsert: true });
    if (error) return undefined;
    const { data } = sb.storage.from('attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !currentUser) return;

    setUploadingImage(true);
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      if (!imageUrl && imagePreview) imageUrl = imagePreview;
    }
    setUploadingImage(false);

    const newTicket = await addTicket({
      title: title.trim(),
      description: description.trim(),
      status: 'Abierto',
      priority,
      category,
      departmentId: departmentId || undefined,
      createdById: currentUser.id,
      createdByName: currentUser.name,
      imageUrl,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSelectedTicketId(newTicket.id);
      setPage('ticket-detail');
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-vh-[70vh] bg-[#050505]">
        <div className="w-24 h-24 rounded-full bg-gray-400/10 border-4 border-gray-400/30 flex items-center justify-center mb-8 animate-pulse shadow-[0_0_50px_rgba(255,255,255,0.05)]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#aaaaaa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-white text-3xl font-black font-orbitron tracking-widest mb-4 uppercase">TRANSMISIÓN ESTABLECIDA</h2>
        <p className="text-[#8888aa] text-sm font-bold tracking-[3px] uppercase animate-fade-in">Redirigiendo al núcleo de control...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-3xl mx-auto space-y-10 min-h-screen bg-[#050505]">
      {/* Header Area */}
      <div className="space-y-4">
        <button
          onClick={() => setPage('tickets')}
          className="group flex items-center gap-3 text-[#8888aa] hover:text-[#ffffff] transition-all text-[10px] font-black uppercase tracking-[3px]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Abortar Operación
        </button>
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-orbitron tracking-tighter mb-2 uppercase">
            NUEVA <span className="text-white">INCIDENCIA</span>
          </h1>
          <p className="text-[#8888aa] text-sm font-rajdhani font-semibold tracking-[4px] uppercase">MODULO DE REPORTE Y ASIGNACIÓN DE RECURSOS</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel border-white/5 rounded-[40px] p-8 sm:p-12 space-y-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffffff]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        
        {/* Title Node */}
        <div className="space-y-3 relative z-10">
          <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Cabezal del Reporte (Asunto)</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="SYNTAX_ERROR_IN_CORE_..."
            required
            className="w-full bg-[#121212]/50 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder-slate-700 text-lg font-orbitron tracking-tight focus:outline-none focus:border-[#ffffff]/50 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          />
        </div>

        {/* Description Base */}
        <div className="space-y-3 relative z-10">
          <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Bitácora de Detalles</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Introduce los parámetros técnicos del problema. Incluye códigos de error, capturas y contexto operativo..."
            required
            rows={6}
            className="w-full bg-[#121212]/50 border border-white/10 rounded-3xl px-6 py-6 text-[#8888aa] placeholder-slate-800 text-base font-rajdhani font-semibold focus:outline-none focus:border-[#ffffff]/50 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Configuration Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Clasificación</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as TicketCategory)}
              className="w-full bg-[#121212]/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-xs font-black focus:outline-none focus:border-[#ffffff]/50 transition-all cursor-pointer uppercase tracking-widest font-mono"
            >
              <option value="Técnico">TÉCNICO</option>
              <option value="Facturación">FACTURACIÓN</option>
              <option value="Bug">BUG_SISTEMA</option>
              <option value="Feature">MEJORA_REQUEST</option>
              <option value="General">GENERAL</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Nivel_Prioridad</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as TicketPriority)}
              className="w-full bg-[#121212]/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-xs font-black focus:outline-none focus:border-[#ffffff]/50 transition-all cursor-pointer uppercase tracking-widest font-mono"
            >
              <option value="Baja">BAJA_NODAL</option>
              <option value="Media">MEDIA_ESTÁNDAR</option>
              <option value="Alta">ALTA_VALOR</option>
              <option value="Urgente">URGENTE_CRÍTICO</option>
            </select>
          </div>
        </div>

        {/* Sector Allocation */}
        {departments.length > 0 && (
          <div className="space-y-3 relative z-10">
            <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Sector Responsable (Departamento)</label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full bg-[#121212]/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-xs font-black focus:outline-none focus:border-[#ffffff]/50 transition-all cursor-pointer uppercase tracking-widest font-mono"
            >
              <option value="">CANAL_GLOBAL</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        {/* Visual Documentation Subsystem */}
        <div className="space-y-4 relative z-10">
          <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Documentación Visual (Adjuntos)</label>
          {imagePreview ? (
            <div className="relative rounded-3xl overflow-hidden border-2 border-[#ffffff]/30 bg-[#050505] group/prev shadow-2xl">
              <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/prev:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button
                    type="button"
                    onClick={removeImage}
                    className="bg-[#999999] text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[3px] border border-white/20 hover:scale-105 transition-all shadow-2xl"
                >
                    Purgar Recurso
                </button>
              </div>
              <div className="absolute bottom-0 left-0 w-full px-6 py-3 bg-[#050505]/60 backdrop-blur-md flex items-center gap-3 border-t border-white/10">
                <div className="w-2 h-2 rounded-full bg-[#aaaaaa] animate-pulse" />
                <span className="text-[#aaaaaa] text-[10px] font-black uppercase tracking-[2px]">{imageFile?.name} cargado</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/10 rounded-[32px] p-12 flex flex-col items-center gap-4 hover:border-[#ffffff]/40 hover:bg-[#ffffff]/5 transition-all duration-500 group cursor-pointer"
            >
              <div className="w-20 h-20 rounded-3xl bg-white/5 group-hover:bg-[#ffffff]/10 flex items-center justify-center transition-all duration-500 group-hover:scale-110 border border-white/10">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white text-xs font-black uppercase tracking-[3px]">Click para inyectar recursos visuales</p>
                <p className="text-[#8888aa] text-[9px] font-bold mt-2 tracking-[2px] uppercase opacity-60">Filtro: PNG / JPG / GIF / WEBP — Límite 5MB</p>
              </div>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Priority Matrix Helper */}
        <div className="glass-panel rounded-3xl p-5 border border-white/5 space-y-3 relative z-10">
          <p className="text-[9px] font-black text-[#8888aa] uppercase tracking-[3px] mb-2 opacity-50">Matriz de Priorización Operativa</p>
          <div className="grid grid-cols-2 gap-4">
             <div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-white/5" /><div className="text-[9px] text-[#8888aa] font-bold tracking-widest uppercase">BAJA: CONSULTAS Y MEJORAS</div></div>
             <div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-white/10" /><div className="text-[9px] text-[#8888aa] font-bold tracking-widest uppercase">MEDIA: FLUJO REDUCIDO</div></div>
             <div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-white/30" /><div className="text-[9px] text-[#8888aa] font-bold tracking-widest uppercase">ALTA: BLOQUEO OPERATIVO</div></div>
             <div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-white animate-pulse" /><div className="text-[9px] text-[#ffffff] font-black tracking-widest uppercase">URGENTE: CRÍTICO / DOWN</div></div>
          </div>
        </div>

        {/* Transmission Controls */}
        <div className="flex items-center justify-end gap-6 pt-6 relative z-10">
          <button
            type="button"
            onClick={() => setPage('tickets')}
            className="text-[#8888aa] hover:text-white transition-colors text-[10px] font-black uppercase tracking-[4px]"
          >
            Purgar Entrada
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !description.trim() || uploadingImage}
            className="btn-futuristic px-12 py-5 text-xs font-black tracking-[5px] group"
          >
            {uploadingImage ? (
              <span className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                Dumping_Buff...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                LANZAR TRANSMISIÓN
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                   <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
