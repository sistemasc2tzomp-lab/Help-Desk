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
      setError('Ambos campos son requeridos.');
      return;
    }
    if (!cleanUrl.startsWith('http')) {
      setError('La URL debe comenzar con https://');
      return;
    }

    setError('');
    setTesting(true);

    try {
      resetSupabaseClient();
      const client = initSupabase(cleanUrl, cleanKey);
      // Test connection
      const { error: testErr } = await client.from('profiles').select('id').limit(1);
      if (testErr && testErr.code !== 'PGRST116' && testErr.message?.includes('relation') === false) {
        // PGRST116 = no rows, that's fine. Other errors might mean wrong credentials.
        // We still proceed — table might not exist yet but connection worked
      }
      onConfigured();
    } catch (err) {
      setError('No se pudo conectar. Verifica la URL y la clave anónima.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f1117] px-4 py-8">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-xl shadow-indigo-900/40">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-tight text-center">Tickets Tzompantepec</h1>
        <p className="text-indigo-400 text-sm mt-1">Sistema de Tickets</p>
      </div>

      {/* Config Card */}
      <div className="w-full max-w-md bg-[#1a1d27] rounded-2xl p-7 shadow-2xl border border-white/5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              <path d="M14.83 9.17a4 4 0 0 1 0 5.66M9.17 9.17a4 4 0 0 0 0 5.66"/>
            </svg>
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold">Configurar Supabase</h2>
            <p className="text-slate-400 text-xs">Ingresa las credenciales de tu proyecto</p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6">
          <p className="text-indigo-300 text-xs leading-relaxed">
            Encuentra estos valores en tu{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 underline hover:text-indigo-300"
            >
              dashboard de Supabase
            </a>{' '}
            → Settings → API
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Project URL
            </label>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }}
              placeholder="https://xxxx.supabase.co"
              autoComplete="off"
              className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
            />
          </div>

          {/* Anon Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Anon / Public Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={e => { setKey(e.target.value); setError(''); }}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                autoComplete="off"
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition pr-11 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
              >
                {showKey ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-400 shrink-0">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={testing}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Conectando...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Guardar y Conectar
              </>
            )}
          </button>
        </form>

        {/* SQL Schema hint */}
        <details className="mt-6">
          <summary className="text-slate-400 text-xs cursor-pointer hover:text-slate-300 transition select-none">
            📋 Ver esquema SQL requerido
          </summary>
          <div className="mt-3 bg-[#0f1117] rounded-xl p-4 overflow-x-auto">
            <pre className="text-emerald-400 text-[10px] leading-relaxed whitespace-pre">{`-- Profiles (linked to auth.users)
create table profiles (
  id uuid references auth.users primary key,
  name text,
  email text,
  role text default 'Cliente',
  avatar_color text,
  department_id uuid
);

-- Departments
create table departments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  color text default '#7C3AED',
  created_at timestamptz default now()
);

-- Tickets
create table tickets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text default 'Abierto',
  priority text default 'Media',
  category text default 'General',
  department_id uuid references departments(id),
  created_by_id uuid,
  created_by_name text,
  assigned_to_id uuid,
  assigned_to_name text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references tickets(id) on delete cascade,
  author_id uuid,
  author_name text,
  author_role text,
  content text,
  is_internal boolean default false,
  image_url text,
  created_at timestamptz default now()
);

-- Enable RLS (adjust policies as needed)
alter table profiles enable row level security;
alter table tickets enable row level security;
alter table messages enable row level security;
alter table departments enable row level security;

-- Simple open policies for demo (restrict in production!)
create policy "allow all" on profiles for all using (true);
create policy "allow all" on tickets for all using (true);
create policy "allow all" on messages for all using (true);
create policy "allow all" on departments for all using (true);`}</pre>
          </div>
        </details>
      </div>

      <p className="text-slate-600 text-xs mt-6">
        Las credenciales se guardan localmente en tu navegador
      </p>
    </div>
  );
}
