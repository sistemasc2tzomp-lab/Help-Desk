import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { loginWithSupabase } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const err = await loginWithSupabase(email.trim(), password);
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeConfig = () => {
    localStorage.removeItem('sb_url');
    localStorage.removeItem('sb_key');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014] px-4 py-10 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* Logo & Title */}
      <div className="flex flex-col items-center mb-8 relative z-10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#7b2fff] flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(0,240,255,0.3)] transform hover:rotate-6 transition-transform duration-500">
          <img src="img/logo_tzompantepec.png" alt="Tzomp Logo" className="w-14 h-14 rounded-full object-contain" />
        </div>
        <h1 className="text-white text-3xl sm:text-4xl font-extrabold tracking-tight text-center font-orbitron">
           HELP <span className="text-gradient">DESK</span>
        </h1>
        <p className="text-[#00f0ff] text-sm mt-2 font-rajdhani font-semibold tracking-widest uppercase">Tzompantepec Sistemas & IA</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm glass-panel rounded-3xl p-8 shadow-2xl border border-white/10 relative z-10">
        <h2 className="text-white text-2xl font-bold mb-1 font-orbitron">ACCESO</h2>
        <p className="text-[#8888aa] text-sm mb-8 font-rajdhani">Identifícate en la red central TZOMP</p>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-[#00f0ff] uppercase tracking-[3px] ml-1">
              EMAIL DE ACCESO
            </label>
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="agente@tzomp.lab"
                autoComplete="email"
                className="w-full bg-[#0a0025]/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all duration-300 neon-border"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00f0ff]/10 to-[#7b2fff]/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-[#00f0ff] uppercase tracking-[3px] ml-1">
              CLAVE DE ENCRIPTACIÓN
            </label>
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[#0a0025]/50 border border-white/10 rounded-xl px-4 py-4 pr-12 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all duration-300 neon-border"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00f0ff]/50 hover:text-[#00f0ff] transition p-1"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-shake">
              <svg className="text-red-400 shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="text-red-400 text-xs font-semibold">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-futuristic py-4 text-sm tracking-[2px] font-bold group"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                CONECTANDO...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                DESBLOQUEAR SISTEMA
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-10 text-center relative z-10">
        <button
          onClick={handleChangeConfig}
          className="text-[#8888aa] hover:text-[#00f0ff] text-[10px] font-bold tracking-[2px] transition-all uppercase underline underline-offset-4 decoration-[#00f0ff]/30"
        >
          CONFIGURACIÓN DE NÚCLEO
        </button>
      </div>
      
      {/* Security notice */}
      <div className="absolute bottom-4 text-[10px] text-white/20 font-mono tracking-tighter">
        SESSION_ENCRYPTION: AES-256-GCM | TERMINAL ID: {Math.random().toString(16).slice(2, 10).toUpperCase()}
      </div>
    </div>
  );
}
