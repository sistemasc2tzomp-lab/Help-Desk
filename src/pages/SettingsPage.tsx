import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { AppSettings, TicketPriority } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Sistema Tickets Tzompantepec',
  companyEmail: 'soporte@tzompantepec.gob.mx',
  companyPhone: '+52 (000) 000-0000',
  companyAddress: 'Tzompantepec, Tlaxcala, México',
  primaryColor: '#ffffff',
  ticketPrefix: 'TZH',
  allowClientRegistration: true,
  notifyOnNewTicket: true,
  notifyOnStatusChange: true,
  notifyOnNewMessage: true,
  maxAttachmentMB: 10,
  defaultPriority: 'Media',
  autoCloseResolvedDays: 5,
};

const STORAGE_KEY = 'help_desk_tzomp_settings';

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

/* ─── Cyber Beep ───────────────────────────────────────────────────────────── */
const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
};

/* ─── UI Components ────────────────────────────────────────────────────────── */
function SectionCard({ title, description, icon, children }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel border border-white/5 rounded-[40px] overflow-hidden group shadow-2xl relative">
       <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/2 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-6 px-8 py-6 border-b border-white/5 bg-white/2">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#ffffff] shadow-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <div className="text-white font-black font-orbitron text-sm tracking-widest uppercase">{title}</div>
          <div className="text-[#8888aa] text-[9px] font-bold tracking-[3px] uppercase mt-1">{description}</div>
        </div>
      </div>
      <div className="p-8 space-y-8">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[#ffffff] uppercase tracking-[4px] ml-1">{label}</label>
      {children}
      {hint && <p className="text-[#8888aa] text-[10px] font-bold uppercase tracking-[2px] ml-1 opacity-60 italic">{hint}</p>}
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
      className="w-full bg-[#0f0a28]/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-rajdhani font-bold placeholder-slate-700 text-sm focus:outline-none focus:border-[#ffffff]/50 transition-all"
    />
  );
}

function Toggle({ checked, onChange, label, description, onToggleSound }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; onToggleSound?: boolean;
}) {
  const handleToggle = () => {
    onChange(!checked);
    if (onToggleSound) playBeep();
  };

  return (
    <div className="flex items-center justify-between py-6 border-b border-white/5 last:border-0 group/toggle">
      <div>
        <div className="text-white text-sm font-black font-orbitron tracking-tight uppercase group-hover/toggle:text-[#ffffff] transition-colors">{label}</div>
        {description && <div className="text-[#8888aa] text-[10px] font-bold uppercase tracking-widest mt-1">{description}</div>}
      </div>
      <button
        onClick={handleToggle}
        className={`relative w-14 h-8 rounded-full transition-all shrink-0 ml-4 border-2 ${checked ? 'bg-[#ffffff] border-[#ffffff]' : 'bg-white/5 border-white/10'}`}
      >
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all shadow-xl ${checked ? 'translate-x-6 bg-[#030014]' : 'bg-[#8888aa]'}`} />
      </button>
    </div>
  );
}

const PRIORITY_OPTIONS: TicketPriority[] = ['Baja', 'Media', 'Alta', 'Urgente'];
const PRESET_COLORS = ['#ffffff', '#eeeeee', '#dddddd', '#cccccc', '#bbbbbb', '#aaaaaa', '#999999', '#888888'];

export default function SettingsPage() {
  const { currentUser, sbStatus, lastPing, triggerSync, systemLogs, theme, toggleTheme, resetSystem } = useApp();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [audioAlerts, setAudioAlerts] = useState(true);

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[70vh] text-center space-y-8 bg-[#030014]">
        <div className="w-24 h-24 rounded-[32px] bg-gray-600/10 border-2 border-gray-600/30 flex items-center justify-center animate-pulse">
           <svg className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div>
          <h2 className="text-white text-3xl font-black font-orbitron tracking-widest mb-4">ACCESO RESTRINGIDO</h2>
          <p className="text-[#8888aa] text-sm font-bold tracking-[3px] uppercase">Solo administradores de nivel 4 pueden modificar el núcleo del sistema</p>
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
    if (audioAlerts) playBeep();
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm('¿Restaurar todos los valores por defecto del sistema?')) {
      setSettings(DEFAULT_SETTINGS);
      setSaved(false);
    }
  };

  const sections = [
    { id: 'general', label: 'Núcleo Información', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
    { id: 'tickets', label: 'Protocolos Tickets', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg> },
    { id: 'notifications', label: 'Red Alertas', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
    { id: 'appearance', label: 'Matriz Visual', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg> },
    { id: 'supabase', label: 'Estructura DB', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
    { id: 'logs', label: 'Bitácora Núcleo', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg> },
    { id: 'maintenance', label: 'Protocolo Limpieza', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  ];

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-10 min-h-screen bg-[#030014]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-orbitron tracking-tighter mb-2 uppercase">
            ADMIN <span className="text-white">CONTROL</span>
          </h1>
          <p className="text-[#8888aa] text-sm font-rajdhani font-semibold tracking-[4px] uppercase">CONFIGURACIÓN DE NÚCLEO Y PROTOCOLOS</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleReset}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 text-[#8888aa] hover:text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all border border-white/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
            RESTABLECER
          </button>
          <button
            onClick={() => {
              if (confirm('⚠️ ADVERTENCIA CRÍTICA: Se eliminarán todas las credenciales y configuraciones locales. El sistema volverá al estado de instalación inicial. ¿Continuar?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all border border-red-500/30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            REINICIAR_SISTEMA
          </button>
          <button
            onClick={handleSave}
            className={`btn-futuristic flex items-center gap-3 px-8 py-4 text-[10px] font-black uppercase tracking-[3px] transition-all shadow-2xl ${saved ? 'bg-white text-black shadow-white/30' : ''}`}
          >
            {saved ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                SINCRONIZADO
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                SALVAR_CAMBIOS
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Navigation Deck */}
        <aside className="w-full lg:w-72 shrink-0">
          <nav className="flex flex-row lg:flex-col gap-3 p-2 bg-[#0f0a28]/30 rounded-[32px] border border-white/5 backdrop-blur-xl overflow-x-auto lg:overflow-visible no-scrollbar sticky top-10">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  if (audioAlerts) playBeep();
                }}
                className={`flex-1 lg:w-full flex items-center gap-4 px-6 py-5 rounded-[24px] text-[10px] font-black tracking-[3px] transition-all duration-500 uppercase whitespace-nowrap ${
                  activeSection === s.id
                    ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.1)] text-[#030014] scale-[1.02]'
                    : 'text-[#8888aa] hover:text-white hover:bg-white/5'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Console View */}
        <div className="flex-1 space-y-10 animate-fade-in">

          {/* ── GENERAL ── */}
          {activeSection === 'general' && (
            <SectionCard
              title="IDENTIDAD INSTITUCIONAL"
              description="CONFIGURACIÓN DE DATOS DE ORIGEN"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
            >
              <Field label="DESIGNACIÓN DE EMPRESA">
                <TextInput value={settings.companyName} onChange={v => set('companyName', v)} placeholder="Help Desk Tzomp" />
              </Field>
              <Field label="CANAL DE COMUNICACIÓN (EMAIL)">
                <TextInput value={settings.companyEmail} onChange={v => set('companyEmail', v)} placeholder="soporte@tzompantepec.gob.mx" type="email" />
              </Field>
              <Field label="LÍNEA DE ENLACE (TEL)">
                <TextInput value={settings.companyPhone} onChange={v => set('companyPhone', v)} placeholder="+52 (000) 000-0000" />
              </Field>
              <Field label="LOCALIZACIÓN FÍSICA" hint="Esta información se imprimirá en los informes generados">
                <TextInput value={settings.companyAddress} onChange={v => set('companyAddress', v)} placeholder="Ciudad, Estado, País" />
              </Field>
            </SectionCard>
          )}

          {/* ── TICKETS ── */}
          {activeSection === 'tickets' && (
            <SectionCard
              title="PROTOCOLOS DE GESTIÓN"
              description="REGLAS DE PROCESAMIENTO DE OPERACIONES"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>}
            >
              <Field label="PREFIJO DE SERIALIZACIÓN" hint="Máximo 6 carateres. Ej: TZH, SUP, TK">
                <TextInput value={settings.ticketPrefix} onChange={v => set('ticketPrefix', v.toUpperCase().slice(0, 6))} placeholder="TZH" />
              </Field>

              <Field label="PRIORIDAD DE INICIO" hint="Nivel de urgencia por defecto para nuevos clientes">
                <div className="flex gap-4 flex-wrap mt-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        set('defaultPriority', p);
                        if (audioAlerts) playBeep();
                      }}
                      className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[2px] transition-all border ${
                        settings.defaultPriority === p
                          ? 'bg-[#ffffff] text-[#030014] border-[#ffffff] shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                          : 'bg-white/5 text-[#8888aa] border-white/5 hover:border-white/20'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="PURGA AUTOMÁTICA (DÍAS)" hint="Protocolo de cierre automático para unidades resueltas">
                <div className="flex items-center gap-6 bg-[#0f0a28]/50 p-6 rounded-3xl border border-white/5">
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={settings.autoCloseResolvedDays}
                    onChange={e => set('autoCloseResolvedDays', Number(e.target.value))}
                    className="flex-1 accent-[#ffffff]"
                  />
                  <div className="w-20 h-14 flex flex-col items-center justify-center bg-[#030014] border border-[#ffffff]/30 rounded-2xl shadow-inner">
                    <span className="text-[12px] font-black font-orbitron text-[#ffffff]">
                      {settings.autoCloseResolvedDays === 0 ? 'OFF' : `${settings.autoCloseResolvedDays}D`}
                    </span>
                    <span className="text-[7px] font-black text-[#8888aa] uppercase tracking-widest mt-0.5">CYCLE</span>
                  </div>
                </div>
              </Field>

              <div className="pt-4">
                <Toggle
                  checked={settings.allowClientRegistration}
                  onChange={v => set('allowClientRegistration', v)}
                  label="REGISTRO DE CLIENTES OPEN"
                  description="HABILITA EL ACCESO A NUEVOS USUARIOS DESDE LA LANDING"
                  onToggleSound={audioAlerts}
                />
              </div>
            </SectionCard>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeSection === 'notifications' && (
            <SectionCard
              title="INFRAESTRUCTURA ALERTAS"
              description="REGLAS DE COMUNICACIÓN DE RED"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
            >
              <Toggle
                checked={audioAlerts}
                onChange={v => {
                   setAudioAlerts(v);
                   if (v) playBeep();
                }}
                label="ALERTAS SONORAS DE SISTEMA"
                description="ACTIVA PINGS CRÍTICOS PARA EVENTOS DE LA MATRIZ"
              />
              <Toggle
                checked={settings.notifyOnNewTicket}
                onChange={v => set('notifyOnNewTicket', v)}
                label="INYECCIÓN DE NUEVO CLIENTE"
                description="ALERTA A OPERADORES SOBRE NUEVAS SOLICITUDES DE SOPORTE"
                onToggleSound={audioAlerts}
              />
              <Toggle
                checked={settings.notifyOnStatusChange}
                onChange={v => set('notifyOnStatusChange', v)}
                label="CAMBIO DE ESTADO VITAL"
                description="NOTIFICA AL ORIGEN CUANDO EL TICKET CAMBIA SU PRIORIDAD O STATUS"
                onToggleSound={audioAlerts}
              />
              <Toggle
                checked={settings.notifyOnNewMessage}
                onChange={v => set('notifyOnNewMessage', v)}
                label="STREAM DE MENSAJES"
                description="ALERTA SOBRE NUEVAS ENTRADAS EN EL FLUJO DE DISCUSIÓN"
                onToggleSound={audioAlerts}
              />
            </SectionCard>
          )}

          {/* ── APPEARANCE ── */}
          {activeSection === 'appearance' && (
            <SectionCard
              title="MATRIZ VISUAL Y TEMAS"
              description="CONFIGURACIÓN DEL ENTORNO DE TRABAJO"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 2v2"/><path d="M12 20v2"/></svg>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <button
                  onClick={() => { if(theme !== 'light') toggleTheme(); if(audioAlerts) playBeep(); }}
                  className={`p-8 rounded-[32px] border-2 transition-all text-left group ${theme === 'light' ? 'bg-white border-blue-500 shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${theme === 'light' ? 'bg-blue-500 text-white' : 'bg-white/10 text-[#8888aa]'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  </div>
                  <h4 className={`text-sm font-black font-orbitron tracking-widest uppercase mb-1 ${theme === 'light' ? 'text-blue-900' : 'text-white'}`}>MODO DÍA</h4>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-blue-600/70' : 'text-[#8888aa]'}`}>Entorno de alta claridad operacional</p>
                </button>

                <button
                  onClick={() => { if(theme !== 'dark') toggleTheme(); if(audioAlerts) playBeep(); }}
                  className={`p-8 rounded-[32px] border-2 transition-all text-left group ${theme === 'dark' ? 'bg-[#0f0a28]/50 border-white/40 shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-white text-[#030014]' : 'bg-white/10 text-[#8888aa]'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  </div>
                  <h4 className="text-sm font-black font-orbitron tracking-widest uppercase mb-1 text-white">MODO NOCHE</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8888aa]">Interfaz de alta concentración táctica</p>
                </button>
              </div>

              <Field label="CÓDIGO DE COLOR MAESTRO" hint="Color de acento que inundará la infraestructura visual">
                <div className="flex flex-wrap gap-4 mb-6 mt-3">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                         set('primaryColor', c);
                         if (audioAlerts) playBeep();
                      }}
                      className={`w-12 h-12 rounded-2xl transition-all hover:scale-110 border-4 border-transparent shadow-xl ${settings.primaryColor === c ? 'scale-110' : 'opacity-40'}`}
                      style={{
                        backgroundColor: c,
                        borderColor: settings.primaryColor === c ? (theme === 'dark' ? 'white' : '#030014') : 'transparent',
                        boxShadow: settings.primaryColor === c ? `0 0 30px ${c}66` : 'none'
                      }}
                    />
                  ))}
                </div>
              </Field>
            </SectionCard>
          )}

          {/* ── SUPABASE / DB ── */}
          {activeSection === 'supabase' && (
            <SectionCard
              title="MONITOR DE INFRAESTRUCTURA"
              description="ESTADO DE ENLACE CON SUPABASE"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-8 rounded-3xl border transition-all ${sbStatus === 'connected' ? 'bg-white/5 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'bg-white/2 border-white/5 animate-pulse'}`}>
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black uppercase tracking-[4px] text-[#8888aa]">ESTADO_ENLACE</span>
                      <div className={`w-3 h-3 rounded-full ${sbStatus === 'connected' ? 'bg-white shadow-[0_0_15px_white]' : 'bg-gray-600 shadow-[0_0_15px_#666666]'}`} />
                   </div>
                   <div className={`text-2xl font-black font-orbitron tracking-widest uppercase ${sbStatus === 'connected' ? 'text-white' : 'text-gray-400'}`}>
                      {sbStatus === 'connected' ? 'ACTIVO_OK' : 'DISCONNECT'}
                   </div>
                   <div className="text-[10px] font-bold text-[#8888aa] mt-2 uppercase tracking-widest leading-relaxed">
                      {sbStatus === 'connected' ? 'Conexión bidireccional estable con el núcleo de datos.' : 'Error de enlace. Verifique configuración de red y credenciales.'}
                   </div>
                </div>

                <div className="p-8 rounded-3xl border border-white/5 bg-white/2">
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black uppercase tracking-[4px] text-[#8888aa]">ÚLTIMO_PING</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8888aa" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                   </div>
                   <div className="text-2xl font-black font-orbitron tracking-widest text-white">
                      {lastPing ? new Date(lastPing).toLocaleTimeString() : '--:--:--'}
                   </div>
                   <div className="text-[10px] font-bold text-[#8888aa] mt-2 uppercase tracking-widest">
                      LATENCIA_OPTIMIZADA <span className="text-[#ffffff] ml-2">LOW</span>
                   </div>
                </div>
              </div>

               <div className="flex gap-6 flex-wrap pt-4">
                <button
                  onClick={() => {
                    localStorage.removeItem('sb_url');
                    localStorage.removeItem('sb_key');
                    window.location.reload();
                  }}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                  RECONFIGURAR_CORE
                </button>
              </div>

              <div className="bg-[#ffffff]/5 border border-[#ffffff]/10 rounded-[32px] p-8 space-y-4">
                <div className="flex items-center gap-3 text-[#ffffff] text-[10px] font-black uppercase tracking-[4px]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 16V12"/><path d="M12 8h.01"/></svg>
                  CONSEJO DE SEGURIDAD OPERATIVA
                </div>
                <p className="text-[#8888aa] text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  EL SISTEMA REALIZA UNA VERIFICACIÓN DEL LATIDO CADA 20 SEGUNDOS PARA ASEGURAR LA INTEGRIDAD DE LOS DATOS.
                </p>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-10 rounded-[40px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 shadow-2xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <h4 className="text-white font-black font-orbitron tracking-widest text-lg uppercase mb-2">CONTROLADOR DE RED</h4>
                    <p className="text-[#8888aa] text-[10px] font-bold uppercase tracking-[3px]">SINCRONIZACIÓN FORZADA DEL NEXO DE DATOS</p>
                  </div>
                  <button
                    onClick={() => {
                      triggerSync();
                      if (audioAlerts) playBeep();
                    }}
                    className="relative btn-futuristic px-10 py-5 text-[10px] font-black uppercase tracking-[4px] shadow-[0_0_50px_rgba(255,255,255,0.05)] hover:shadow-[0_0_80px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
                  >
                    DISPARAR SINCRONIZACIÓN
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── LOGS ── */}
          {activeSection === 'logs' && (
            <SectionCard
              title="BITÁCORA DEL NÚCLEO"
              description="FLUJO DE EVENTOS Y ERRORES EN TIEMPO REAL"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>}
            >
              <div className="bg-[#030014] rounded-[32px] border border-white/5 overflow-hidden shadow-inner flex flex-col min-h-[500px]">
                <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <span className="text-[9px] font-black text-[#8888aa] uppercase tracking-[3px]">TRANSMISIÓN DE DATOS v4.2</span>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#ffffff] animate-pulse shadow-[0_0_10px_white]" />
                    <span className="text-[9px] font-black text-white uppercase tracking-[2px]">STREAMING</span>
                  </div>
                </div>
                
                <div className="flex-1 p-8 space-y-4 font-mono text-[11px] overflow-y-auto max-h-[600px] no-scrollbar">
                  {systemLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 opacity-20 scale-90 grayscale">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mb-4"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                      <div className="font-black uppercase tracking-[4px]">Esperando_Señal...</div>
                    </div>
                  ) : (
                    systemLogs.map((log, i) => (
                      <div key={i} className={`flex gap-6 animate-slide-in p-3 rounded-xl border border-transparent transition-all hover:bg-white/[0.02] hover:border-white/5`}>
                        <span className="text-[#8888aa] shrink-0 font-bold opacity-60">
                          {new Date(log.t).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}:
                        </span>
                        <span className={`font-bold tracking-tight ${
                          log.type === 'error' ? 'text-red-400' :
                          log.type === 'warn' ? 'text-yellow-400' :
                          log.type === 'success' ? 'text-emerald-400' :
                          'text-white'
                        }`}>
                          {log.type === 'error' ? '[FAILURE_CORE] ' : 
                           log.type === 'warn' ? '[ALERTA_ESTRUCT] ' : 
                           log.type === 'success' ? '[SYNK_SUCCESS] ' : 
                           '[OK_LINK] '}
                          {log.m}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end">
                   <button
                    onClick={() => triggerSync()}
                    className="text-[9px] font-black text-[#8888aa] hover:text-white uppercase tracking-[3px] transition-colors"
                  >
                    LIMPIAR_MEMORIA (SIM)
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── MAINTENANCE ── */}
          {activeSection === 'maintenance' && (
            <SectionCard
              title="PROTOCOLO DE REINICIO TOTAL"
              description="RESTAURACIÓN DEL SISTEMA A ESTADO INICIAL (PUNTO CERO)"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
            >
              <div className="space-y-10">
                <div className="p-8 rounded-[32px] bg-red-500/5 border border-red-500/20 space-y-4">
                   <div className="flex items-center gap-4 text-red-400">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <span className="text-xs font-black font-orbitron tracking-[2px] uppercase">ADVERTENCIA CRÍTICA</span>
                   </div>
                   <p className="text-[#8888aa] text-[11px] font-bold uppercase leading-relaxed tracking-wider">
                     Esta acción eliminará de forma permanente todos los tickets, comentarios y registros actuales del sistema. La configuración volverá a sus valores predeterminados y el núcleo entrará en estado limpio para nuevas operaciones.
                   </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <button
                    onClick={async () => {
                      if (!confirm('¿CONFIRMAR DESTRUCCIÓN TOTAL DE DATOS? Esta acción no se puede deshacer.')) return;
                      if (!confirm('SEGUNDA CONFIRMACIÓN REQUERIDA: ¿Está 100% seguro de reiniciar el sistema?')) return;
                      
                      try {
                        if (isSupabaseConfigured()) {
                          await resetSystem(); 
                        }
                        
                        setSettings(DEFAULT_SETTINGS);
                        saveSettings(DEFAULT_SETTINGS);
                        alert('SISTEMA REINICIADO: El núcleo ha sido limpiado satisfactoriamente.');
                        window.location.reload();
                      } catch (err: any) {
                        alert('FALLO EN EL PROTOCOLO: ' + (err.message || 'Error desconocido'));
                      }
                    }}
                    className="flex-1 px-8 py-5 rounded-[24px] bg-red-600 hover:bg-red-500 text-white text-[10px] font-black font-orbitron tracking-[4px] uppercase transition-all shadow-[0_0_30px_rgba(220,38,38,0.2)] hover:shadow-[0_0_50px_rgba(220,38,38,0.4)] active:scale-95"
                  >
                    EJECUTAR_LIMPIEZA_TOTAL
                  </button>

                  <button
                    onClick={() => handleReset()}
                    className="flex-1 px-8 py-5 rounded-[24px] bg-white/5 hover:bg-white/10 border border-white/10 text-[#8888aa] hover:text-white text-[10px] font-black font-orbitron tracking-[4px] uppercase transition-all"
                  >
                    Solo Resetear Configuración
                  </button>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
