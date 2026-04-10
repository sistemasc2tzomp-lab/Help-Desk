import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { pb, isPocketBaseOnline } from '../lib/pocketbase';
import { User, Ticket, Department, TicketStatus, TicketPriority, Message } from '../types';

// ── Sound Notification System ─────────────────────────────────────
// Shared AudioContext — se crea SOLO tras la primera interacción del usuario
let _sharedAudioCtx: AudioContext | null = null;
let _userInteracted = false;

// Registrar que el usuario ha interactuado (política autoplay del navegador)
if (typeof window !== 'undefined') {
  const activateAudio = () => {
    _userInteracted = true;
    // NO crear AudioContext aquí — se creará cuando se necesite en playNotificationSound
    document.removeEventListener('click', activateAudio);
    document.removeEventListener('keydown', activateAudio);
    document.removeEventListener('touchstart', activateAudio);
  };
  document.addEventListener('click', activateAudio, { once: true });
  document.addEventListener('keydown', activateAudio, { once: true });
  document.addEventListener('touchstart', activateAudio, { once: true });
}


function playNotificationSound(type: 'new_ticket' | 'update') {
  if (!_userInteracted) return; // Esperar interacción del usuario
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    // Crear el contexto LAZILY — solo cuando realmente se necesita y ya hubo interacción
    if (!_sharedAudioCtx) {
      _sharedAudioCtx = new AudioContextClass();
    }
    const ctx = _sharedAudioCtx;
    
    // Resume si está suspendido
    const playSound = () => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'new_ticket') {
        // ALERTA TÉCNICA URGENTE - Tono más alto e imperativo
        const now = ctx.currentTime;
        oscillator.type = 'square'; // Sonido más agresivo y profesional
        oscillator.frequency.setValueAtTime(880, now);   // La5
        oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.1); // Mi6
        oscillator.frequency.setValueAtTime(880, now + 0.15);
        oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.25);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        oscillator.start(now);
        oscillator.stop(now + 0.4);
      } else {
        // PULSO DE NOTIFICACIÓN RÁPIDA
        const now = ctx.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, now);
        oscillator.frequency.linearRampToValueAtTime(440, now + 0.2);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      }
    };


    if (ctx.state === 'suspended') {
      ctx.resume().then(playSound).catch(e => console.warn('Audio resume failed:', e));
    } else {
      playSound();
    }
  } catch (e) {
    console.warn('Audio notification failed:', e);
  }
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  tickets: Ticket[];
  users: User[];
  departments: Department[];
  loading: boolean;
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'createdByName' | 'assignedToName'>, file?: File) => Promise<Ticket>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  updateTicketPriority: (ticketId: string, priority: TicketPriority) => Promise<void>;
  assignTicket: (ticketId: string, userId: string) => Promise<void>;
  autoAssignAdminOnOpen: (ticketId: string) => Promise<void>;
  addMessage: (ticketId: string, content: string, isInternal?: boolean, file?: File, tipo?: Message['tipo']) => Promise<void>;
  getTicketById: (id: string) => Ticket | undefined;
  addDepartment: (dept: Omit<Department, 'id' | 'createdAt'>) => Promise<void>;
  updateDepartment: (id: string, dept: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  refreshData: (silent?: boolean) => Promise<void>;
  offlineTickets: any[];
  syncOfflineTickets: () => Promise<void>;
  page: string;
  setPage: (page: string) => void;
  selectedTicketId: string | null;
  setSelectedTicketId: (id: string | null) => void;
  pbStatus: 'connected' | 'disconnected' | 'checking';
  lastPing: string | null;
  loginWithPocketBase: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  createUser: (data: { name: string; email: string; role: User['role']; departmentId?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  triggerSync: () => Promise<void>;
  systemLogs: {t: number, m: string, type: 'info'|'warn'|'error'|'success' | 'warning'}[];
  addLog: (message: string, type?: 'info'|'warn'|'error'|'success' | 'warning') => void;
  userActivity: Record<string, string>;
  isOnline: (updatedStr?: string) => boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  resetSystem: () => Promise<void>;
  perfiles: any[];
  isOnline: (updatedStr?: string) => boolean; // Mantener helper
}

const AppContext = createContext<AppContextType | null>(null);

// ── DB value mappers ────────────────────────
// PocketBase simplifica el manejo de tipos y colecciones.
// Se mantienen vacíos o se eliminan si no se usan más.

// normalizeFromDb: convierte valor de BD a formato de la app
function normalizeStatus(raw: string): string {
  const map: Record<string, string> = {
    'abierto': 'Abierto', 'Abierto': 'Abierto',
    'en_progreso': 'En Progreso', 'en progreso': 'En Progreso', 'En Progreso': 'En Progreso',
    'resuelto': 'Resuelto', 'Resuelto': 'Resuelto',
    'cerrado': 'Cerrado', 'Cerrado': 'Cerrado',
  };
  return map[raw] ?? raw;
}

function normalizePriority(raw: string): string {
  const map: Record<string, string> = {
    'urgente': 'Urgente', 'Urgente': 'Urgente',
    'alta': 'Alta', 'Alta': 'Alta',
    'media': 'Media', 'Media': 'Media',
    'baja': 'Baja', 'Baja': 'Baja',
  };
  return map[raw] ?? raw;
}

// ── helpers ──────────────────────────────────────────────────────────────
const isOnline = (updatedStr?: string) => {
  if (!updatedStr) return false;
  const last = new Date(updatedStr).getTime();
  const now = new Date().getTime();
  return (now - last) < 600000; // 10 minutos de tolerancia para "Online"
};

function getInitials(name: string | undefined | null) {
  if (!name || typeof name !== 'string') return '?';
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
}

const COLORS = ['#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#0891B2'];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function generateId(length = 15) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

// Normalize role regardless of case or spelling
function normalizeRole(raw: unknown): User['role'] {
  const r = String(raw || '').toLowerCase().trim();
  if (r === 'admin' || r === 'administrador') return 'Admin';
  if (r === 'agente' || r === 'agent') return 'Agente';
  return 'Cliente';
}

// ── DB row → app types ───────────────────────────────────────────────────────
// Maps tabla "users": id, name, email, avatar, rol, departamento_id, activo, created, updated
function rowToUser(r: Record<string, unknown>): User {
  const name = String(r.name || r.nombre || r.full_name || r.email || 'Usuario');
  const roleRaw = r.rol || r.role || 'Cliente';
  return {
    id: String(r.id),
    name,
    initials: getInitials(name),
    email: String(r.email || ''),
    role: normalizeRole(roleRaw),
    avatarColor: colorFor(String(r.id)),
    departmentId: r.departamento_id ? String(r.departamento_id) : undefined,
  };
}

// Maps tabla "ticket_comentarios": id, ticket_id, autor_id, mensaje, es_interno, created
function rowToMessage(r: any, usersMap: Record<string, User> = {}): Message {
  const userId = String(r.usuario_id || '');
  const author = usersMap[userId];
  
  const authorName = author ? (author.role === 'Admin' ? author.email : author.name) : 'Usuario';
  const authorRole = author ? author.role : 'Cliente';
  
  const content = String(r.mensaje || '');
  const timestamp = String(r.created || new Date().toISOString());

  const adjuntosLocal: string[] = [];
  // Verificación extra segura para el campo adjuntos que parece faltar en el esquema
  if (r.adjuntos) {
    try {
      const files = Array.isArray(r.adjuntos) ? r.adjuntos : [r.adjuntos];
      files.forEach((fname: string) => {
        if (fname && typeof fname === 'string') {
          adjuntosLocal.push(pb.files.getURL(r, fname));
        }
      });
    } catch (e) {
      console.warn("Fallo al procesar adjuntos:", e);
    }
  }

  return {
    id: String(r.id),
    ticketId: String(r.ticket_id || ''),
    authorId: userId,
    authorName,
    authorInitials: getInitials(authorName),
    authorColor: author?.avatarColor || colorFor(userId),
    authorRole,
    content,
    timestamp,
    isInternal: Boolean(r.es_interno),
    imageUrl: adjuntosLocal[0] || undefined,
    adjuntos: adjuntosLocal,
    tipo: (r.tipo as any) || 'Mensaje'
  };
}

// Maps tabla "tickets": id, titulo, descripcion, estado, prioridad, departamento_id, creado_por_id...
function rowToTicket(r: Record<string, any>, msgs: Message[] = [], usersMap: Record<string, User> = {}): Ticket {
  const creatorId = String(r.cliente_id || '');
  // Intentar mapear el agente desde múltiples nombres posibles para mayor compatibilidad
  const assigneeId = r.agente_id ? String(r.agente_id) : (r.asignado_a ? String(r.asignado_a) : undefined);
  
  const creator = usersMap[creatorId];
  const assignee = assigneeId ? usersMap[assigneeId] : undefined;

  const status = normalizeStatus(String(r.estado || 'Abierto'));
  const priority = normalizePriority(String(r.prioridad || 'Media'));

  return {
    id: String(r.id),
    folio: r.folio ? Number(r.folio) : undefined,
    title: String(r.titulo || 'Sin Título'),
    description: String(r.descripcion || ''),
    status: (status.charAt(0).toUpperCase() + status.slice(1)) as TicketStatus,
    priority: (priority.charAt(0).toUpperCase() + priority.slice(1)) as TicketPriority,
    category: String(r.categoria || 'General') as any,
    departmentId: r.departamento_id ? String(r.departamento_id) : undefined,
    createdById: creatorId,
    createdByName: creator ? (creator.name || creator.email) : 'Solicitante',
    assignedToId: assigneeId || null,
    assignedToName: assignee ? (assignee.name || assignee.email) : 'En espera',
    createdAt: String(r.created || new Date().toISOString()),
    updatedAt: String(r.updated || new Date().toISOString()),
    messages: msgs,
    imageUrl: (r.adjuntos) ? (Array.isArray(r.adjuntos) && r.adjuntos[0] ? pb.files.getURL(r as any, r.adjuntos[0]) : undefined) : undefined,
  };
}

// Maps tabla "departamentos": id, nombre, background_color, text_color, icon, descripcion, created
function rowToDept(r: Record<string, unknown>): Department {
  return {
    id: String(r.id),
    name: String(r.nombre || ''),
    description: String(r.descripcion || ''),
    color: String(r.color || r.background_color || '#7C3AED'),
    createdAt: String(r.created || new Date().toISOString()),
    jefe: r.jefe ? String(r.jefe) : undefined,
  };
}

// ── Provider ─────────────────────────────────────────────────────────────────
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<string>('login');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [pbStatus, setPbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [isNetworkOnline, setIsNetworkOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineTickets, setOfflineTickets] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('helpdesk_offline_tickets');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [systemLogs, setSystemLogs] = useState<{t: number, m: string, type: 'info'|'warn'|'error'|'success'}[]>([]);
  const [userActivity, setUserActivity] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-theme');
      return (saved as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('app-theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const addLog = useCallback((message: string, type: 'info'|'warn'|'error'|'success'|'warning' = 'info') => {
    const logType = type === 'warning' ? 'warn' : type;
    setSystemLogs(prev => [{ t: Date.now(), m: message, type: logType as any }, ...prev].slice(0, 100));
  }, []);

  // Update online presence
  useEffect(() => {
    if (!currentUser) return;
    const updatePresence = async () => {
      try {
        await pb.collection('users').update(currentUser.id, { activo: true });
      } catch { /* Presence update no es crítico */ }
    };

    updatePresence();
    const id = setInterval(updatePresence, 300000); // 5 min
    return () => clearInterval(id);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('helpdesk_offline_tickets', JSON.stringify(offlineTickets));
  }, [offlineTickets]);

  const checkPB = useCallback(async () => {
    const online = await isPocketBaseOnline();
    setPbStatus(online ? 'connected' : 'disconnected');
    if (online) setLastPing(new Date().toISOString());
  }, []);

  useEffect(() => {
    checkPB();
    const interval = setInterval(checkPB, 30000);
    return () => clearInterval(interval);
  }, [checkPB]);

  useEffect(() => {
    const handleOnline = () => {
      console.log("CONEXIÓN_RESTABLECIDA: Sincronizando datos...");
      setIsNetworkOnline(true);
      checkPB();
    };
    const handleOffline = () => {
      console.log("MODO_DESCONECTADO_ACTIVO.");
      setIsNetworkOnline(false);
      setPbStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkPB]);

  // Persistir tickets offline
  useEffect(() => {
    localStorage.setItem('offline_tickets', JSON.stringify(offlineTickets));
  }, [offlineTickets]);



  // ── fetch all data ──────────────────────────────────────────────────────
  const refreshData = useCallback(async (silent = false) => {
    if (!pb.authStore.isValid) return;
    if (!silent) setLoading(true);
    try {
      // 1. Usuarios
      const usersList = await pb.collection('users').getFullList();
      const freshUsers = usersList.map(rowToUser);
      setUsers(prev => JSON.stringify(prev) === JSON.stringify(freshUsers) ? prev : freshUsers);

      const freshUMap: Record<string, User> = {};
      const activityMap: Record<string, string> = {};
      freshUsers.forEach(u => { freshUMap[u.id] = u; });
      usersList.forEach(r => { if (r.updated) activityMap[r.id] = String(r.updated); });
      setUserActivity(prev => JSON.stringify(prev) === JSON.stringify(activityMap) ? prev : activityMap);

      // 2. Departamentos
      try {
        const deptsList = await pb.collection('departamentos').getFullList();
        const freshDepts = deptsList.map(rowToDept);
        setDepartments(prev => JSON.stringify(prev) === JSON.stringify(freshDepts) ? prev : freshDepts);
      } catch (e: any) {
        if (!e.isAbort) console.warn('Departamentos fetch failed:', e.message);
      }

      // 3. Tickets
      let finalTickets: Ticket[] = [];
      try {
        const ticketsList = await pb.collection('tickets').getFullList();
        const msgsByTicket: Record<string, Message[]> = {};
        
        try {
          const comentariosList = await pb.collection('ticket_comentarios').getFullList();
          comentariosList.forEach(r => {
            try {
              const m = rowToMessage(r as any, freshUMap);
              if (!msgsByTicket[m.ticketId]) msgsByTicket[m.ticketId] = [];
              msgsByTicket[m.ticketId].push(m);
            } catch (innerErr) {
              console.warn('Fallo al procesar comentario individual:', innerErr);
            }
          });
        } catch (commentErr: any) {
          if (!commentErr.isAbort) console.warn('ticket_comentarios load failed:', commentErr?.message);
        }

        finalTickets = ticketsList.map(r => rowToTicket(r as any, msgsByTicket[String(r.id)] || [], freshUMap));
      } catch (ticketErr: any) {
        if (!ticketErr.isAbort) console.error('Error cargando tickets:', ticketErr);
      }

      setTickets(prev => JSON.stringify(prev) === JSON.stringify(finalTickets) ? prev : finalTickets);
      setPbStatus('connected');
    } catch (err: any) {
      if (err?.isAbort) return; // Silenciar autocancelaciones de PocketBase
      
      console.error('Nexo Database Error:', err);
      if (err.data) console.error('Error data:', err.data);
      
      const msg = err?.status === 0 ? 'Servidor no responde (ERR_CONNECTION_REFUSED).' : 
                   err?.status === 400 ? `Error 400 (Bad Request): Revisa la consola para detalles. [${err?.url}]` : err.message;
      addLog(`Fallo de conexión: ${msg}`, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [addLog]);

  const triggerSync = useCallback(async () => {
    addLog('Sincronización manual iniciada...', 'info');
    await refreshData();
    addLog('Sincronización manual completada con éxito.', 'info');
  }, [refreshData, addLog]);

  // ── auth ─────────────────────────────────────────────────────────────────
  const loginWithPocketBase = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      if (authData.record) {
        setCurrentUser(rowToUser(authData.record as any));
        await refreshData();
        setPage('dashboard');
        return null;
      }
      return 'Credenciales inválidas';
    } catch (err: any) {
      console.error('Login error:', err);
      return err.message || 'Error al iniciar sesión';
    }
  }, [refreshData]);

  const logout = useCallback(async () => {
    pb.authStore.clear();
    setCurrentUser(null);
    setTickets([]);
    setUsers([]);
    setDepartments([]);
    setPage('login');
  }, []);

  // ── Presence Heartbeat & Auto-Logout ─────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    
    // 1. Heartbeat con Metadatos Detallados
    const sendPulse = async () => {
      try {
        let publicIp = 'Detectando...';
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          publicIp = data.ip;
        } catch(e) {}

        const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Móvil' : 
                           /Tablet|iPad/i.test(navigator.userAgent) ? 'Tablet' : 'PC/Laptop';

        await pb.collection('users').update(currentUser.id, { 
          updated: new Date().toISOString(),
          metadata: {
            ip: publicIp,
            dispositivo: deviceType,
            navegador: navigator.appName,
            plataforma: navigator.platform,
            userAgent: navigator.userAgent
          }
        });
      } catch (e) { /* silent pulse */ }
    };

    // 2. Temporizador de Inactividad (10 minutos)
    let logoutTimer: any;
    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        if (pb.authStore.model) {
          addLog('Sesión cerrada por inactividad.', 'warning');
          logout();
          alert('Tu sesión ha expirado tras 10 minutos de inactividad por seguridad.');
        }
      }, 600000); // 10 min
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, resetTimer));
    resetTimer();

    sendPulse();
    const pulseInterval = setInterval(sendPulse, 120000); // Cada 2 min

    return () => {
      clearInterval(pulseInterval);
      if (logoutTimer) clearTimeout(logoutTimer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [currentUser, logout, addLog]);

  // ── Init: restore session from localStorage ──────────────────────────────
  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model) {
      setCurrentUser(rowToUser(pb.authStore.model as any));
      setPage('dashboard');
      refreshData();
    }
  }, [refreshData]);

  // ── Real-time subscriptions (only when authenticated) ─────────────────────
  useEffect(() => {
    if (!currentUser) return; // No suscribirse si no hay sesión activa

    let mounted = true;

    const subscribeToCollections = async () => {
      try {
        await pb.collection('tickets').subscribe('*', (e) => {
          if (!mounted) return;
          playNotificationSound(e.action === 'create' ? 'new_ticket' : 'update');
          refreshData(true);
        });
      } catch { console.warn('SSE fallback: tickets'); }

      try {
        await pb.collection('ticket_comentarios').subscribe('*', (e) => {
          if (!mounted) return;
          playNotificationSound(e.action === 'create' ? 'new_ticket' : 'update');
          refreshData(true);
        });
      } catch { console.warn('SSE fallback: comentarios'); }
    };

    subscribeToCollections();
    
    // Fallback: Robust Polling Every 3 Seconds para emular Real-time en View Collections
    const pollInterval = setInterval(() => {
        if (mounted && pbStatus === 'connected') {
            refreshData(true);
        }
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      pb.collection('tickets').unsubscribe('*').catch(() => {});
      pb.collection('ticket_comentarios').unsubscribe('*').catch(() => {});
    };
  }, [currentUser, pbStatus, refreshData]);

  // Sync tickets offline when back online
  const syncOfflineTickets = useCallback(async () => {
    if (offlineTickets.length === 0 || pbStatus !== 'connected') return;
    
    console.log("Sincronizando tickets capturados fuera de línea...");
    const remaining: any[] = [];

    for (const t of offlineTickets) {
        try {
            await pb.collection('tickets').create({
                titulo: t.title,
                descripcion: t.description,
                cliente_id: t.createdById,
                estado: 'Abierto',
                prioridad: t.priority,
                departamento_id: t.departmentId || null,
                agente_id: t.assignedToId || null,
            });
        } catch (err) {
            console.error("Error sincronizando ticket offline:", err);
            remaining.push(t);
        }
    }
    setOfflineTickets(remaining);
    if (remaining.length < offlineTickets.length) refreshData();
  }, [offlineTickets, pbStatus, refreshData]);

  useEffect(() => {
    if (isNetworkOnline && pbStatus === 'connected') {
        syncOfflineTickets();
    }
  }, [isNetworkOnline, pbStatus, syncOfflineTickets]);
  // ── tickets ─────────────────────────────────────────────────────────────
  const addTicket = useCallback(async (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'createdByName' | 'assignedToName'>, file?: File) => {
    if (!currentUser) throw new Error('Debes iniciar sesión para crear un ticket.');

    try {
      // Buscar el folio más alto REAL en el servidor para evitar duplicados 0001
      const lastTickets = await pb.collection('tickets').getList(1, 1, {
        sort: '-folio',
      });
      const maxFolio = lastTickets.items.length > 0 ? (lastTickets.items[0].folio || 0) : 0;
      const nextFolio = maxFolio + 1;

      const formData = new FormData();
      formData.append('folio', String(nextFolio));
      formData.append('titulo', ticket.title);
      formData.append('descripcion', ticket.description);
      formData.append('cliente_id', currentUser.id);
      formData.append('estado', 'Abierto');
      formData.append('prioridad', ticket.priority);
      formData.append('departamento_id', ticket.departmentId || '');
      formData.append('agente_id', ticket.assignedToId || '');
      
      if (file) {
        formData.append('adjuntos', file);
      }

      const pbTicket = await pb.collection('tickets').create(formData);

      // NUEVO: Crear mensaje inicial en el chat para sincronía total de imágenes
      const initialComment = new FormData();
      initialComment.append('id', generateId());
      initialComment.append('ticket_id', pbTicket.id);
      initialComment.append('usuario_id', currentUser.id);
      initialComment.append('autor_nombre', currentUser.name);
      initialComment.append('autor_email', currentUser.email);
      initialComment.append('mensaje', `INICIO DE SOLICITUD: ${ticket.description.substring(0, 100)}...`);
      initialComment.append('es_interno', 'false');
      initialComment.append('tipo', 'Sistema');
      if (file) initialComment.append('adjuntos', file);
      
      await pb.collection('ticket_comentarios').create(initialComment).catch(() => {});

      // SISTEMA: Auto-Respuesta Profesional de espera (Template Dto. SistemasC2)
      const ticketFolio = `TZH-${String(nextFolio).padStart(4, '0')}`;
      const msgC2 = `Dto. SistemasC2

Estimado usuario, su solicitud fue recibida correctamente.

• Estado:  Abierto
• Prioridad: ${ticket.priority} 
• Tiempo estimado de respuesta: 10 a 30 minutos ⏱️

se genero un  número de ticket para seguimiento: ${ticketFolio}

Para urgencias críticas, favor de contactar directamente al área ⚠️

Gracias por su comprensión.
Equipo de Soporte Técnico Dto. SistemasC2`;

      const autoResponse = new FormData();
      autoResponse.append('id', generateId());
      autoResponse.append('ticket_id', pbTicket.id);
      autoResponse.append('usuario_id', currentUser.id);
      autoResponse.append('mensaje', msgC2);
      autoResponse.append('es_interno', 'false');
      autoResponse.append('tipo', 'Sistema');
      
      await pb.collection('ticket_comentarios').create(autoResponse).catch(() => {});

      const t = rowToTicket(pbTicket as any, [], { [currentUser.id]: currentUser });
      setTickets(prev => [t, ...prev]);
      addLog(`Ticket creado exitosamente: ${t.id}`, 'success');
      return t;
    } catch (err: any) {
      console.error('addTicket failure:', err.data || err);
      // Offline fallback
      if (!isOnline) {
          const tempId = `off-${Date.now()}`;
          const tempTicket: Ticket = {
              ...ticket,
              id: tempId,
              folio: nextFolio,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: [],
              createdById: currentUser.id,
              createdByName: currentUser.name,
              assignedToName: 'Sincronizando...',
              status: 'Abierto'
          };
          setOfflineTickets(prev => [...prev, tempTicket]);
          setTickets(prev => [tempTicket, ...prev]);
          addLog("Ticket guardado localmente (Sin conexión)", "warn");
          return tempTicket;
      }
      throw new Error(`${err.message || 'Error de red.'}`);
    }
  }, [currentUser, isOnline, addLog]);

  const updateTicketStatus = useCallback(async (ticketId: string, status: TicketStatus) => {
    // Optimistic update
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    
    try {
      addLog(`Actualizando estado ticket ${ticketId} a ${status}`, 'info');
      
      // La base de datos espera "En Proceso" no "En Progreso"
      await pb.collection('tickets').update(ticketId, { estado: status });
      
      // Notificar en el chat sobre el cambio de estado con identidad explícita y profesional
      if (currentUser) {
        const formData = new FormData();
        formData.append('id', generateId());
        formData.append('ticket_id', ticketId);
        formData.append('usuario_id', currentUser.id);
        formData.append('autor_nombre', currentUser.name || currentUser.email);
        formData.append('autor_email', currentUser.email);
        formData.append('autor_rol', currentUser.role);
        formData.append('mensaje', `ESTATUS ACTUALIZADO A: [${status.toUpperCase()}]`);
        formData.append('es_interno', 'false');
        formData.append('tipo', 'Sistema');
        
        await pb.collection('ticket_comentarios').create(formData).catch(e => console.warn('No se pudo crear mensaje de sistema:', e));
        await refreshData(true);
      }
      
      addLog(`Estado de ticket ${ticketId} sincronizado: ${status}`, 'success');
    } catch (err: any) {
      console.error('updateTicketStatus error:', err.data || err);
      // Revertir cambio optimista en caso de error
      await refreshData(true);
      addLog(`Fallo al actualizar estado ticket ${ticketId}: ${err.message}`, 'error');
    }
  }, [addLog, currentUser, refreshData]);


  const updateTicketPriority = useCallback(async (ticketId: string, priority: TicketPriority) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority, updatedAt: new Date().toISOString() } : t));
    try {
      await pb.collection('tickets').update(ticketId, { prioridad: priority });
    } catch (err: any) {
      addLog(`Fallo al actualizar prioridad: ${err.message}`, 'error');
    }
  }, [addLog]);


  const assignTicket = useCallback(async (ticketId: string, userId: string) => {
    const user = users.find(u => u.id === userId);
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, assignedToId: userId, assignedToName: user?.name, updatedAt: new Date().toISOString() }
        : t
    ));
    try {
      await pb.collection('tickets').update(ticketId, {
        agente_id: userId || null,
      });
    } catch (err: any) {
      addLog(`Error al asignar ticket: ${err.message}`, 'error');
    }
  }, [users, addLog]);

  // Auto-asigna al admin que está visualizando el ticket, si aún no tiene asignado
  const autoAssignAdminOnOpen = useCallback(async (ticketId: string) => {
    if (!currentUser) return;
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Agente') return;
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    if (ticket.assignedToId) return;
    
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, assignedToId: currentUser.id, assignedToName: currentUser.name, updatedAt: new Date().toISOString() }
        : t
    ));
    try {
      await pb.collection('tickets').update(ticketId, {
        agente_id: currentUser.id,
      });
      refreshData(true);
    } catch (err: any) {
      if (!err.isAbort) console.error('autoAssign error:', err);
    }
  }, [currentUser, tickets]);

  const addMessage = useCallback(async (ticketId: string, content: string, isInternal = false, file?: File, tipo: Message['tipo'] = 'Mensaje') => {
    if (!currentUser) return;
    
    try {
      addLog(`Enviando mensaje (${tipo}) para ticket ${ticketId}`, 'info');
      
      const formData = new FormData();
      // Generamos un ID manual para satisfacer la validación estricta de PocketBase 0.36.8
      formData.append('id', generateId());
      formData.append('ticket_id', ticketId);
      formData.append('usuario_id', currentUser.id);
      formData.append('mensaje', content);
      formData.append('es_interno', String(isInternal));
      
      // NOTA: 'tipo' y 'adjuntos' se añaden solo si existen en el esquema tras el reinicio
      formData.append('tipo', tipo);
      if (file) {
        formData.append('adjuntos', file);
      }

      await pb.collection('ticket_comentarios').create(formData);
      addLog(`Mensaje sincronizado para ticket ${ticketId}`, 'success');
      await refreshData(true);
    } catch (err: any) {
      console.error('addMessage error details:', err.data || err);
      // Fallback: si falla por campos desconocidos, intentamos versión básica
      if (err.status === 400) {
          try {
             const basicForm = new FormData();
             basicForm.append('id', generateId());
             basicForm.append('ticket_id', ticketId);
             basicForm.append('usuario_id', currentUser.id);
             basicForm.append('mensaje', content);
             basicForm.append('es_interno', String(isInternal));
             await pb.collection('ticket_comentarios').create(basicForm);
             await refreshData(true);
             return;
          } catch (inner) { console.error('Falló incluso el envio básico'); }
      }
      addLog(`Error al enviar mensaje ticket ${ticketId}: ${err.message}`, 'error');
    }
  }, [currentUser, refreshData, addLog]);

  const getTicketById = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);

  // ── departments ─────────────────────────────────────────────────────────
  const addDepartment = useCallback(async (dept: Omit<Department, 'id' | 'createdAt'>) => {
    try {
      const data = await pb.collection('departamentos').create({
        nombre: dept.name,
        descripcion: dept.description,
        color: dept.color,
        activo: true,
        icono: 'Building',
      });
      setDepartments(prev => [...prev, rowToDept(data as any)]);
    } catch (err: any) {
      addLog(`Error al crear departamento: ${err.message}`, 'error');
    }
  }, [addLog]);

  const updateDepartment = useCallback(async (id: string, dept: Partial<Department>) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...dept } : d));
    try {
      await pb.collection('departamentos').update(id, {
        nombre: dept.name,
        descripcion: dept.description,
        color: dept.color,
      });
    } catch (err: any) {
      addLog(`Error al actualizar departamento: ${err.message}`, 'error');
    }
  }, [addLog]);

  const deleteDepartment = useCallback(async (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    try {
      await pb.collection('departamentos').delete(id);
    } catch (err: any) {
      addLog(`Error al eliminar departamento: ${err.message}`, 'error');
    }
  }, [addLog]);

  const createUser = useCallback(async (userData: { name: string; email: string; role: User['role']; departmentId?: string; password?: string }) => {
    try {
      await pb.collection('users').create({
        email: userData.email,
        password: userData.password || 'Tzomp2026!',
        passwordConfirm: userData.password || 'Tzomp2026!',
        name: userData.name,
        rol: userData.role,
        departamento_id: userData.departmentId || '',
        emailVisibility: true,
      });
      await refreshData();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating user:', err);
      return { success: false, error: err.message };
    }
  }, [refreshData]);

  const updateUser = useCallback(async (id: string, userData: Partial<User>) => {
    try {
      const updateData: any = {};
      if (userData.name) updateData.name = userData.name;
      if (userData.role) updateData.rol = userData.role;
      if (userData.departmentId) updateData.departamento_id = userData.departmentId;
      
      await pb.collection('users').update(id, updateData);
      addLog(`Usuario ${id} actualizado correctamente`, 'success');
      await refreshData();
    } catch (err: any) {
      addLog(`Error al actualizar usuario: ${err.message}`, 'error');
    }
  }, [addLog, refreshData]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await pb.collection('users').delete(id);
      addLog(`Usuario ${id} eliminado`, 'warning');
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      addLog(`Error al eliminar usuario: ${err.message}`, 'error');
    }
  }, [addLog]);

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      tickets,
      users,
      departments,
      loading,
      addTicket,
      updateTicketStatus,
      updateTicketPriority,
      assignTicket,
      autoAssignAdminOnOpen,
      addMessage,
      getTicketById,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      refreshData,
      offlineTickets,
      syncOfflineTickets,
      page,
      setPage,
      selectedTicketId,
      setSelectedTicketId,
      pbStatus,
      lastPing,
      loginWithPocketBase,
      logout,
      createUser,
      updateUser,
      deleteUser,
      triggerSync,
      systemLogs,
      addLog,
      userActivity,
      isOnline,
      theme,
      toggleTheme,
      perfiles: users.map(u => ({
        id: u.id,
        nombre: u.name,
        correo: u.email,
        rol: u.role.toLowerCase()
      })),
      resetSystem: async () => {
        setLoading(true);
        addLog('INICIANDO_PROTOCOLO_REINICIO_MAESTRO...', 'warn');
        try {
          // 1. Limpiar tickets
          const ticketsList = await pb.collection('tickets').getFullList();
          for (const t of ticketsList) await pb.collection('tickets').delete(t.id);
          
          // 2. Limpiar comentarios
          const commentsList = await pb.collection('ticket_comentarios').getFullList();
          for (const c of commentsList) await pb.collection('ticket_comentarios').delete(c.id);

          // 3. Departamentos base (HELP DESK)
          const depts = [
            { nombre: 'Soporte Administrativo', descripcion: 'Atención a usuarios y gestión administrativa', color: '#06b6d4', activo: true, icono: 'Building' },
            { nombre: 'Sistemas / TI', descripcion: 'Infraestructura, Redes y Servidores', color: '#ec4899', activo: true, icono: 'Cpu' },
            { nombre: 'Mantenimiento Preventivo', descripcion: 'Revisión periódica de equipos de cómputo', color: '#f97316', activo: true, icono: 'Settings' },
            { nombre: 'Gestión de Licencias', descripcion: 'Control de software institucional', color: '#10b981', activo: true, icono: 'Code' },
            { nombre: 'Ventas / Almacén', descripcion: 'Control de insumos y refacciones de TI', color: '#3b82f6', activo: true, icono: 'Package' },
            { nombre: 'Dirección General', descripcion: 'Supervisión técnica y operativa', color: '#6366f1', activo: true, icono: 'Shield' },
            { nombre: 'Recursos Humanos', descripcion: 'Gestión de personal y accesos', color: '#f59e0b', activo: true, icono: 'Users' }
          ];

          for (const d of depts) {
            const exists = departments.find(existing => existing.name.toLowerCase() === d.nombre.toLowerCase());
            if (!exists) {
              await pb.collection('departamentos').create(d).catch(() => {});
            }
          }

          addLog(`PROTOCOL_RESET_COMPLETED.`, 'success');
          await refreshData();
        } catch (err: any) {
          addLog(`FALLO_PROTOCOLO_REINICIO: ${err.message}`, 'error');
        } finally {
          setLoading(false);
        }
      }
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
