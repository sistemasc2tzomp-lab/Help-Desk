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
      // If Supabase not available, use local base64 preview
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
      <div className="p-6 flex flex-col items-center justify-center min-h-96">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-5 animate-bounce">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-white text-2xl font-bold mb-2">¡Ticket creado exitosamente!</h2>
        <p className="text-slate-400 text-sm">Redirigiendo al ticket...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => setPage('tickets')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Volver
        </button>
        <h1 className="text-2xl font-bold text-white">Nuevo Ticket</h1>
        <p className="text-slate-400 text-sm mt-1">Describe tu problema o solicitud para que nuestro equipo pueda ayudarte</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#1a1d27] border border-white/5 rounded-2xl p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Error al iniciar sesión en el portal"
            required
            className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Descripción <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe el problema con el mayor detalle posible. ¿Cuándo ocurre? ¿Qué pasos realizaste? ¿Qué error aparece?"
            required
            rows={5}
            className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
          />
        </div>

        {/* Category & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as TicketCategory)}
              className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-3 text-slate-300 text-sm focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="Técnico">Técnico</option>
              <option value="Facturación">Facturación</option>
              <option value="Bug">Bug</option>
              <option value="Feature">Feature</option>
              <option value="General">General</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Prioridad</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as TicketPriority)}
              className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-3 text-slate-300 text-sm focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>

        {/* Department */}
        {departments.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Departamento</label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-3 text-slate-300 text-sm focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">Sin departamento</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Image Attachment */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Adjuntar Imagen del Problema
          </label>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0f1117]">
              <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <div className="px-3 py-2 bg-black/40 flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-emerald-400 text-xs">{imageFile?.name}</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-indigo-500/10 flex items-center justify-center transition">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-slate-300 text-sm font-medium">Haz clic para adjuntar una imagen</p>
                <p className="text-slate-500 text-xs mt-1">PNG, JPG, GIF, WEBP — máx. 5 MB</p>
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

        {/* Priority hint */}
        <div className="bg-[#0f1117] rounded-xl p-3 text-xs text-slate-500 space-y-1.5">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-500 shrink-0"></span><strong className="text-slate-400">Baja:</strong> Consultas generales, mejoras no urgentes</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></span><strong className="text-slate-400">Media:</strong> Problemas que afectan el trabajo pero hay alternativas</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span><strong className="text-slate-400">Alta:</strong> Problemas que impiden el trabajo normal</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span><strong className="text-slate-400">Urgente:</strong> Sistema caído, pérdida de datos, impacto crítico</div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setPage('tickets')}
            className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !description.trim() || uploadingImage}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-900/30"
          >
            {uploadingImage ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Subiendo imagen...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                Crear Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
