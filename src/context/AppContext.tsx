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
        // Arpegio triple ascendente — Alerta de nuevo ticket — Más fuerte y claro
        const now = ctx.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);         // La4
        oscillator.frequency.setValueAtTime(554, now + 0.1);  // Do#5
        oscillator.frequency.setValueAtTime(659, now + 0.2);  // Mi5
        oscillator.frequency.setValueAtTime(880, now + 0.3);  // La5
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.setValueAtTime(0.3, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        
        oscillator.start(now);
        oscillator.stop(now + 0.6);
      } else {
        // Doble pulso suave — Actualización / mensaje
        const now = ctx.currentTime;
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(523, now);   // Do5
        oscillator.frequency.setValueAtTime(659, now + 0.1); // Mi5
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.20);
        gain.gain.linearRampToValueAtTime(0, now + 0.40);
        
        oscillator.start(now);
        oscillator.stop(now + 0.4);
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
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>) => Promise<Ticket>;
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
  logout: () => Promise<void>;
  createUser: (data: { name: string; email: string; role: User['role']; departmentId?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<void>;
  triggerSync: () => Promise<void>;
  systemLogs: {t: number, m: string, type: 'info'|'warn'|'error'|'success'}[];
  addLog: (message: string, type?: 'info'|'warn'|'error'|'success' | 'warning') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  resetSystem: () => Promise<void>;
  perfiles: any[];
  userActivity: Record<string, string>;
  onlineUsers: Record<string, string>;
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
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
const COLORS = ['#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#0891B2'];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
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
  const userId = String(r.usuario_id || r.autor_id || '');
  const author = usersMap[userId];
  const authorName = author?.name || 'Usuario';
  
  const content = String(r.mensaje || '');
  const timestamp = String(r.created || new Date().toISOString());

  // Generate URLs for attachments
  const adjuntosLocal: string[] = [];
  if (r.adjuntos && Array.isArray(r.adjuntos)) {
    r.adjuntos.forEach((fname: string) => {
      adjuntosLocal.push(pb.files.getURL(r, fname));
    });
  }

  return {
    id: String(r.id),
    ticketId: String(r.ticket_id || ''),
    authorId: userId,
    authorName,
    authorInitials: getInitials(authorName),
    authorColor: author?.avatarColor || colorFor(userId),
    authorRole: author?.role || 'Cliente',
    content,
    timestamp,
    isInternal: Boolean(r.es_interno),
    imageUrl: adjuntosLocal[0], // Compatibilidad con UI existente
    adjuntos: adjuntosLocal,
    tipo: r.tipo as any || 'Mensaje'
  };
}

// Maps tabla "tickets": id, titulo, descripcion, estado, prioridad, departamento_id, creado_por_id...
function rowToTicket(r: Record<string, unknown>, msgs: Message[] = [], usersMap: Record<string, User> = {}): Ticket {
  const creatorId = String(r.cliente_id || r.creado_por_id || '');
  const assigneeId = r.agente_id ? String(r.agente_id) : (r.asignado_a_id ? String(r.asignado_a_id) : undefined);
  const creator = usersMap[creatorId];
  const assignee = assigneeId ? usersMap[assigneeId] : undefined;

  const status = normalizeStatus(String(r.estado || 'Abierto'));
  const priority = normalizePriority(String(r.prioridad || 'Media'));

  return {
    id: String(r.id),
    folio: r.folio ? Number(r.folio) : undefined,
    title: String(r.titulo || ''),
    description: String(r.descripcion || ''),
    status: (status.charAt(0).toUpperCase() + status.slice(1)) as TicketStatus,
    priority: (priority.charAt(0).toUpperCase() + priority.slice(1)) as TicketPriority,
    category: String(r.categoria || 'General') as any,
    departmentId: r.departamento_id ? String(r.departamento_id) : undefined,
    createdById: creatorId,
    createdByName: creator?.name || 'Solicitante',
    assignedToId: assigneeId,
    assignedToName: assignee?.name || 'En espera',
    createdAt: String(r.created || new Date().toISOString()),
    updatedAt: String(r.updated || new Date().toISOString()),
    messages: msgs,
    imageUrl: (r.imagenes && Array.isArray(r.imagenes)) ? r.imagenes[0] : undefined,
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
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
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
      setIsOnline(true);
      checkPB();
    };
    const handleOffline = () => {
      console.log("MODO_DESCONECTADO_ACTIVO.");
      setIsOnline(false);
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
      setUsers(freshUsers);

      const freshUMap: Record<string, User> = {};
      const activityMap: Record<string, string> = {};
      
      freshUsers.forEach(u => { 
        freshUMap[u.id] = u; 
      });
      
      usersList.forEach(r => {
        if (r.updated) {
          activityMap[r.id] = String(r.updated);
        }
      });
      setUserActivity(activityMap);

      // 2. Departamentos
      const deptsList = await pb.collection('departamentos').getFullList({ sort: 'nombre' });
      setDepartments(deptsList.map(rowToDept));

      // 3. Comentarios
      const msgsByTicket: Record<string, Message[]> = {};
      const comentariosList = await pb.collection('ticket_comentarios').getFullList({ sort: 'created' });
      comentariosList.forEach(r => {
        const m = rowToMessage(r as any, freshUMap);
        if (!msgsByTicket[m.ticketId]) msgsByTicket[m.ticketId] = [];
        msgsByTicket[m.ticketId].push(m);
      });

      // 4. Tickets
      const ticketsList = await pb.collection('tickets').getFullList({ sort: '-created' });
      setTickets(ticketsList.map(r =>
        rowToTicket(r as any, msgsByTicket[String(r.id)] || [], freshUMap)
      ));

      setPbStatus('connected');
    } catch (err: any) {
      console.error('Error loading data:', err);
      addLog(`Error de carga: ${err.message}`, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [addLog]);

  const triggerSync = useCallback(async () => {
    addLog('Sincronización manual iniciada...', 'info');
    await refreshData();
    addLog('Sincronización manual completada con éxito.', 'info');
  }, [refreshData, addLog]);

  useEffect(() => {
    if (pb.authStore.model) {
      setCurrentUser(rowToUser(pb.authStore.model as any));
      setPage('dashboard');
    }
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    // Real-time con PocketBase
    pb.collection('tickets').subscribe('*', (e) => {
      playNotificationSound(e.action === 'create' ? 'new_ticket' : 'update');
      refreshData(true);
    });
    pb.collection('ticket_comentarios').subscribe('*', (e) => {
      playNotificationSound(e.action === 'create' ? 'new_ticket' : 'update');
      refreshData(true);
    });

    return () => {
      pb.collection('tickets').unsubscribe('*');
      pb.collection('ticket_comentarios').unsubscribe('*');
    };
  }, [refreshData]);

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
    if (isOnline && pbStatus === 'connected') {
        syncOfflineTickets();
    }
  }, [isOnline, pbStatus, syncOfflineTickets]);

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

  // ── tickets ─────────────────────────────────────────────────────────────
  const addTicket = useCallback(async (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'createdByName' | 'assignedToName'>) => {
    if (!currentUser) throw new Error('Debes iniciar sesión para crear un ticket.');

    const maxFolio = tickets.length > 0 ? Math.max(...tickets.map(t => t.folio || 0)) : 0;
    const nextFolio = maxFolio + 1;

    try {
      const pbTicket = await pb.collection('tickets').create({
        folio: String(nextFolio), // Schema says text
        titulo: ticket.title,
        descripcion: ticket.description,
        cliente_id: currentUser.id,
        estado: 'Abierto',
        prioridad: ticket.priority,
        departamento_id: ticket.departmentId || null,
        agente_id: ticket.assignedToId || null,
      });

      const t = rowToTicket(pbTicket as any, [], { [currentUser.id]: currentUser });
      setTickets(prev => [t, ...prev]);
      addLog(`Ticket creado exitosamente: ${t.id}`, 'success');
      return t;
    } catch (err: any) {
      console.error('addTicket failure:', err);
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
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    try {
      addLog(`Actualizando estado ticket ${ticketId} a ${status}`, 'info');
      await pb.collection('tickets').update(ticketId, { estado: status });
      addLog(`Estado de ticket ${ticketId} sincronizado: ${status}`, 'success');
    } catch (err: any) {
      addLog(`Fallo al actualizar estado ticket ${ticketId}: ${err.message}`, 'error');
    }
  }, [addLog]);

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
    } catch (err: any) {
      console.error('autoAssign error:', err);
    }
  }, [currentUser, tickets]);

  const addMessage = useCallback(async (ticketId: string, content: string, isInternal = false, file?: File, tipo: Message['tipo'] = 'Mensaje') => {
    if (!currentUser) return;
    
    try {
      addLog(`Enviando mensaje (${tipo}) para ticket ${ticketId}`, 'info');
      
      const formData = new FormData();
      formData.append('ticket_id', ticketId);
      formData.append('usuario_id', currentUser.id);
      formData.append('mensaje', content);
      formData.append('es_interno', String(isInternal));
      formData.append('tipo', tipo);
      if (file) {
        formData.append('adjuntos', file);
      }

      await pb.collection('ticket_comentarios').create(formData);
      addLog(`Mensaje sincronizado para ticket ${ticketId}`, 'success');
      await refreshData();
    } catch (err: any) {
      console.error('addMessage error:', err);
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

  const deleteUser = useCallback(async (id: string) => {
    try {
      await pb.collection('users').delete(id);
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
      deleteUser,
      triggerSync,
      systemLogs,
      addLog,
      userActivity,
      onlineUsers: userActivity,
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

          // 3. Departamentos base
          const depts = [
            { nombre: 'Servicios Pub', descripcion: 'Servicios Públicos Municipales', color: '#06b6d4', activo: true, icono: 'Building' },
            { nombre: 'Contraloria Inter', descripcion: 'Contraloría Interna Municipal', color: '#ec4899', activo: true, icono: 'Building' },
            { nombre: 'ProtecCivil', descripcion: 'Protección Civil y Emergencias', color: '#f97316', activo: true, icono: 'Shield' },
            { nombre: 'Sistemas / TI', descripcion: 'Soporte Técnico Especializado', color: '#10b981', activo: true, icono: 'Cpu' },
            { nombre: 'Tesorería', descripcion: 'Gestión Financiera y Pagos', color: '#3b82f6', activo: true, icono: 'Coins' },
            { nombre: 'Agua Potable', descripcion: 'Suministro y Redes Hidráulicas', color: '#6366f1', activo: true, icono: 'Droplets' },
            { nombre: 'Obras Públicas', descripcion: 'Infraestructura y Desarrollo', color: '#f59e0b', activo: true, icono: 'Hammer' },
            { nombre: 'Seguridad Pública', descripcion: 'Vigilancia y Orden Municipal', color: '#ef4444', activo: true, icono: 'Siren' }
          ];

          for (const d of depts) {
            try {
              await pb.collection('departamentos').create(d);
            } catch { /* exists */ }
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
