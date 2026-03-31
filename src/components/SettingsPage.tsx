import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AppSettings, TicketPriority } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'SoporteHub',
  companyEmail: 'soporte@empresa.com',
  companyPhone: '+1 (555) 000-0000',
  companyAddress: '',
  primaryColor: '#7C3AED',
  ticketPrefix: 'TKT',
  allowClientRegistration: true,
  notifyOnNewTicket: true,
  notifyOnStatusChange: true,
  notifyOnNewMessage: true,
  maxAttachmentMB: 5,
  defaultPriority: 'Media',
  autoCloseResolvedDays: 7,
};

const STORAGE_KEY = 'soporte_hub_settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/* ─── sub-components ───────────────────────────────────────────────────────── */
function SectionCard({ title, description, icon, children }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
          {icon}
        </div>
        <div>
          <div className="text-white font-semibold text-sm">{title}</div>
          <div className="text-slate-500 text-xs">{description}</div>
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-slate-600 text-xs mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#13151f] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
    />
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div>
        <div className="text-white text-sm font-medium">{label}</div>
        {description && <div className="text-slate-500 text-xs mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all shrink-0 ml-4 ${checked ? 'bg-indigo-600' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all shadow ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

const PRIORITY_OPTIONS: TicketPriority[] = ['Baja', 'Media', 'Alta', 'Urgente'];
const PRESET_COLORS = ['#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#0891B2', '#DB2777', '#65A30D'];

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const { currentUser } = useApp();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  // Admin-only guard
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Acceso Restringido</h2>
          <p className="text-slate-400">Solo los administradores pueden acceder a la configuración.</p>
        </div>
      </div>
    );
  }

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm('¿Restaurar todos los valores por defecto?')) {
      setSettings(DEFAULT_SETTINGS);
      setSaved(false);
    }
  };

  const sections = [
    { id: 'general', label: 'Información General', icon: '🏢' },
    { id: 'tickets', label: 'Configuración de Tickets', icon: '🎫' },
    { id: 'notifications', label: 'Notificaciones', icon: '🔔' },
    { id: 'appearance', label: 'Apariencia', icon: '🎨' },
    { id: 'supabase', label: 'Base de Datos', icon: '🗄️' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración</h1>
          <p className="text-slate-400 text-sm mt-1">Administra las preferencias del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
            Restablecer
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {saved ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Guardado
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <aside className="w-52 shrink-0">
          <nav className="space-y-1 sticky top-6">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeSection === s.id
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <span className="text-base">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 space-y-6">

          {/* ── GENERAL ── */}
          {activeSection === 'general' && (
            <SectionCard
              title="Información de la Empresa"
              description="Datos que aparecen en los reportes y notificaciones"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
            >
              <Field label="Nombre de la empresa">
                <TextInput value={settings.companyName} onChange={v => set('companyName', v)} placeholder="SoporteHub" />
              </Field>
              <Field label="Correo electrónico de soporte">
                <TextInput value={settings.companyEmail} onChange={v => set('companyEmail', v)} placeholder="soporte@empresa.com" type="email" />
              </Field>
              <Field label="Teléfono de contacto">
                <TextInput value={settings.companyPhone} onChange={v => set('companyPhone', v)} placeholder="+1 (555) 000-0000" />
              </Field>
              <Field label="Dirección" hint="Aparece en el pie de los reportes impresos">
                <TextInput value={settings.companyAddress} onChange={v => set('companyAddress', v)} placeholder="Calle 123, Ciudad, País" />
              </Field>
            </SectionCard>
          )}

          {/* ── TICKETS ── */}
          {activeSection === 'tickets' && (
            <SectionCard
              title="Configuración de Tickets"
              description="Ajusta el comportamiento del sistema de tickets"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>}
            >
              <Field label="Prefijo de tickets" hint="Ej: TKT-0001, SUP-0001">
                <TextInput value={settings.ticketPrefix} onChange={v => set('ticketPrefix', v.toUpperCase().slice(0, 6))} placeholder="TKT" />
              </Field>

              <Field label="Prioridad por defecto" hint="Prioridad asignada al crear un nuevo ticket">
                <div className="flex gap-2 flex-wrap mt-1">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p}
                      onClick={() => set('defaultPriority', p)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                        settings.defaultPriority === p
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Cierre automático (días)" hint="Tickets resueltos se cierran automáticamente tras N días (0 = desactivado)">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={settings.autoCloseResolvedDays}
                    onChange={e => set('autoCloseResolvedDays', Number(e.target.value))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="text-white font-bold text-sm w-12 text-center bg-white/5 rounded-lg py-1">
                    {settings.autoCloseResolvedDays === 0 ? 'OFF' : `${settings.autoCloseResolvedDays}d`}
                  </span>
                </div>
              </Field>

              <Field label="Tamaño máximo de adjuntos (MB)" hint="Tamaño máximo permitido por archivo adjunto">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={settings.maxAttachmentMB}
                    onChange={e => set('maxAttachmentMB', Number(e.target.value))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="text-white font-bold text-sm w-16 text-center bg-white/5 rounded-lg py-1">
                    {settings.maxAttachmentMB} MB
                  </span>
                </div>
              </Field>

              <div className="mt-2">
                <Toggle
                  checked={settings.allowClientRegistration}
                  onChange={v => set('allowClientRegistration', v)}
                  label="Registro de clientes"
                  description="Permitir que nuevos clientes se registren en el sistema"
                />
              </div>
            </SectionCard>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeSection === 'notifications' && (
            <SectionCard
              title="Notificaciones"
              description="Configura cuándo se envían notificaciones al equipo"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
            >
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Nota
                </div>
                <p className="text-slate-400 text-xs">Las notificaciones requieren configuración de email en Supabase (Edge Functions). Estos ajustes se guardan como preferencias.</p>
              </div>
              <Toggle
                checked={settings.notifyOnNewTicket}
                onChange={v => set('notifyOnNewTicket', v)}
                label="Nuevo ticket creado"
                description="Notificar a agentes cuando se crea un nuevo ticket"
              />
              <Toggle
                checked={settings.notifyOnStatusChange}
                onChange={v => set('notifyOnStatusChange', v)}
                label="Cambio de estado"
                description="Notificar al cliente cuando cambia el estado de su ticket"
              />
              <Toggle
                checked={settings.notifyOnNewMessage}
                onChange={v => set('notifyOnNewMessage', v)}
                label="Nuevo mensaje"
                description="Notificar cuando hay respuesta en un ticket"
              />
            </SectionCard>
          )}

          {/* ── APPEARANCE ── */}
          {activeSection === 'appearance' && (
            <SectionCard
              title="Apariencia"
              description="Personaliza los colores y la identidad visual del sistema"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>}
            >
              <Field label="Color principal" hint="Color de acento del sistema (botones, resaltados, íconos activos)">
                <div className="flex flex-wrap gap-2 mb-3 mt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => set('primaryColor', c)}
                      className="w-9 h-9 rounded-xl transition-all hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: settings.primaryColor === c ? `3px solid ${c}` : '3px solid transparent',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={e => set('primaryColor', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <div className="flex items-center gap-2 bg-[#13151f] border border-white/10 rounded-xl px-3 py-2 flex-1">
                    <div className="w-4 h-4 rounded-md" style={{ backgroundColor: settings.primaryColor }} />
                    <span className="text-slate-400 text-sm font-mono">{settings.primaryColor}</span>
                  </div>
                </div>
              </Field>

              {/* Preview */}
              <div className="bg-[#13151f] border border-white/5 rounded-xl p-5">
                <p className="text-xs text-slate-500 mb-4">Vista previa</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: settings.primaryColor }}>
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  </div>
                  <div>
                    <div className="text-white font-bold text-base">{settings.companyName}</div>
                    <div className="text-xs" style={{ color: settings.primaryColor }}>Soporte Técnico</div>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: settings.primaryColor }}>
                  Botón de ejemplo
                </button>
                <div className="mt-3 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: settings.primaryColor + '20', color: settings.primaryColor, border: `1px solid ${settings.primaryColor}33` }}>
                  Elemento activo del menú
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── SUPABASE / DB ── */}
          {activeSection === 'supabase' && (
            <SectionCard
              title="Base de Datos (Supabase)"
              description="Configuración de la conexión con Supabase"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>}
            >
              {/* SQL Schema */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Esquema SQL requerido</label>
                <div className="bg-[#0a0b10] border border-white/5 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-auto max-h-72 leading-relaxed">
                  {`-- Perfiles de usuario
create table if not exists profiles (
  id uuid references auth.users primary key,
  name text,
  email text,
  role text default 'Cliente',
  avatar_color text,
  department_id uuid,
  created_at timestamptz default now()
);

-- Departamentos
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text default '#7C3AED',
  created_at timestamptz default now()
);

-- Tickets
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
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

-- Mensajes
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  author_id uuid,
  author_name text,
  author_role text,
  content text,
  is_internal boolean default false,
  image_url text,
  created_at timestamptz default now()
);

-- RLS (habilitar seguridad por filas)
alter table profiles enable row level security;
alter table tickets enable row level security;
alter table messages enable row level security;
alter table departments enable row level security;

-- Políticas básicas (ajustar según necesidad)
create policy "Allow all" on profiles for all using (true);
create policy "Allow all" on tickets for all using (true);
create policy "Allow all" on messages for all using (true);
create policy "Allow all" on departments for all using (true);`}
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => {
                    localStorage.removeItem('sb_url');
                    localStorage.removeItem('sb_key');
                    window.location.reload();
                  }}
                  className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/20 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                  Reconfigurar Supabase
                </button>
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-sm font-semibold">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Supabase conectado
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                <div className="text-indigo-400 text-xs font-semibold mb-2">💡 Tip: Variables de entorno</div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Para un entorno de producción, configura las variables de entorno en tu proveedor de hosting:
                </p>
                <div className="mt-2 font-mono text-xs text-slate-400 space-y-0.5">
                  <div>VITE_SUPABASE_URL=https://xxx.supabase.co</div>
                  <div>VITE_SUPABASE_ANON_KEY=eyJhbGciO...</div>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
