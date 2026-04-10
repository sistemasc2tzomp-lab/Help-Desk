import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AppSettings } from '../types';
import { 
  Home, FileText, Bell, Palette, Database, ClipboardList, 
  Trash2, RotateCcw, Save, ShieldAlert, Zap, Moon, Sun, CheckCircle,
  Shield, Activity, RefreshCw, Cpu, Volume2, Database as DbIcon,
  Search, Server, Terminal, Lock
} from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Departamento de Sistemas C2 Tzompantepec',
  companyEmail: 'sistemasc5itlax@gmail.com',
  companyPhone: '2461754065',
  companyAddress: 'Av. Zaragoza no. 1, San Salvador Tzompantepec Col. Centro C.P. 90490',
  primaryColor: '#5A2D82',
  ticketPrefix: 'TZH',
  allowClientRegistration: true,
  notifyOnNewTicket: true,
  notifyOnStatusChange: true,
  notifyOnNewMessage: true,
  maxAttachmentMB: 10,
  defaultPriority: 'Baja',
  autoCloseResolvedDays: 5,
  theme: 'dark',
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

export default function SettingsPage() {
  const { currentUser, pbStatus, resetSystem, triggerSync, systemLogs, theme, toggleTheme } = useApp();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [selectedTone, setSelectedTone] = useState('Alarma_N4');

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[70vh] text-center space-y-8">
        <ShieldAlert className="w-20 h-20 text-red-500 animate-pulse" />
        <h2 className="text-white text-3xl font-black font-orbitron tracking-widest uppercase mb-4">ACCESO BLOQUEADO</h2>
      </div>
    );
  }

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-5xl font-black text-white font-orbitron tracking-tighter uppercase mb-2">ADMIN <span className="text-[#00AEEF]">CONTROL</span></h1>
          <p className="text-zinc-500 text-[10px] font-black tracking-[5px] uppercase">CONFIGURACIÓN INSTITUCIONAL — DEPARTAMENTO DE SISTEMAS C2</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => resetSystem()} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-4 rounded-2xl flex items-center gap-2 text-[9px] font-black uppercase tracking-[3px] border border-red-500/20 transition-all active:scale-95">
              <Trash2 size={14} /> REINICIAR_SISTEMA
           </button>
           <button onClick={handleSave} className={`px-8 py-4 rounded-2xl flex items-center gap-4 text-[9px] font-black uppercase tracking-[4px] shadow-2xl transition-all active:scale-95 ${saved ? 'bg-emerald-600' : 'bg-[#5A2D82]'} text-white`}>
              {saved ? <CheckCircle size={16} /> : <Save size={16} />}
              {saved ? 'DATOS_SALVADOS' : 'SALVAR_CAMBIOS'}
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-80 shrink-0">
           <nav className="glass-panel border-white/5 p-4 rounded-[2.5rem] space-y-2">
              {[
                { id: 'general', label: 'NÚCLEO INFORMACIÓN', icon: Home },
                { id: 'tickets', label: 'PROTOCOLOS TICKETS', icon: FileText },
                { id: 'notifications', label: 'RED ALERTAS', icon: Bell },
                { id: 'appearance', label: 'MATRIZ VISUAL', icon: Palette },
                { id: 'database', label: 'ESTRUCTURA DB', icon: Database },
                { id: 'logs', label: 'BITÁCORA NÚCLEO', icon: ClipboardList },
                { id: 'maintenance', label: 'OPTIMIZACIÓN', icon: Zap },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] text-[10px] font-black tracking-[2.5px] uppercase transition-all ${
                    activeSection === s.id ? 'bg-[#5A2D82] text-white shadow-xl' : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <s.icon size={18} className={activeSection === s.id ? 'text-[#00AEEF]' : ''} />
                  {s.label}
                </button>
              ))}
           </nav>
        </aside>

        <main className="flex-1 space-y-8 animate-fade-in">
           {activeSection === 'general' && (
              <div className="glass-panel border-white/5 p-10 rounded-[3rem] grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Institución</label>
                    <input type="text" value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Contacto Enlace</label>
                    <input type="text" value={settings.companyEmail} onChange={e => setSettings({...settings, companyEmail: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" />
                 </div>
                 <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Dirección Oficial</label>
                    <textarea value={settings.companyAddress} onChange={e => setSettings({...settings, companyAddress: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold h-24 resize-none" />
                 </div>
              </div>
           )}

           {activeSection === 'notifications' && (
              <div className="glass-panel border-white/5 p-10 rounded-[3rem] space-y-10">
                 <h3 className="text-xl font-black text-white font-orbitron tracking-widest uppercase flex items-center gap-3">
                    <Volume2 className="text-[#00AEEF]" /> SELECTOR DE TONOS DE ALERTA
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['Alarma_N4', 'Sirena_Tec', 'Pulso_Binario', 'Notificación_Estándar'].map(tone => (
                       <button 
                        key={tone}
                        onClick={() => setSelectedTone(tone)}
                        className={`p-6 rounded-[2rem] border transition-all text-left flex items-center justify-between group ${selectedTone === tone ? 'bg-[#5A2D82] border-[#00AEEF]' : 'bg-white/2 border-white/5 hover:bg-white/5'}`}
                       >
                          <div>
                             <h4 className="text-white font-black text-[10px] uppercase tracking-widest">{tone.replace('_', ' ')}</h4>
                             <p className="text-zinc-500 text-[8px] font-bold uppercase mt-1">Sinfonía C2 - Activa</p>
                          </div>
                          <Zap size={16} className={selectedTone === tone ? 'text-[#00AEEF]' : 'text-zinc-800'} />
                       </button>
                    ))}
                 </div>
              </div>
           )}

           {activeSection === 'database' && (
              <div className="glass-panel border-white/5 p-10 rounded-[3rem] space-y-8">
                 <h3 className="text-xl font-black text-white font-orbitron tracking-widest uppercase flex items-center gap-3">
                    <DbIcon className="text-[#00AEEF]" /> ESTRUCTURA DE BASE DE DATOS
                 </h3>
                 <div className="space-y-4">
                    {[
                       { name: 'tickets', records: '142', status: 'Sincronizado', size: '1.2 MB' },
                       { name: 'usuarios', records: '28', status: 'Protegido', size: '450 KB' },
                       { name: 'departamentos', records: '12', status: 'Institucional', size: '12 KB' },
                       { name: 'bitacora', records: '1,200', status: 'Activa', size: '4.8 MB' },
                    ].map(col => (
                       <div key={col.name} className="flex items-center justify-between p-6 rounded-2xl bg-white/2 border border-white/5 group hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-4">
                             <Server size={18} className="text-zinc-600 group-hover:text-[#00AEEF]" />
                             <div>
                                <h4 className="text-white font-black text-[10px] uppercase tracking-widest">{col.name}</h4>
                                <p className="text-zinc-500 text-[8px] font-bold uppercase">{col.records} registros · {col.size}</p>
                             </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-tighter">{col.status}</span>
                       </div>
                    ))}
                 </div>
              </div>
           )}

           {activeSection === 'logs' && (
              <div className="glass-panel border-white/5 rounded-[3rem] overflow-hidden bg-black/40">
                 <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <h3 className="text-sm font-black text-white font-orbitron uppercase tracking-widest flex items-center gap-3">
                       <Terminal className="text-[#00AEEF]" size={18} /> BITÁCORA DE NÚCLEO (SYS_LOG)
                    </h3>
                    <div className="flex gap-2">
                       <div className="w-3 h-3 rounded-full bg-red-500/20" />
                       <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                       <div className="w-3 h-3 rounded-full bg-green-500/20" />
                    </div>
                 </div>
                 <div className="p-8 h-96 overflow-y-auto font-mono text-[10px] space-y-2">
                    {systemLogs.length > 0 ? systemLogs.map((log, i) => (
                       <div key={i} className="flex gap-4 border-l-2 border-[#5A2D82] pl-3 py-1 hover:bg-white/5 transition-colors">
                          <span className="text-[#00AEEF] shrink-0">[{new Date().toLocaleTimeString()}]</span>
                          <span className="text-zinc-500 shrink-0 font-bold uppercase">[SYS_CORE]</span>
                          <span className="text-zinc-300">{log}</span>
                       </div>
                    )) : (
                       <div className="text-zinc-500 italic uppercase tracking-[4px] text-center mt-20">No hay registros recientes detectados.</div>
                    )}
                 </div>
              </div>
           )}

           {activeSection === 'maintenance' && (
              <div className="glass-panel border-white/5 p-10 rounded-[3rem] text-center space-y-10 py-20">
                 <div className="w-20 h-20 bg-[#00AEEF]/10 text-[#00AEEF] rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-[#00AEEF]/20">
                    <Zap size={40} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-white font-orbitron tracking-widest uppercase">MOTOR DE OPTIMIZACIÓN</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-[3px] mt-4">Asegurando la integridad estructural del DTO. Sistemas C2</p>
                 </div>
                 <div className="flex justify-center gap-4">
                    <button onClick={() => triggerSync()} className="bg-white/5 hover:bg-white/10 text-white px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[4px] border border-white/10 transition-all active:scale-95">REVALIDAR_SISTEMA</button>
                    <button onClick={() => alert('Caché purgada.')} className="bg-[#5A2D82] hover:bg-[#7b46a8] text-white px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[4px] shadow-2xl transition-all active:scale-95">FORZAR_DEPURACIÓN</button>
                 </div>
              </div>
           )}

           {activeSection === 'appearance' && (
              <div className="glass-panel border-white/5 p-10 rounded-[3rem] space-y-10 text-center py-20">
                 <Palette size={48} className="text-[#00AEEF] mx-auto opacity-30" />
                 <h3 className="text-xl font-black text-white font-orbitron tracking-widest uppercase">PERSONALIZACIÓN VISUAL</h3>
                 <button onClick={toggleTheme} className="bg-white/5 border border-white/10 px-10 py-5 rounded-2xl text-white font-black text-[10px] uppercase tracking-[4px] hover:bg-white/10">
                    {theme === 'dark' ? 'ALTERNAR_MODO_CLARO' : 'ALTERNAR_MODO_NOCTURNO'}
                 </button>
              </div>
           )}
        </main>
      </div>
    </div>
  );
}
