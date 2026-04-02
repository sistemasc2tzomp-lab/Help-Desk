import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Ticket, Department, TicketStatus, TicketPriority, TicketCategory, Message } from '../types';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';

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
  addMessage: (ticketId: string, content: string, isInternal?: boolean, imageUrl?: string) => Promise<void>;
  getTicketById: (id: string) => Ticket | undefined;
  addDepartment: (dept: Omit<Department, 'id' | 'createdAt'>) => Promise<void>;
  updateDepartment: (id: string, dept: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  page: string;
  setPage: (page: string) => void;
  selectedTicketId: string | null;
  setSelectedTicketId: (id: string | null) => void;
  supabaseReady: boolean;
  sbStatus: 'connected' | 'disconnected' | 'checking';
  lastPing: string | null;
  loginWithSupabase: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  createUser: (data: { name: string; email: string; role: User['role']; departmentId?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

// ── DB value mappers (para constraints de Supabase) ────────────────────────
// Supabase CHECK constraint puede exigir minúsculas. Intentamos el valor
// original primero; si falla, el componente lo reintentará con el mapeado.
function mapToDbStatus(status: string): string {
  const map: Record<string, string> = {
    'Abierto': 'abierto',
    'En Progreso': 'en_progreso',
    'Resuelto': 'resuelto',
    'Cerrado': 'cerrado',
  };
  return map[status] ?? status.toLowerCase().replace(' ', '_');
}

function mapToDbPriority(priority: string): string {
  const map: Record<string, string> = {
    'Urgente': 'urgente',
    'Alta': 'alta',
    'Media': 'media',
    'Baja': 'baja',
  };
  return map[priority] ?? priority.toLowerCase();
}

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
// Maps tabla "perfiles": id, nombre, email, avatar, rol, departamento_id, activo, creado_en
function rowToUser(r: Record<string, unknown>): User {
  const name = String(r.nombre || r.name || r.full_name || r.email || 'Usuario');
  const roleRaw = r.rol || r.role || r.rango || 'Cliente';
  return {
    id: String(r.id),
    name,
    initials: getInitials(name),
    email: String(r.email || ''),
    role: normalizeRole(roleRaw),
    avatarColor: colorFor(String(r.id)),
    departmentId: r.departamento_id ? String(r.departamento_id) : (r.department_id ? String(r.department_id) : undefined),
  };
}

// Maps tabla "messages": id, ticket_id, author_id, content, is_internal, image_url, created_at
function rowToMessage(r: Record<string, unknown>, usersMap: Record<string, User> = {}): Message {
  const userId = String(r.usuario_id || r.author_id || r.user_id || '');
  const author = usersMap[userId];
  const authorName = author?.name || String(r.author_name || r.nombre_autor || 'Usuario');
  
  // content/contenido
  const content = String(r.contenido || r.content || r.mensaje || '');
  
  // timestamp/fecha
  const timestamp = String(r.creado_en || r.created_at || r.fecha || new Date().toISOString());

  return {
    id: String(r.id),
    ticketId: String(r.ticket_id || r.id_ticket || ''),
    authorId: userId,
    authorName,
    authorInitials: getInitials(authorName),
    authorColor: author?.avatarColor || colorFor(userId),
    authorRole: author?.role || 'Cliente',
    content,
    timestamp,
    isInternal: Boolean(r.es_interno || r.is_internal || r.interno),
    // imagenes is jsonb array, take first element's url if present
    imageUrl: (() => {
      const imgs = r.imagenes as unknown;
      if (Array.isArray(imgs) && imgs.length > 0) {
        return String(imgs[0].url || imgs[0] || '');
      }
      return (r.image_url || r.imagen || r.url_foto) ? String(r.image_url || r.imagen || r.url_foto) : undefined;
    })(),
  };
}

// Maps tabla "tickets": id, titulo, descripcion, estado, prioridad, departamento_id,
//   creado_por_id, asignado_a_id, etiquetas, imagenes(jsonb), creado_en, actualizado_en
function rowToTicket(r: Record<string, unknown>, msgs: Message[] = [], usersMap: Record<string, User> = {}): Ticket {
  const creatorId = String(r.creado_por_id || r.created_by_id || '');
  const assigneeId = (r.asignado_a_id || r.assigned_to_id) ? String(r.asignado_a_id || r.assigned_to_id) : undefined;
  const creator = usersMap[creatorId];
  const assignee = assigneeId ? usersMap[assigneeId] : undefined;

  // imagenes is jsonb — get first image url
  const imageUrl = (() => {
    const imgs = r.imagenes as unknown;
    if (Array.isArray(imgs) && imgs.length > 0) return String(imgs[0].url || imgs[0] || '');
    const possibleImg = r.image_url || r.attachment_url || r.imagen || r.url_foto;
    return possibleImg ? String(possibleImg) : undefined;
  })();

  const status = normalizeStatus(String(r.estado || r.status || 'Abierto'));
  const priority = normalizePriority(String(r.prioridad || r.priority || 'Media'));
  const category = String(r.categoria || r.category || 'General');

  return {
    id: String(r.id),
    title: String(r.titulo || r.title || r.asunto || ''),
    description: String(r.descripcion || r.description || r.detalles || ''),
    status: (status.charAt(0).toUpperCase() + status.slice(1)) as TicketStatus,
    priority: (priority.charAt(0).toUpperCase() + priority.slice(1)) as TicketPriority,
    category: (category.charAt(0).toUpperCase() + category.slice(1)) as TicketCategory,
    departmentId: r.departamento_id ? String(r.departamento_id) : (r.department_id ? String(r.department_id) : undefined),
    createdById: creatorId,
    createdByName: creator?.name || String(r.creado_por_nombre || r.created_by_name || 'Solicitante'),
    assignedToId: assigneeId,
    assignedToName: assignee?.name || String(r.asignado_a_nombre || r.assigned_to_name || 'En espera'),
    createdAt: String(r.creado_en || r.created_at || new Date().toISOString()),
    updatedAt: String(r.actualizado_en || r.updated_at || new Date().toISOString()),
    messages: msgs,
    imageUrl,
  };
}

// Maps tabla "departamentos": id, nombre, descripcion, jefe, color, creado_en
function rowToDept(r: Record<string, unknown>): Department {
  return {
    id: String(r.id),
    name: String(r.nombre || r.name || ''),
    description: String(r.descripcion || r.description || ''),
    color: String(r.color || '#7C3AED'),
    createdAt: String(r.creado_en || r.created_at || new Date().toISOString()),
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
  const [supabaseReady, setSupabaseReady] = useState(isSupabaseConfigured());
  const [sbStatus, setSbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastPing, setLastPing] = useState<string | null>(null);

  const checkSupabase = useCallback(async () => {
    const ready = isSupabaseConfigured();
    setSupabaseReady(ready);
    if (!ready) {
      setSbStatus('disconnected');
      return;
    }
    try {
      const { error } = await getSupabase().from('perfiles').select('id').limit(1);
      if (error && error.code !== 'PGRST116') throw error;
      setSbStatus('connected');
      setLastPing(new Date().toISOString());
    } catch {
      setSbStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkSupabase();
    const interval = setInterval(checkSupabase, 30000);
    return () => clearInterval(interval);
  }, [checkSupabase]);



  // ── fetch all data ──────────────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabase();
    setLoading(true);
    try {
      // 1. Usuarios: cargamos frescos de la BD y construimos el mapa localmente
      let freshUsers: User[] = [];
      try {
        const { data: perfilesData } = await sb.from('perfiles').select('*');
        const usersFromPerfiles: User[] = (perfilesData as Record<string, unknown>[] || []).map(rowToUser);
        freshUsers = [...usersFromPerfiles];
        try {
          const { data: usuariosData } = await sb.from('usuarios').select('*');
          if (usuariosData && usuariosData.length > 0) {
            const usersFromUsuarios: User[] = (usuariosData as Record<string, unknown>[]).map(r => {
              const name = String(r.nombre || r.name || r.email || 'Usuario');
              return {
                id: String(r.id),
                name,
                initials: getInitials(name),
                email: String(r.email || ''),
                role: normalizeRole(r.rol || r.role),
                avatarColor: colorFor(String(r.id)),
                departmentId: undefined,
              };
            });
            const perfilIds = new Set(usersFromPerfiles.map(u => u.id));
            freshUsers = [...usersFromPerfiles, ...usersFromUsuarios.filter(u => !perfilIds.has(u.id))];
          }
        } catch { /* tabla usuarios opcional */ }
        setUsers(freshUsers);
      } catch (e) { console.error('refreshData: perfiles error', e); }

      // Mapa de usuarios para resolver nombres/roles en mensajes y tickets
      const freshUMap: Record<string, User> = {};
      freshUsers.forEach(u => { freshUMap[u.id] = u; });

      // 2. Departamentos
      try {
        const { data: deptsData } = await sb.from('departamentos').select('*').order('creado_en', { ascending: true });
        if (deptsData) setDepartments((deptsData as Record<string, unknown>[]).map(rowToDept));
      } catch (e) { console.error('refreshData: departments error', e); }

      // 3. Comentarios — ahora usa el mapa fresco
      const msgsByTicket: Record<string, Message[]> = {};
      try {
        const { data: comentariosData } = await sb
          .from('ticket_comentarios')
          .select('*')
          .order('creado_en', { ascending: true });
        if (comentariosData) {
          (comentariosData as Record<string, unknown>[]).forEach(r => {
            const m = rowToMessage(r, freshUMap);
            if (!msgsByTicket[m.ticketId]) msgsByTicket[m.ticketId] = [];
            msgsByTicket[m.ticketId].push(m);
          });
        }
      } catch (e) { console.error('refreshData: comentarios error', e); }

      // 4. Tickets — ahora usa el mapa fresco
      try {
        const { data: tktData } = await sb
          .from('tickets')
          .select('*')
          .order('creado_en', { ascending: false });
        if (tktData) {
          setTickets((tktData as Record<string, unknown>[]).map(r =>
            rowToTicket(r, msgsByTicket[String(r.id)] || [], freshUMap)
          ));
        }
      } catch (e) { console.error('refreshData: tickets error', e); }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    const sb = getSupabase();
    sb.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.warn('Sesión expirada o token inválido, cerrando sesión...', error.message);
        sb.auth.signOut().catch(() => {});
        setCurrentUser(null);
        return;
      }
      const sessionUser = data.session?.user;
      if (sessionUser) {
        sb.from('perfiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single()
          .then(({ data: perfil }) => {
            if (perfil) {
              const dbUser = rowToUser(perfil as Record<string, unknown>);
              const metaRole = normalizeRole(
                sessionUser.user_metadata?.role ||
                sessionUser.app_metadata?.role || ''
              );
              const resolvedRole: User['role'] = metaRole !== 'Cliente' ? metaRole : dbUser.role;
              setCurrentUser({ ...dbUser, role: resolvedRole });
              setPage('dashboard');
            }
          });
      }
    });
    refreshData();
  }, [supabaseReady, refreshData]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__sbRecheck = () => {
      checkSupabase();
    }
  }, [users, departments]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabase();
    const channel = sb.channel('public_schema_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_comentarios' }, () => {
        refreshData();
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [refreshData]);

  // ── auth ─────────────────────────────────────────────────────────────────
  const loginWithSupabase = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!isSupabaseConfigured()) return 'Supabase no está configurado.';
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    if (!data.user) return 'Error al iniciar sesión';

    const authUser = data.user;
    const metaRole = normalizeRole(
      authUser.user_metadata?.role || authUser.app_metadata?.role || ''
    );

    // fetch from perfiles table
    const { data: perfil, error: perfilErr } = await sb
      .from('perfiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (perfil && !perfilErr) {
      const dbUser = rowToUser(perfil as Record<string, unknown>);
      const resolvedRole: User['role'] = metaRole !== 'Cliente' ? metaRole : dbUser.role;

      // Sync role back to DB if different
      if (resolvedRole !== dbUser.role) {
        await sb.from('perfiles').update({ rol: resolvedRole }).eq('id', authUser.id);
      }

      const user: User = { ...dbUser, role: resolvedRole };
      setCurrentUser(user);
      await refreshData();
      setPage('dashboard');
    } else {
      // Create new profile in perfiles
      const roleToSave = metaRole !== 'Cliente' ? metaRole : 'Cliente';
      const name = authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] || (roleToSave === 'Admin' ? 'Administrador' : 'Usuario');

      // Fallback insertion for perfiles
      const profileData: any = { 
        id: authUser.id, 
        email: authUser.email, 
        activo: true,
        nombre: name,
        rol: roleToSave
      };

      await sb.from('perfiles').upsert(profileData);

      const newUser: User = {
        id: authUser.id,
        name,
        initials: getInitials(name),
        email: authUser.email || '',
        role: roleToSave,
        avatarColor: colorFor(authUser.id),
      };
      setCurrentUser(newUser);
      await refreshData();
      setPage('dashboard');
    }
    return null;
  }, [refreshData]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await getSupabase().auth.signOut();
    }
    setCurrentUser(null);
    setTickets([]);
    setUsers([]);
    setDepartments([]);
    setPage('login');
  }, []);

  // ── tickets ─────────────────────────────────────────────────────────────
  const addTicket = useCallback(async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>): Promise<Ticket> => {
    if (isSupabaseConfigured()) {
      const sb = getSupabase();

      // Auto-asignar al primer admin disponible (busca frescos en BD)
      let autoAdminId: string | null = null;
      try {
        const { data: admins } = await sb
          .from('perfiles')
          .select('id, nombre, rol')
          .or('rol.eq.Admin,rol.eq.admin,rol.eq.Administrador')
          .limit(1);
        if (admins && admins.length > 0) {
          autoAdminId = String(admins[0].id);
        }
      } catch { /* si falla, continúa sin asignar */ }

      // Generate highly robust unique TZH folio
      const timestamp = Date.now().toString();
      const customFolio = `TZH-${timestamp.slice(-6)}-${Math.floor(Math.random() * 100)}`;

      const insertData: Record<string, unknown> = {
        id: customFolio,
        titulo: ticketData.title,
        descripcion: ticketData.description,
        creado_por_id: ticketData.createdById,
        estado: mapToDbStatus('Abierto'),
        prioridad: mapToDbPriority(ticketData.priority),
        departamento_id: ticketData.departmentId || null,
        // Asignación automática al admin
        asignado_a_id: autoAdminId || ticketData.assignedToId || null,
        // Imagen de evidencia del ticket (jsonb array)
        ...(ticketData.imageUrl ? { imagenes: [{ url: ticketData.imageUrl }] } : {}),
      };

      const { data, error } = await sb.from('tickets').insert(insertData).select().single();

      if (data && !error) {
        if (ticketData.imageUrl) {
          // ALSO SAVE TO RECENTLY REQUIRED TICKET_FOTOS TABLE
          await sb.from('ticket_fotos').insert({ ticket_id: customFolio, url: ticketData.imageUrl });
        }

        const uMap: Record<string, User> = {};
        users.forEach(u => { uMap[u.id] = u; });
        const t = rowToTicket(data as Record<string, unknown>, [], uMap);
        setTickets(prev => [t, ...prev]);
        return t;
      }
      if (error) {
        // Retry logic ensuring we keep lowercase values for Postgres CHECK constraints
        const retryData = { ...insertData, estado: 'abierto', prioridad: mapToDbPriority(ticketData.priority) };
        const { data: d2, error: e2 } = await sb.from('tickets').insert(retryData).select().single();
        if (d2 && !e2) {
          const uMap: Record<string, User> = {};
          users.forEach(u => { uMap[u.id] = u; });
          const t = rowToTicket(d2 as Record<string, unknown>, [], uMap);
          setTickets(prev => [t, ...prev]);
          return t;
        }
        console.error('addTicket error:', error, e2);
      }
    }
    const newTicket: Ticket = {
      ...ticketData,
      id: `TKT-${Date.now()}`,
      status: 'Abierto',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setTickets(prev => [newTicket, ...prev]);
    return newTicket;
  }, [users]);

  const updateTicketStatus = useCallback(async (ticketId: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      // Try lowercase first (constraint), fallback to capitalized
      const { error } = await sb.from('tickets').update({ 
        estado: mapToDbStatus(status),
        actualizado_en: new Date().toISOString() 
      }).eq('id', ticketId);
      if (error) {
        await sb.from('tickets').update({ 
          estado: status,
          actualizado_en: new Date().toISOString() 
        }).eq('id', ticketId);
      }
    }
  }, []);

  const updateTicketPriority = useCallback(async (ticketId: string, priority: TicketPriority) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority, updatedAt: new Date().toISOString() } : t));
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      const { error } = await sb.from('tickets').update({ 
        prioridad: mapToDbPriority(priority),
        actualizado_en: new Date().toISOString() 
      }).eq('id', ticketId);
      if (error) {
        await sb.from('tickets').update({ 
          prioridad: priority,
          actualizado_en: new Date().toISOString() 
        }).eq('id', ticketId);
      }
    }
  }, []);


  const assignTicket = useCallback(async (ticketId: string, userId: string) => {
    const user = users.find(u => u.id === userId);
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, assignedToId: userId, assignedToName: user?.name, updatedAt: new Date().toISOString() }
        : t
    ));
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      await sb.from('tickets').update({
        asignado_a_id: userId || null,
        asignado_a_nombre: user?.name || null,
        actualizado_en: new Date().toISOString(),
      }).eq('id', ticketId);
    }
  }, [users]);

  // Auto-asigna al admin que está visualizando el ticket, si aún no tiene asignado
  const autoAssignAdminOnOpen = useCallback(async (ticketId: string) => {
    if (!currentUser) return;
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Agente') return;
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    // Solo asignar si el ticket no tiene operador asignado
    if (ticket.assignedToId) return;
    // Actualizar en BD y en estado
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, assignedToId: currentUser.id, assignedToName: currentUser.name, updatedAt: new Date().toISOString() }
        : t
    ));
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      await sb.from('tickets').update({
        asignado_a_id: currentUser.id,
        asignado_a_nombre: currentUser.name,
        actualizado_en: new Date().toISOString(),
      }).eq('id', ticketId);
    }
  }, [currentUser, tickets]);

  const addMessage = useCallback(async (ticketId: string, content: string, isInternal = false, imageUrl?: string) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const message: Message = {
      id: `msg-${Date.now()}`,
      ticketId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorInitials: currentUser.initials,
      authorColor: currentUser.avatarColor,
      authorRole: currentUser.role,
      content,
      timestamp: now,
      isInternal,
      imageUrl,
    };
    // Optimistic update inmediato
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, messages: [...t.messages, message], updatedAt: now }
        : t
    ));
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      // Guardamos imagen en campo imagenes (jsonb array) para que ambos lados la vean
      const commentPayload: Record<string, unknown> = {
        ticket_id: ticketId,
        usuario_id: currentUser.id,
        contenido: content,
        es_interno: isInternal,
      };
      if (imageUrl) {
        commentPayload.imagenes = [{ url: imageUrl }];
      }
      const { error: commentErr } = await sb.from('ticket_comentarios').insert(commentPayload);
      if (!commentErr) {
        if (imageUrl) {
          await sb.from('ticket_fotos').insert({ ticket_id: ticketId, url: imageUrl });
        }
        await sb.from('tickets').update({ actualizado_en: now }).eq('id', ticketId);
        // Refrescar para sincronizar nombres/roles reales desde la BD
        await refreshData();
      } else {
        console.error('addMessage error:', commentErr);
      }
    }
  }, [currentUser, refreshData]);

  const getTicketById = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);

  // ── departments ─────────────────────────────────────────────────────────
  const addDepartment = useCallback(async (dept: Omit<Department, 'id' | 'createdAt'>) => {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabase().from('departamentos').insert({
        nombre: dept.name,
        descripcion: dept.description,
        color: dept.color,
        jefe: dept.jefe || null,
      }).select().single();
      if (data) {
        setDepartments(prev => [...prev, rowToDept(data as Record<string, unknown>)]);
        return;
      }
    }
    const d: Department = { ...dept, id: `dept-${Date.now()}`, createdAt: new Date().toISOString() };
    setDepartments(prev => [...prev, d]);
  }, []);

  const updateDepartment = useCallback(async (id: string, dept: Partial<Department>) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...dept } : d));
    if (isSupabaseConfigured()) {
      await getSupabase().from('departamentos').update({
        nombre: dept.name,
        descripcion: dept.description,
        color: dept.color,
        jefe: dept.jefe || null,
      }).eq('id', id);
    }
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    if (isSupabaseConfigured()) {
      await getSupabase().from('departamentos').delete().eq('id', id);
    }
  }, []);

  const createUser = useCallback(async (userData: { name: string; email: string; role: User['role']; departmentId?: string }) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };
    const sb = getSupabase();
    const roleMap: Record<string, string> = { 'Admin': 'Admin', 'Agente': 'Agente', 'Cliente': 'Cliente' };
    const resolvedRole = roleMap[userData.role] || 'Cliente';

    // NOTA: Crear usuarios en Supabase Auth requiere la service_role key (solo servidor/Edge Function).
    // Desde el cliente anon, usamos auth.signUp() con una contraseña temporal.
    // Si falla la autenticación, insertamos solo el perfil con un UUID temporal.
    let userId: string | null = null;
    
    try {
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: userData.email,
        password: 'Tzomp2024!',
        options: { data: { full_name: userData.name, role: resolvedRole } }
      });
      
      if (!authError && authData.user) {
        userId = authData.user.id;
      } else {
        console.warn('Auth signup failed (normal si email ya existe o Supabase lo bloquea):', authError?.message);
      }
    } catch (e) {
      console.warn('auth.signUp threw:', e);
    }

    // Si no se pudo crear en Auth, generamos un ID temporal para el perfil
    if (!userId) {
      userId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const insertProfile = {
      id: userId,
      email: userData.email,
      activo: true,
      nombre: userData.name,
      rol: resolvedRole,
      departamento_id: userData.departmentId || null
    };

    const { error: profileError } = await sb.from('perfiles').upsert(insertProfile);

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return { success: false, error: `Error al guardar perfil: ${profileError.message}` };
    }
    
    await refreshData();
    return { success: true };
  }, [refreshData]);

  const deleteUser = useCallback(async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    if (isSupabaseConfigured()) {
      await getSupabase().from('perfiles').delete().eq('id', id);
    }
  }, []);

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
      page,
      setPage,
      selectedTicketId,
      setSelectedTicketId,
      supabaseReady,
      sbStatus,
      lastPing,
      loginWithSupabase,
      logout,
      createUser,
      deleteUser,
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
