import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TicketPriority, TicketCategory } from '../types';

export default function NewTicket() {
  const { currentUser, addTicket, setPage, setSelectedTicketId, departments } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Media');
  const [category, setCategory] = useState<TicketCategory>('General');
  const [departmentId, setDepartmentId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Auto-detectar departamento del usuario logueado
  useEffect(() => {
    if (departments.length > 0) {
      // Si el usuario tiene departamento asignado, usarlo
      if (currentUser?.departmentId) {
        setDepartmentId(currentUser.departmentId);
      } else if (!departmentId) {
        // Fallback: seleccionar el primero disponible
        setDepartmentId(departments[0].id);
      }
    }
  }, [departments, currentUser]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !currentUser || !departmentId) return;

    setUploadingImage(true);
    let imageUrl: string | undefined;
    if (imageFile && imagePreview) {
      // Usar base64 directamente (fallback estable sin Supabase Storage)
      imageUrl = imagePreview;
    }
    setUploadingImage(false);

    try {
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
    } catch (err: any) {
      alert(`Error al crear el ticket: ${err.message || 'Verifica tu conexión o permisos.'}`);
    }
  };

  // Nombre del departamento detectado automáticamente
  const autoDetectedDept = departments.find(d => d.id === departmentId);

  if (submitted) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-vh-[70vh] bg-[#030014]">
        <div className="w-24 h-24 rounded-full bg-gray-400/10 border-4 border-gray-400/30 flex items-center justify-center mb-8 animate-pulse shadow-[0_0_50px_rgba(255,255,255,0.05)]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#aaaaaa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-white text-3xl font-black font-orbitron tracking-widest mb-4 uppercase">TICKET ENVIADO</h2>
        <p className="text-[#8888aa] text-sm font-bold tracking-[3px] uppercase animate-fade-in">Redirigiendo al núcleo de control...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-3xl mx-auto space-y-10 min-h-screen bg-[#030014]">
      {/* Header Area */}
      <div className="space-y-4">
        <button
          onClick={() => setPage('tickets')}
          className="group flex items-center gap-3 text-[#8888aa] hover:text-[#ffffff] transition-all text-[10px] font-black uppercase tracking-[3px]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Regresar
        </button>
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-orbitron tracking-tighter mb-2 uppercase">
            NUEVO <span className="text-white">TICKET</span>
          </h1>
          <p className="text-[#8888aa] text-sm font-rajdhani font-semibold tracking-[4px] uppercase">MÓDULO DE REPORTE Y ASIGNACIÓN DE RECURSOS</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel border-white/5 rounded-[40px] p-8 sm:p-12 space-y-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffffff]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        
        {/* Title Node */}
        <div className="space-y-3 relative z-10">
          <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Asunto del Ticket</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Describe brevemente el problema..."
            required
            className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder-slate-700 text-lg font-orbitron tracking-tight focus:outline-none focus:border-[#ffffff]/50 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          />
        </div>

        {/* Description */}
        <div className="space-y-3 relative z-10">
          <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Descripción Detallada</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe el problema con detalle: qué pasó, cuándo ocurrió, equipos afectados..."
            required
            rows={6}
            className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-3xl px-6 py-6 text-[#8888aa] placeholder-slate-800 text-base font-rajdhani font-semibold focus:outline-none focus:border-[#ffffff]/50 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Clasificación + Prioridad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Clasificación del Problema</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as TicketCategory)}
              className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-xs font-black focus:outline-none focus:border-[#ffffff]/50 transition-all cursor-pointer uppercase tracking-widest font-mono"
            >
              <option value="Hardware">🖥️ Hardware</option>
              <option value="Software">💿 Software</option>
              <option value="Red">🌐 Red / Conectividad</option>
              <option value="Seguridad">🔒 Seguridad</option>
              <option value="Acceso">🔑 Acceso / Contraseñas</option>
              <option value="Impresora">🖨️ Impresora / Escáner</option>
              <option value="Correo">📧 Correo Electrónico</option>
              <option value="Servidor">🗄️ Servidor / Sistema</option>
              <option value="Respaldo">💾 Respaldo / Datos</option>
              <option value="General">📋 General</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Nivel de Prioridad</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as TicketPriority)}
              className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-xs font-black focus:outline-none focus:border-[#ffffff]/50 transition-all cursor-pointer uppercase tracking-widest font-mono"
            >
              <option value="Baja">🟢 Baja — Consultas y Mejoras</option>
              <option value="Media">🟡 Media — Flujo Reducido</option>
              <option value="Alta">🟠 Alta — Bloqueo Operativo</option>
              <option value="Urgente">🔴 Urgente — Sistema Caído</option>
            </select>
          </div>
        </div>

        {/* Sector Responsable - Auto detectado */}
        <div className="space-y-3 relative z-10">
          <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Sector Responsable (Departamento)</label>
          {autoDetectedDept ? (
            <div className="w-full bg-[#0f0a28]/50 border border-[#ffffff]/30 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-xs font-black uppercase tracking-widest font-mono">{autoDetectedDept.name}</span>
              <span className="text-[#8888aa] text-[9px] font-bold uppercase tracking-[2px] ml-auto">Auto-detectado</span>
            </div>
          ) : (
            <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 text-amber-400 text-xs font-black uppercase tracking-widest font-mono">
              ⚠️ Sin departamento asignado — Contacta al administrador
            </div>
          )}
          {/* Campo oculto por si se necesita seleccionar manualmente */}
          {departments.length > 1 && (
            <details className="mt-2">
              <summary className="text-[9px] text-[#8888aa] cursor-pointer hover:text-white transition-colors uppercase tracking-[2px] font-bold">
                ▸ Cambiar departamento manualmente
              </summary>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                required
                className="mt-2 w-full bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-xs font-black focus:outline-none focus:border-[#ffffff]/50 transition-all cursor-pointer uppercase tracking-widest font-mono"
              >
                <option value="" disabled>SELECCIONAR DEPARTAMENTO</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>
                ))}
              </select>
            </details>
          )}
        </div>

        {/* Visual Documentation */}
        <div className="space-y-4 relative z-10">
          <label className="text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">Documentación Visual (Adjuntos)</label>
          {imagePreview ? (
            <div className="relative rounded-3xl overflow-hidden border-2 border-[#ffffff]/30 bg-[#030014] group/prev shadow-2xl">
              <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/prev:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button
                    type="button"
                    onClick={removeImage}
                    className="bg-[#999999] text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[3px] border border-white/20 hover:scale-105 transition-all shadow-2xl"
                >
                    Eliminar imagen
                </button>
              </div>
              <div className="absolute bottom-0 left-0 w-full px-6 py-3 bg-[#030014]/60 backdrop-blur-md flex items-center gap-3 border-t border-white/10">
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
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white text-xs font-black uppercase tracking-[3px]">Adjuntar imagen</p>
                <p className="text-[#8888aa] text-[9px] font-bold mt-2 tracking-[2px] uppercase opacity-60">PNG / JPG / GIF / WEBP — Máx 5MB</p>
              </div>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden"/>
        </div>

        {/* Priority Matrix Helper */}
        <div className="glass-panel rounded-3xl p-5 border border-white/5 space-y-3 relative z-10">
          <p className="text-[9px] font-black text-[#8888aa] uppercase tracking-[3px] mb-2 opacity-50">Guía de Priorización</p>
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
            Reiniciar Ticket
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !description.trim() || !departmentId || uploadingImage}
            className="btn-futuristic px-12 py-5 text-xs font-black tracking-[5px] group"
          >
            {uploadingImage ? (
              <span className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-[#030014]/30 border-t-[#030014] rounded-full animate-spin" />
                Procesando...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                ENVIAR TICKET
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
