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
      if (err) {
        setError(err);
        setLoading(false);
      }
      // Note: If successful, the App.tsx will switch to Dashboard
    } catch (e: any) {
      setError(e.message || 'Error inesperado en el terminal');
      setLoading(false);
    } finally {
      // Small delay to ensure we don't snap back too fast if redirected
      setTimeout(() => setLoading(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014] px-4 py-10 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00f0ff]/5 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#7b2fff]/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* Logo & Title */}
      <div className="flex flex-col items-center mb-8 relative z-10">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#00f0ff] to-[#7b2fff] p-[2px] mb-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] transform hover:scale-110 transition-all duration-500">
          <div className="w-full h-full bg-[#030014] rounded-[inherit] flex items-center justify-center overflow-hidden">
            <img src="img/logo_tzompantepec.png" alt="Tzomp Logo" className="w-16 h-16 object-contain" />
          </div>
        </div>
        <h1 className="text-white text-4xl sm:text-5xl font-black tracking-tighter text-center font-orbitron">
           SOPORTE <span className="text-[#00f0ff]">TÉCNICO</span>
        </h1>
        <p className="text-[#8888aa] text-[10px] mt-4 font-rajdhani font-black tracking-[6px] uppercase border-y border-white/5 py-2">Dto. Sistemas C2 Tzompantepec</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm glass-panel rounded-[40px] p-10 shadow-2xl relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f0ff]/50 to-transparent" />
        
        <h2 className="text-white text-3xl font-black mb-2 font-orbitron tracking-tight">ACCESO</h2>
        <p className="text-[#8888aa] text-xs mb-10 font-rajdhani font-bold tracking-wider">Identifícate en la red central TZOMP</p>

        <form onSubmit={handleLogin} className="space-y-8">
          {/* Email */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-[#00f0ff] uppercase tracking-[4px] ml-1 opacity-70">
              EMAIL DE ACCESO
            </label>
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="usuario@tzompantepec.gob.mx"
                autoComplete="email"
                className="w-full bg-[#0f0a28]/60 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]/50 transition-all duration-300 font-mono"
              />
              <div className="absolute inset-0 rounded-2xl bg-[#00f0ff]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-[#00f0ff] uppercase tracking-[4px] ml-1 opacity-70">
              CLAVE DE ENCRIPTACIÓN
            </label>
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[#0f0a28]/60 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]/50 transition-all duration-300 font-mono pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-[#00f0ff]/30 hover:text-[#00f0ff] transition-all p-2 bg-white/5 rounded-xl border border-white/5 hover:border-[#00f0ff]/30"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-4 bg-red-500/5 border border-red-500/20 rounded-2xl px-5 py-4 animate-shake">
              <svg className="text-red-400 shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-futuristic py-6 text-xs tracking-[5px] font-black group shadow-[0_20px_50px_rgba(0,240,255,0.2)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-4">
                <div className="w-5 h-5 border-3 border-[#030014]/30 border-t-[#030014] rounded-full animate-spin" />
                SINCRONIZANDO...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                ACCEDER AL TERMINAL
                <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center relative z-10 flex flex-col items-center gap-6">
        {/* Security notice and terminal status */}
        
        {/* Security notice */}
        <div className="px-6 py-2 bg-white/5 rounded-full border border-white/5 text-[9px] text-white/30 font-mono tracking-widest uppercase">
          SECURE_PROTOCOL: TLS_1.3 | AES_256_GCM | NODE: {Math.random().toString(16).slice(2, 10).toUpperCase()}
        </div>
      </div>
    </div>
  );
}
