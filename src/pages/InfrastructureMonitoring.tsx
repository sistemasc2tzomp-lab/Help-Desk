import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Monitor, Smartphone, Globe, Shield, Activity, Wifi, WifiOff, Clock } from 'lucide-react';

export default function InfrastructureMonitoring() {
  const { users, userActivity, isOnline, theme } = useApp();

  const stats = useMemo(() => {
    const total = users.length;
    const online = users.filter(u => isOnline(userActivity[u.id])).length;
    return {
      total,
      online,
      offline: total - online,
      percent: total > 0 ? Math.round((online / total) * 100) : 0
    };
  }, [users, userActivity, isOnline]);

  return (
    <div className="p-8 space-y-10 fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter font-orbitron uppercase flex items-center gap-4">
            TERMINAL DE MONITOREO
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
              <div className="w-1 h-1 rounded-full bg-cyan-400" />
            </div>
          </h2>
          <p className="text-zinc-500 font-medium mt-1 uppercase text-xs tracking-[3px]">Seguimiento táctico de infraestructura y presencia de red en tiempo real.</p>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Estado_Global</span>
              <span className="text-xs font-bold text-white uppercase tracking-tight">SISTEMA_ESTABLE</span>
           </div>
           <Activity className="text-cyan-400 animate-pulse" size={24} />
        </div>
      </div>

      {/* Connection Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-[2.5rem] border-white/5 bg-white/2 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Wifi size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Nodos_Activos</span>
          </div>
          <div className="text-4xl font-black text-white font-orbitron">{stats.online}</div>
        </div>
        <div className="glass-panel p-6 rounded-[2.5rem] border-white/5 bg-white/2 space-y-3">
          <div className="flex items-center gap-2 text-zinc-500">
            <WifiOff size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Nodos_Offline</span>
          </div>
          <div className="text-4xl font-black text-white font-orbitron text-zinc-600">{stats.offline}</div>
        </div>
        <div className="md:col-span-2 glass-panel p-6 rounded-[2.5rem] border-white/5 bg-white/2 flex items-center justify-between">
           <div className="space-y-1">
             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Disponibilidad_Red</span>
             <div className="text-4xl font-black text-white font-orbitron">{stats.percent}%</div>
           </div>
           <div className="w-48 h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 shadow-[0_0_15px_#06b6d4]" style={{ width: `${stats.percent}%` }} />
           </div>
        </div>
      </div>

      {/* Main Monitoring Terminal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map(user => {
          const online = isOnline(userActivity[user.id]);
          return (
            <div key={user.id} className={`glass-panel rounded-[2rem] border-white/5 p-6 transition-all duration-500 group relative overflow-hidden ${online ? 'bg-cyan-500/5' : 'bg-white/2 opacity-60'}`}>
              {/* Background Status Pulse */}
              {online && <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] -mr-16 -mt-16 animate-pulse" />}
              
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${online ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-zinc-600'}`}>
                   <Monitor size={22} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-2 ${online ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-zinc-800 text-zinc-500 border border-white/5'}`}>
                   <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} />
                   {online ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-tight truncate">{user.name}</h3>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{user.role}</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <Globe size={12} className="text-zinc-600" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">IP_PÚBLICA</span>
                    <span className="text-[10px] font-mono text-white/50 ml-auto">{online ? '192.168.' + Math.floor(Math.random()*255) : '---.---.---.---'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Smartphone size={12} className="text-zinc-600" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">DISPOSITIVO</span>
                    <span className="text-[10px] font-mono text-white/50 ml-auto uppercase">{online ? 'PC_Workstation' : 'N/D'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield size={12} className="text-zinc-600" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">SISTEMA</span>
                    <span className="text-[10px] font-mono text-cyan-500/80 ml-auto font-black italic">{online ? 'NEXO_V1.1' : '---'}</span>
                  </div>
                </div>
                
                {online && (
                  <div className="pt-4 flex items-center gap-2 border-t border-white/5">
                     <Clock size={10} className="text-cyan-500" />
                     <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">Sesión_Activa</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
