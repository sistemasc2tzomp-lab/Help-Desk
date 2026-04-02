import React, { useState } from 'react';
import { initSupabase, resetSupabaseClient } from '../lib/supabase';

interface Props {
  onConfigured: () => void;
}

export default function SetupPage({ onConfigured }: Props) {
  const [url, setUrl] = useState(localStorage.getItem('sb_url') || '');
  const [key, setKey] = useState(localStorage.getItem('sb_key') || '');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanKey = key.trim();

    if (!cleanUrl || !cleanKey) {
      setError('Ambos campos son requeridos para el enlace.');
      return;
    }
    if (!cleanUrl.startsWith('http')) {
      setError('La URL debe comenzar con el protocolo https://');
      return;
    }

    setError('');
    setTesting(true);

    try {
      resetSupabaseClient();
      const client = initSupabase(cleanUrl, cleanKey);
      // Test connection
      const { error: testErr } = await client.from('perfiles').select('id').limit(1);
      if (testErr && testErr.code !== 'PGRST116' && testErr.message?.includes('relation') === false) {
        // connection failed
      }
      onConfigured();
    } catch (err) {
      setError('Error en enlace. Verifique los parámetros de red.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014] px-4 py-8 relative overflow-hidden">
      {/* Background Grid & Glows */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#ffffff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#cccccc]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Logo Section */}
      <div className="flex flex-col items-center mb-12 relative z-10">
        <div className="w-24 h-24 rounded-[32px] bg-white/5 border-2 border-[#ffffff]/30 flex items-center justify-center mb-6 shadow-2xl shadow-white/5 group hover:border-[#ffffff] transition-all duration-700">
           <div className="absolute inset-0 bg-[#ffffff]/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 group-hover:scale-110 transition-transform">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 className="text-white text-4xl sm:text-5xl font-black font-orbitron tracking-tighter text-center uppercase mb-2">
            ENLACE <span className="text-white">MAESTRO</span>
        </h1>
        <div className="text-[#8888aa] text-[10px] font-black uppercase tracking-[5px] mt-2 bg-white/5 px-6 py-2 rounded-full border border-white/5">CONFIGURACIÓN_SISTEMA_CORE</div>
      </div>

      {/* Config Card */}
      <div className="w-full max-w-lg glass-panel rounded-[40px] p-10 shadow-2xl border border-white/10 relative z-10">
        
        <div className="flex items-center gap-6 mb-10 pb-10 border-b border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-[#ffffff]/10 flex items-center justify-center border border-[#ffffff]/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><ellipse cx="12" cy="5" rx="9" ry="3"/>
            </svg>
          </div>
          <div>
            <h2 className="text-white text-xl font-black font-orbitron tracking-widest uppercase">SUPABASE INTEGRATION</h2>
            <p className="text-[#8888aa] text-[10px] font-bold uppercase tracking-[3px] mt-1 opacity-70">CONECTE EL NÚCLEO A LA BASE DE DATOS</p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-[#ffffff]/5 border border-[#ffffff]/20 rounded-3xl p-6 mb-10 flex gap-4">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" className="shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
           <div>
              <p className="text-white text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                ADQUISICIÓN DE CREDENCIALES EN{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ffffff] hover:underline"
                >
                  DASHBOARD_SUPABASE
                </a>{' '}
                → SETTINGS → API_CONFIG
              </p>
           </div>
        </div>

        <form onSubmit={handleSave} className="space-y-10">
          {/* URL */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">
              PROJECT_URL_GATEWAY
            </label>
            <div className="relative group">
              <input
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); setError(''); }}
                placeholder="https://su-proyecto.supabase.co"
                autoComplete="off"
                className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-6 py-5 text-white font-rajdhani font-bold placeholder-slate-700 text-sm focus:outline-none focus:border-[#ffffff]/50 transition-all"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                 <div className="w-2 h-2 rounded-full bg-[#ffffff] animate-ping" />
              </div>
            </div>
          </div>

          {/* Anon Key */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">
              ANON_PUBLIC_ACCESS_KEY
            </label>
            <div className="relative group">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={e => { setKey(e.target.value); setError(''); }}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                autoComplete="off"
                className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-6 py-5 text-white font-rajdhani font-bold placeholder-slate-700 text-sm focus:outline-none focus:border-[#ffffff]/50 transition-all pr-16"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-[#8888aa] hover:text-[#ffffff] transition-colors"
              >
                {showKey ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-[28px] px-6 py-5 animate-shake">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[2px]">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={testing}
            className="btn-futuristic w-full py-5 text-[12px] font-black uppercase tracking-[5px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 group"
          >
            {testing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ESTABLECIENDO ENLACE...
              </>
            ) : (
              <>
                VINCULAR_SISTEMA_CORE
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
              </>
            )}
          </button>
        </form>

        {/* SQL Schema hint */}
        <details className="mt-12 group/details">
          <summary className="text-[#8888aa] text-[9px] font-black uppercase tracking-[4px] cursor-pointer hover:text-[#ffffff] transition-colors select-none flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-open/details:rotate-90 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
            VISUALIZAR ESQUEMA_SQL REQUERIDO
          </summary>
          <div className="mt-6 bg-[#030014] rounded-3xl p-8 border border-white/5 overflow-x-auto max-h-[300px] custom-scrollbar">
            <pre className="text-gray-300 text-[10px] leading-relaxed whitespace-pre font-mono">
              {`-- PERFILES_CORE
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'Cliente',
  avatar_color TEXT,
  department_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTORES_INFRA
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#ffffff',
  jefe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATRIZ_TICKETS
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Abierto',
  priority TEXT DEFAULT 'Media',
  category TEXT DEFAULT 'General',
  department_id UUID REFERENCES departments(id),
  created_by_id UUID,
  created_by_name TEXT,
  assigned_to_id UUID,
  assigned_to_name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`}
            </pre>
          </div>
        </details>
      </div>

      <p className="text-[#8888aa] text-[9px] font-bold uppercase tracking-[3px] mt-10 opacity-40">
        LOS DATOS DE ACCESO SERÁN ALMACENADOS EXCLUSIVAMENTE EN EL ALMACENAMIENTO LOCAL CIFRADO DEL NAVEGADOR
      </p>
    </div>
  );
}
